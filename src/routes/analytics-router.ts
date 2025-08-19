import { t } from "../controllers/trpc";
import { z } from "zod";
import { prisma } from "../controllers/prisma";
import { TicketState } from "../../generated/prisma";
import { SeatingPlan } from "../types";
import { logger } from "../utils/logger";
import { devProcedure } from "../middleware/dev-procedure";

export const analyticsRouter = t.router({
	// Get Event Revenue
	getEventRevenue: devProcedure
		.input(
			z.object({
				eventId: z.string(),
			}),
		)
		.query(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					// Single query to get both tickets and event seating plan
					const event = await tx.event.findUnique({
						where: {
							id: input.eventId,
						},
						select: {
							seatingPlan: true,
							tickets: {
								where: {
									state: {
										in: [TicketState.PAID, TicketState.USED],
									},
								},
								select: {
									seatId: true,
									state: true,
								},
							},
						},
					});

					if (!event) {
						return {
							success: false,
							message: "Event not found",
							revenue: 0,
						};
					}

					const seatingPlan = event.seatingPlan as unknown as Record<
						string,
						SeatingPlan
					>;

					// Calculate revenue in a single pass
					const revenue = event.tickets.reduce((sum, ticket) => {
						const seat = seatingPlan[ticket.seatId];
						return sum + (seat?.price || 0);
					}, 0);

					return {
						success: true,
						message: "Event revenue retrieved successfully",
						revenue,
						ticketCount: event.tickets.length,
					};
				});
			} catch (error) {
				logger.error("Failed to retrieve event revenue", error, {
					operation: "getEventRevenue",
					eventId: input.eventId,
				});
				return {
					success: false,
					message: "Failed to retrieve event revenue",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),
});
