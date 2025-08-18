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

const appRouter = t.router({
	event: eventRouter,
	ticket: ticketRouter,
	team: teamRouter,
	analytics: analyticsRouter,
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

app.listen(3000, () => {
	console.log("Server running on http://localhost:3000");
});

cron.schedule("* * * * *", async () => {
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
				logger.info(`Deactivated ${result.count} events that have started`, {
					operation: "cronEventDeactivation",
					eventsDeactivated: result.count,
				});
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
				const eventUpdates = new Map<string, {
					seatingPlan: Record<string, { label: string; price: number; isAvailable: boolean }>;
					seatIds: string[];
				}>();

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

						return tx.event.update({
							where: { id: eventId },
							data: { seatingPlan },
						});
					}
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
		logger.error("Failed to run cron job for event and ticket cleanup", error, {
			operation: "cronJobError",
		});
	}
});
