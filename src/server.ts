import express from "express";
import { createContext, t } from "./controllers/trpc";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { testRouter } from "./routes/test-router";
import { eventRouter } from "./routes/event-router";
import { prisma } from "./controllers/prisma";
import cron from "node-cron";
import { TicketState } from "../generated/prisma";

const appRouter = t.router({
	test: testRouter,
	event: eventRouter,
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
				console.log(`Updated ${result.count} events`);
			}
		});

        // Update tickets that have expired to cancelled and release seats
		await prisma.$transaction(async (tx) => {
			// Get expired tickets before updating them
			const ets = await tx.ticket.findMany({
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

			if (ets.length > 0) {
				// Cancel expired tickets
				await tx.ticket.updateMany({
					where: {
						id: { in: ets.map(t => t.id) },
					},
					data: {
						state: TicketState.CANCELLED,
					},
				});

				// Release seats back to available
				for (const ticket of ets) {
					const event = await tx.event.findUnique({
						where: { id: ticket.eventId },
						select: { seatingPlan: true },
					});

					if (event?.seatingPlan) {
						const seatingPlan = event.seatingPlan as Record<string, { label: string; price: number; isAvailable: boolean }>;
						
						if (seatingPlan[ticket.seatId]) {
							seatingPlan[ticket.seatId].isAvailable = true;
							
							await tx.event.update({
								where: { id: ticket.eventId },
								data: { seatingPlan },
							});
						}
					}
				}

				console.log(`Cancelled ${ets.length} expired tickets and released seats`);
			}
		});

	} catch (error) {
		console.error("Failed to update events:", error);
	}
});
