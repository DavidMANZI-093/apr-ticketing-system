import { t } from "../controllers/trpc";
import { z } from "zod";
import { prisma } from "../controllers/prisma";
import parsePhoneNumber from "libphonenumber-js";
import { TicketState } from "../../generated/prisma";

export const ticketRouter = t.router({
    // Create Ticket
    createTicket: t.procedure
        .input(
            z.object({
                eventId: z.string(),
                teamId: z.string(),
                client: z.object({
                    name: z.string(),
                    email: z.email(),
                    phone: z.string().refine((val) => {
                        try {
                            return parsePhoneNumber(val, "RW")?.isValid() ?? false;
                        } catch (error) {
                            return false;
                        }
                    }, 'Invalid phone number format (e.g. +250 788 888 888)'),
                }),
                seatId: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const et = await tx.ticket.findUnique({
                        where: {
                            seatId_eventId: {
                                seatId: input.seatId,
                                eventId: input.eventId,
                            },
                        },
                    })

                    if (et && et.state !== TicketState.CANCELLED) { // exists and not cancelled - throw error
                        throw new Error("Seat is already booked");
                    }

                    if (et?.state === TicketState.CANCELLED) { // exists and cancelled - delete and continue
                        await tx.ticket.delete({ where: { id: et.id } })
                    }

                    const ticket = await tx.ticket.create({
                        data: {
                            eventId: input.eventId,
                            teamId: input.teamId,
                            client: input.client,
                            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
                            state: TicketState.PENDING,
                            seatId: input.seatId,
                        }
                    })

                    

                    if (ticket) {
                        // Update event seatingPlan to mark seat as unavailable
                        const event = await tx.event.findUnique({
                            where: { id: input.eventId },
                            select: { seatingPlan: true }
                        });

                        if (event?.seatingPlan) {
                            const seatingPlan = event.seatingPlan as Record<string, { label: string; price: number; isAvailable: boolean }>;
                            
                            if (seatingPlan[input.seatId]) {
                                seatingPlan[input.seatId].isAvailable = false;
                                
                                await tx.event.update({
                                    where: { id: input.eventId },
                                    data: { seatingPlan }
                                });
                            }
                        }

                        return {
                            success: true,
                            message: "Ticket created successfully",
                            ticket,
                        }
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to create ticket",
                    error: error as string,
                }
            }
        }),

    // Get Tickets By Event
    getTickets: t.procedure
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
                        },
                    });
                    if (tickets) {
                        return {
                            success: true,
                            message: "Tickets retrieved successfully",
                            tickets,
                        };
                    } else {
                        return {
                            success: true,
                            message: "No tickets found",
                            tickets: [],
                        };
                    }
                });
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to retrieve tickets",
                    error: error as string,
                };
            }
        }),

    // Get Ticket
    getTicket: t.procedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .query(async ({ input }) => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const ticket = await tx.ticket.findUnique({
                        where: {
                            id: input.id,
                        },
                    });
                    if (ticket) {
                        return {
                            success: true,
                            message: "Ticket retrieved successfully",
                            ticket,
                        };
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to retrieve ticket",
                    error: error as string,
                };
            }
        }),

    // Get Tickets By Event
    getTicketsByEvent: t.procedure
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
                        },
                    });
                    if (tickets) {
                        return {
                            success: true,
                            message: "Tickets retrieved successfully",
                            tickets,
                        };
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to retrieve tickets",
                    error: error as string,
                };
            }
        }),

    // Get Tickets By Team
    getTicketsByTeam: t.procedure
        .input(
            z.object({
                teamId: z.string(),
            })
        )
        .query(async ({ input }) => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const tickets = await tx.ticket.findMany({
                        where: {
                            teamId: input.teamId,
                        },
                    });
                    if (tickets) {
                        return {
                            success: true,
                            message: "Tickets retrieved successfully",
                            tickets,
                        };
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to retrieve tickets",
                    error: error as string,
                };
            }
        }),

    // Get Tickets By State
    getTicketByState: t.procedure
        .input(
            z.object({
                state: z.enum(["PENDING", "PAID", "CANCELLED", "USED"]),
            })
        )
        .query(async ({ input }) => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const tickets = await tx.ticket.findMany({
                        where: {
                            state: input.state,
                        },
                    });
                    if (tickets) {
                        return {
                            success: true,
                            message: "Tickets retrieved successfully",
                            tickets,
                        };
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to retrieve tickets",
                    error: error as string,
                };
            }
        }),

    // Cancel Ticket
    cancelTicket: t.procedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const ticket = await tx.ticket.update({
                        where: {
                            id: input.id,
                        },
                        data: {
                            state: TicketState.CANCELLED,
                        },
                    });
                    if (ticket) {
                        return {
                            success: true,
                            message: "Ticket cancelled successfully",
                            ticket,
                        };
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to cancel ticket",
                    error: error as string,
                };
            }
        }),

    // Update Ticket State (PENDING -> PAID)
    updateTicketStatePaid: t.procedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const ticket = await tx.ticket.update({
                        where: {
                            id: input.id,
                        },
                        data: {
                            state: TicketState.PAID,
                        },
                    });
                    if (ticket) {
                        return {
                            success: true,
                            message: "Ticket state updated successfully",
                            ticket,
                        };
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to update ticket state",
                    error: error as string,
                };
            }
        }),
})