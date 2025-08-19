import express from "express";
import { createContext, t } from "./controllers/trpc";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { eventRouter } from "./routes/event-router";
import { prisma } from "./controllers/prisma";
import cron from "node-cron";
import { TicketState } from "../generated/prisma";
import { ticketRouter } from "./routes/ticket-router";
import { teamRouter } from "./routes/team-router";
import { analyticsRouter } from "./routes/analytics-router";
import { logger } from "./utils/logger";
import { adminRouter } from "./routes/admin-router";
import { sseManager } from "./utils/sse-manager";
import { authenticateSSE, AuthenticatedSSERequest } from "./middleware/sse-auth";

const appRouter = t.router({
	event: eventRouter,
	ticket: ticketRouter,
	team: teamRouter,
	analytics: analyticsRouter,
	admin: adminRouter,
});

export type AppRouter = typeof appRouter;

const app = express();

app.use(
	"/trpc",
	createExpressMiddleware({
		router: appRouter,
		createContext,
	}),
);

// SSE endpoint for live seat updates
app.get("/events/:eventId/seats/stream", authenticateSSE, async (req: AuthenticatedSSERequest, res) => {
	const { eventId } = req.params;

	// Validate event exists and is active
	try {
		const event = await prisma.event.findUnique({
			where: { id: eventId, active: true },
			select: { id: true, seatingPlan: true, name: true }
		});

		if (!event) {
			return res.status(404).json({
				success: false,
				message: "Event not found or inactive"
			});
		}

		// Set SSE headers
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Cache-Control, Authorization",
		});

		// Send initial seating plan
		const initialMessage = JSON.stringify({
			type: "seatingPlan",
			eventId,
			data: event.seatingPlan,
			timestamp: Date.now(),
		});

		res.write(`data: ${initialMessage}\n\n`);

		// Add connection to manager
		sseManager.addConnection(eventId, res, req.user?.keyId);

		// Send keepalive every 30 seconds
		const keepAlive = setInterval(() => {
			try {
				res.write(`: keepalive ${Date.now()}\n\n`);
			} catch (error) {
				clearInterval(keepAlive);
			}
		}, 30000);

		// Cleanup on connection close
		res.on("close", () => {
			clearInterval(keepAlive);
		});

		logger.info("SSE stream established", {
			operation: "sseStreamStart",
			eventId,
			eventName: event.name,
			userId: req.user?.keyId,
		});

	} catch (error) {
		logger.error("Failed to establish SSE stream", error, {
			operation: "sseStreamError",
			eventId,
			userId: req.user?.keyId,
		});

		return res.status(500).json({
			success: false,
			message: "Failed to establish stream",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// SSE stats endpoint for monitoring
app.get("/sse/stats", authenticateSSE, (req: AuthenticatedSSERequest, res) => {
	const stats = sseManager.getStats();
	res.json({
		success: true,
		message: "SSE statistics retrieved",
		stats,
	});
});

app.listen(3000, () => {
	console.log("Server running on http://localhost:3000");
});

let cronJob: any = null;

const scheduleNextCronJob = async () => {
	if (cronJob) cronJob.destroy();

	const interval = await getOptimalInterval();

	cronJob = cron.schedule(
		`*/${Math.ceil(interval / 60000)} * * * *`,
		async () => {
			try {
				// Update events that have started to inactive
				await prisma.$transaction(async (tx) => {
					const result = await tx.event.updateMany({
						where: {
							active: true,
							startsAt: {
								lte: new Date(Date.now() - 5 * 60 * 1000), // lte: less than 5 minutes before current date
							},
						},
						data: {
							active: false,
						},
					});

					if (result.count > 0) {
						logger.info(
							`Deactivated ${result.count} events that have started`,
							{
								operation: "cronEventDeactivation",
								eventsDeactivated: result.count,
							},
						);
					}
				});

				// Update tickets that have expired to cancelled and release seats
				await prisma.$transaction(async (tx) => {
					// Get expired tickets with event data in single query
					const expiredTickets = await tx.ticket.findMany({
						where: {
							state: TicketState.PENDING,
							expiresAt: {
								lte: new Date(Date.now()),
							},
						},
						select: {
							id: true,
							seatId: true,
							eventId: true,
							event: {
								select: {
									id: true,
									seatingPlan: true,
								},
							},
						},
					});

					if (expiredTickets.length > 0) {
						// Cancel expired tickets in batch
						await tx.ticket.updateMany({
							where: {
								id: { in: expiredTickets.map((t) => t.id) },
							},
							data: {
								state: TicketState.CANCELLED,
							},
						});

						// Group tickets by event for batch seating plan updates
						const eventUpdates = new Map<
							string,
							{
								seatingPlan: Record<
									string,
									{ label: string; price: number; isAvailable: boolean }
								>;
								seatIds: string[];
							}
						>();

						for (const ticket of expiredTickets) {
							if (ticket.event?.seatingPlan) {
								const eventId = ticket.eventId;

								if (!eventUpdates.has(eventId)) {
									eventUpdates.set(eventId, {
										seatingPlan: ticket.event.seatingPlan as Record<
											string,
											{ label: string; price: number; isAvailable: boolean }
										>,
										seatIds: [],
									});
								}

								eventUpdates.get(eventId)!.seatIds.push(ticket.seatId);
							}
						}

						// Batch update seating plans per event
						const updatePromises = Array.from(eventUpdates.entries()).map(
							async ([eventId, { seatingPlan, seatIds }]) => {
								// Mark all seats as available in one operation
								for (const seatId of seatIds) {
									if (seatingPlan[seatId]) {
										seatingPlan[seatId].isAvailable = true;
									}
								}

								const result = await tx.event.update({
									where: { id: eventId },
									data: { seatingPlan },
								});

								// Broadcast seating plan update via SSE
								sseManager.broadcastSeatingUpdate(eventId, seatingPlan);

								return result;
							},
						);

						await Promise.all(updatePromises);

						logger.info(
							`Cancelled ${expiredTickets.length} expired tickets and released seats across ${eventUpdates.size} events`,
							{
								operation: "cronTicketCleanup",
								expiredTickets: expiredTickets.length,
								eventsAffected: eventUpdates.size,
							},
						);
					}
				});
			} catch (error) {
				logger.error(
					"Failed to run cron job for event and ticket cleanup",
					error,
					{
						operation: "cronJobError",
					},
				);
			}

			await scheduleNextCronJob();
		},
	);
};

const getOptimalInterval = async () => {
	const nextEvent = await prisma.event.findFirst({
		where: {
			active: true,
			startsAt: {
				gt: new Date(), // greater than current date
			},
		},
		orderBy: {
			startsAt: "asc",
		},
	});

	if (!nextEvent) {
		return 300000; // 5 minutes if no events
	}

	const timeUntilEvent = nextEvent.startsAt.getTime() - Date.now();
	const timeUntilDeactivation = timeUntilEvent - 5 * 60 * 1000;

	// Return the optimal interval (1-5 minutes based on proximity to next event)
	return Math.max(60000, Math.min(timeUntilDeactivation / 2, 300000));
};

scheduleNextCronJob();
