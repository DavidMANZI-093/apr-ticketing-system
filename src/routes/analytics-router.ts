import { t } from "../controllers/trpc";
import { z } from "zod";
import { prisma } from "../controllers/prisma";
import { TicketState } from "../../generated/prisma";
import { SeatingPlan } from "../types";

export const analyticsRouter = t.router({
    // Get Event Revenue
    getEventRevenue: t.procedure
        .input(
            z.object({
                eventId: z.string(),
            })
        )
        .query(async ({ input }) => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const tickets = await tx.ticket.findMany({
                        where: {
                            eventId: input.eventId,
                            state: TicketState.PAID,
                        },
                    });

                    const pricePromises = tickets.map(async (ticket) => {
                        const event = await tx.event.findUnique({
                            where: {
                                id: ticket.eventId,
                            },
                            select: {
                                seatingPlan: true,
                            },
                        });
                        const seatingPlan = event?.seatingPlan as unknown as Record<string, SeatingPlan>;
                        const seat = seatingPlan[ticket.seatId];
                        return seat?.price || 0;
                    });
                    
                    const prices = await Promise.all(pricePromises);
                    const revenue = prices.reduce((sum, price) => sum + price, 0);
                    
                    if (revenue) {
                        return {
                            success: true,
                            message: "Event revenue retrieved successfully",
                            revenue,
                        }
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to retrieve event revenue",
                    error: error as string,
                }
            }
        }),
});
