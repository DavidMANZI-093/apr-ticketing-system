import { z } from "zod";
import { t } from "../controllers/trpc";
import { prisma } from "../controllers/prisma";
import { TicketState } from "../../generated/prisma";
import { v5 as uuidv5 } from "uuid";
import dotenv from "dotenv";
import { SeatingPlan } from "../types";
import { id } from "zod/v4/locales/index.cjs";
dotenv.config();

export const eventRouter = t.router({
	// Create Event
	createEvent: t.procedure
		.input(
			z.object({
				name: z.string(),
				description: z.string(),
				location: z.string(),
				startsAt: z.string().transform((val) => {
					const date = new Date(val);
					if (date <= new Date()) {
						throw new Error("Event start time must be in the future");
					}
					return date;
				}),
				seatingPlan: z.object({
					sections: z.array(
						z.object({
							name: z.string().regex(/^[A-Z]$/), // Section name must be a single uppercase letter
							rows: z.array(
								z.object({
									number: z.number().min(1), // Row number must be at least 1
									seats: z.array(
										z.object({
											number: z.number().min(1), // Seat number must be at least 1
											price: z.number().min(0),
											isAvailable: z.boolean().default(true),
										}),
									),
								}),
							),
						}),
					),
				}),
				teams: z
					.array(
						z.object({
							name: z.string(),
							description: z.string(),
							logoUrl: z.string(),
						}),
					)
					.length(2),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const event = await tx.event.create({
						data: {
							name: input.name,
							description: input.description,
							location: input.location,
							seatingPlan: input.seatingPlan.sections.reduce((seatMap, section) => {
								section.rows.forEach((row) => {
									row.seats.forEach((seat) => {
										if (!process.env.SEAT_NAMESPACE) { // Namespace UUID for seat ID generation
											throw new Error("SEAT_NAMESPACE is not defined");
										}
										const seatId = uuidv5(`${section.name}${row.number}-${seat.number}`, process.env.SEAT_NAMESPACE as string);
										seatMap[seatId] = {
											label: `${section.name}${row.number}-${seat.number}`,
											price: seat.price,
											isAvailable: seat.isAvailable
										};
									});
								});
								return seatMap;
							}, {} as Record<string, SeatingPlan>) as any,
							startsAt: input.startsAt,
							active: true,
							teams: {
								connectOrCreate: input.teams.map((team) => ({
									where: { name: team.name },
									create: team,
								})),
							},
						},
					});
					if (event) {
						return {
							success: true,
							message: "Event created successfully",
							event,
						};
					}
				});
			} catch (error) {
				return {
					success: false,
					message: "Failed to create event",
					error: error as string,
				};
			}
		}),

	// Get All Events
	getAllEvents: t.procedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				const events = await tx.event.findMany();
				if (events) {
					return {
						success: true,
						message: "Events retrieved successfully",
						events,
					}
				} else {
					return {
						success: true,
						message: "No events found",
						events: [],
					}
				}
			})
		} catch (error) {
			return {
				success: false,
				message: "Failed to retrieve events",
				error: error as string,
			};
		}
	}),

	// Get Events - Active only
	getEvents: t.procedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				const events = await tx.event.findMany({
					where: {
						active: true,
					},
				});
				if (events) {
					return {
						success: true,
						message: "Events retrieved successfully (active only)",
						events,
					};
				} else {
					return {
						success: true,
						message: "No events found",
						events: [],
					};
				}
			});
		} catch (error) {
			return {
				success: false,
				message: "Failed to retrieve events",
				error: error as string,
			};
		}
	}),

	// Get Event
	getEvent: t.procedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.query(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const event = await tx.event.findUnique({
						where: {
							id: input.id,
							active: true,
						},
					});
					if (event) {
						return {
							success: true,
							message: "Event retrieved successfully",
							event,
						};
					} else {
						return {
							success: true,
							message: "No event found",
							event: null,
						};
					}
				});
			} catch (error) {
				return {
					success: false,
					message: "Failed to retrieve event",
					error: error as string,
				};
			}
		}),

	// Update Event
	updateEvent: t.procedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				description: z.string().optional(),
				startsAt: z
					.string()
					.optional()
					.transform((val) => {
						if (!val) return undefined;
						const date = new Date(val);
						if (date <= new Date()) {
							throw new Error("Event start time must be in the future");
						}
						return date;
					}),
				teams: z.array(
					z.object({
						id: z.string(),
						name: z.string().optional(),
						description: z.string().optional(),
						logoUrl: z.string().optional(),
					}),
				),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const event = await tx.event.update({
						where: {
							id: input.id,
							active: true,
						},
						data: {
							...(input.name !== undefined && { name: input.name }),
							...(input.description !== undefined && {
								description: input.description,
							}),
							...(input.startsAt !== undefined && { startsAt: input.startsAt }),
							teams: {
								upsert: input.teams.map((team) => {
									const createData: any = { id: team.id };
									const updateData: any = {};

									if (team.name !== undefined) {
										createData.name = team.name;
										updateData.name = team.name;
									}
									if (team.description !== undefined) {
										createData.description = team.description;
										updateData.description = team.description;
									}
									if (team.logoUrl !== undefined) {
										createData.logoUrl = team.logoUrl;
										updateData.logoUrl = team.logoUrl;
									}

									return {
										where: { id: team.id },
										create: createData,
										update: updateData,
									};
								}),
							},
						},
					});

					if (event) {
						return {
							success: true,
							message: "Event updated successfully",
							event,
						};
					} else {
						return {
							success: false,
							message: "Event not found",
							event: null,
						};
					}
				});
			} catch (error) {
				return {
					success: false,
					message: "Failed to update event",
					error: error as string,
				};
			}
		}),

	// Get Event Status
	getEventStatus: t.procedure
		.input(
			z.object({
				id: z.string(),
			})
		)
		.query(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const event = await tx.event.findUnique({
						where: {
							id: input.id,
							active: true,
						},
					});

					if (!event) {
						return {
							success: false,
							message: "Event not found or inactive",
							event: null,
						};
					}

					const tickets = await tx.ticket.findMany({
						where: {
							eventId: input.id,
						},
					});

					const seatingPlan = event.seatingPlan as unknown as Record<string, SeatingPlan>;
					const totalSeats = Object.keys(seatingPlan).length;
					
					const ticketsByState = {
						pending: tickets.filter(t => t.state === TicketState.PENDING).length,
						paid: tickets.filter(t => t.state === TicketState.PAID).length,
						used: tickets.filter(t => t.state === TicketState.USED).length,
						cancelled: tickets.filter(t => t.state === TicketState.CANCELLED).length,
					};

					const activeTickets = ticketsByState.pending + ticketsByState.paid + ticketsByState.used;
					const revenue = tickets
						.filter(t => t.state === TicketState.PAID || t.state === TicketState.USED)
						.reduce((sum, ticket) => {
							const seat = seatingPlan[ticket.seatId];
							return sum + (seat?.price || 0);
						}, 0);

					return {
						success: true,
						message: "Event status retrieved successfully",
						event: {
							...event,
							stats: {
								seats: {
									total: totalSeats,
									available: totalSeats - activeTickets,
									reserved: activeTickets,
								},
								tickets: ticketsByState,
								revenue: revenue,
							}
						}
					};
				});
			} catch (error) {
				return {
					success: false,
					message: "Failed to retrieve event status",
					error: error as string,
				};
			}
		}),

	// Cancel Event
	cancelEvent: t.procedure
		.input(
			z.object({
				id: z.string(),
			})
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const event = await tx.event.update({
						where: {
							id: input.id,
						},
						data: {
							active: false,
						}
					})

					if (event) {
						return {
							success: true,
							message: "Event cancelled successfully",
							event,
						}
					}
				})
			} catch (error) {
				return {
					success: false,
					message: "Failed to cancel event",
					error: error as string,
				}
			}
		}),
});
