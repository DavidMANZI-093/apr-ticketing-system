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
import { alphaRouter } from "./routes/alpha-router";
import { adminRouter } from "./routes/admin-router";
import { venueRouter } from "./routes/venue-router";
import { seatRouter } from "./routes/seat-router";
import { userRouter } from "./routes/user-router";
import { sseManager } from "./utils/sse-manager";
import {
	authenticateSSE,
	AuthenticatedSSERequest,
} from "./middleware/sse-auth";
import { Seat } from "./types";
import cors from "cors";
import {
	register,
	sseActiveConnections,
	cronJobExecutions,
	cronJobDuration,
	expiredTicketsCleaned,
	eventsDeactivated,
} from "./utils/metrics";

const appRouter = t.router({
	event: eventRouter,
	ticket: ticketRouter,
	team: teamRouter,
	analytics: analyticsRouter,
	venue: venueRouter,
	seat: seatRouter,
	user: userRouter,
	alpha: alphaRouter,
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

app.use(
	cors({
		origin: "*", // Allow all origins,
		methods: ["GET", "POST", "OPTIONS"], // Explicitly allow methods used by tRPC
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

// Metrics endpoint moved to alpha router for authentication

// SSE endpoint for live seat updates
app.get(
	"/events/:eventId/seats/stream",
	authenticateSSE,
	async (req: AuthenticatedSSERequest, res) => {
		const { eventId } = req.params;

		// Validate event exists and is active
		try {
			const event = await prisma.events.findUnique({
				where: { id: eventId, active: true },
				select: {
					id: true,
					eventSeats: {
						select: {
							seatId: true,
							isAvailable: true,
							price: true,
							category: true,
							seat: {
								select: {
									label: true,
									section: {
										select: {
											id: true,
											name: true,
											svgPathData: true,
										},
									},
								},
							},
						},
					},
					name: true,
				},
			});

			if (!event) {
				return res.status(404).json({
					success: false,
					message: "Event not found or inactive",
				});
			}

			// Set SSE headers
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "Cache-Control, Authorization",
			});

			const seatingPlan = event.eventSeats.reduce(
				(acc, seat) => {
					acc[seat.seatId] = {
						isAvailable: seat.isAvailable,
						price: seat.price,
						label: seat.seat.label,
						category: seat.category,
						section: seat.seat.section,
					};
					return acc;
				},
				{} as Record<string, Seat>,
			);

			// Send initial seating plan
			const initialMessage = JSON.stringify({
				type: "seatingPlan",
				eventId,
				data: seatingPlan,
				timestamp: Date.now(),
			});

			res.write(`data: ${initialMessage}\n\n`);

			// Add connection to manager
			sseManager.addConnection(eventId, res, req.user?.keyId);

			// Track SSE connection in metrics
			sseActiveConnections.inc({ event_id: eventId });

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
				// Decrement SSE connection metric
				sseActiveConnections.dec({ event_id: eventId });
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
	},
);

// SSE stats endpoint for monitoring
app.get("/sse/stats", authenticateSSE, (req: AuthenticatedSSERequest, res) => {
	const stats = sseManager.getStats();
	res.json({
		success: true,
		message: "SSE statistics retrieved",
		stats,
	});
});

app.get("/health", async (req, res) => {
	try {
		// Quick database ping
		await prisma.$queryRaw`SELECT 1`;

		res.status(200).json({
			status: "healthy",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			memory: {
				used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
				total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
			},
			database: "connected",
			version: process.env.npm_package_version || "unknown",
		});

		logger.info("Health check successful", {
			operation: "healthCheck",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			memory: {
				used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
				total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
			},
			version: process.env.npm_package_version || "unknown",
		});
	} catch (error) {
		res.status(503).json({
			status: "unhealthy",
			timestamp: new Date().toISOString(),
			error: "Database connection failed",
		});

		logger.error("Health check failed", {
			operation: "healthCheck",
			timestamp: new Date().toISOString(),
			error: "Database connection failed",
		});
	}
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
			const cronStartTime = Date.now();
			try {
				// Update events that have started to inactive
				await prisma.$transaction(async (tx) => {
					const result = await tx.events.updateMany({
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
						eventsDeactivated.inc(result.count);
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
					const expiredTickets = await tx.tickets.findMany({
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
						},
					});

					if (expiredTickets.length > 0) {
						// Group tickets by event for efficient processing
						const ticketsByEvent = expiredTickets.reduce(
							(acc, ticket) => {
								if (!acc[ticket.eventId]) {
									acc[ticket.eventId] = [];
								}
								acc[ticket.eventId].push(ticket);
								return acc;
							},
							{} as Record<string, typeof expiredTickets>,
						);

						const delay = (ms: number) =>
							new Promise((resolve) => setTimeout(resolve, ms));

						// Cancel expired tickets in batch
						await tx.tickets.updateMany({
							where: {
								id: { in: expiredTickets.map((t) => t.id) },
							},
							data: {
								state: TicketState.CANCELLED,
								orderId: null,
							},
						});

						const eventSeats = await tx.eventSeats.updateMany({
							where: {
								id: {
									in: expiredTickets.map((t) => t.seatId),
								},
								eventId: {
									in: expiredTickets.map((t) => t.eventId),
								},
							},
							data: {
								isAvailable: true,
							},
						});

						// Process each event's tickets
						for (const [eventId, eventTickets] of Object.entries(
							ticketsByEvent,
						)) {
							const updatedSeats = await tx.eventSeats.findMany({
								where: {
									eventId,
									seatId: { in: eventTickets.map((t) => t.seatId) },
								},
								select: {
									price: true,
									category: true,
									seatId: true,
									seat: {
										select: {
											label: true,
											section: {
												select: {
													id: true,
													name: true,
													svgPathData: true,
												},
											},
										},
									},
								},
							});

							const seatUpdates: Record<string, Seat> = updatedSeats.reduce(
								(acc, seat) => {
									acc[seat.seatId] = {
										isAvailable: true,
										price: seat.price,
										label: seat.seat.label,
										category: seat.category,
										section: seat.seat.section,
									};
									return acc;
								},
								{} as Record<string, Seat>,
							);

							if (updatedSeats.length > 0) {
								sseManager.broadcastSeatingUpdate(eventId, seatUpdates);
							}
							await delay(50);
						}

						expiredTicketsCleaned.inc(expiredTickets.length);
						logger.info(
							`Cancelled ${expiredTickets.length} expired tickets and released seats across ${eventSeats.count} events`,
							{
								operation: "cronTicketCleanup",
								expiredTickets: expiredTickets.length,
								eventsAffected: Object.keys(ticketsByEvent).length,
							},
						);
					}
				});

				// Record successful cron execution
				const cronDuration = (Date.now() - cronStartTime) / 1000;
				cronJobDuration.observe({ job_name: "ticket_cleanup" }, cronDuration);
				cronJobExecutions.inc({
					job_name: "ticket_cleanup",
					status: "success",
				});
			} catch (error) {
				// Record failed cron execution
				const cronDuration = (Date.now() - cronStartTime) / 1000;
				cronJobDuration.observe({ job_name: "ticket_cleanup" }, cronDuration);
				cronJobExecutions.inc({ job_name: "ticket_cleanup", status: "error" });

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
	const nextEvent = await prisma.events.findFirst({
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
