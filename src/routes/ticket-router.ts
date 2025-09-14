import { t } from "../controllers/trpc";
import { z } from "zod";
import { prisma } from "../controllers/prisma";
import { TicketState, TicketType, Tickets } from "../../generated/prisma";
import { logger } from "../utils/logger";
import { devProcedure } from "../middleware/dev-procedure";
import { generateSecureQRData } from "../utils/qr-code";
import QRCode from "qrcode";
import crypto from "crypto";
import { Seat } from "../types";
import { sseManager } from "../utils/sse-manager";
import { adminProcedure } from "../middleware/admin-procedure";

export const ticketRouter = t.router({
	// Create Ticket (Single)
	createTicket: devProcedure
		.input(
			z.object({
				eventId: z.string(),
				teamId: z.string(),
				userId: z.string(),
				seatId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const et = await tx.tickets.findUnique({
						where: {
							seatId_eventId: {
								seatId: input.seatId,
								eventId: input.eventId,
							},
						},
					});

					const team = await tx.teams.findUnique({
						where: {
							id: input.teamId,
						},
					});

					if (!team) {
						// team not found - throw error
						throw new Error("Team not found");
					}

					const uts = await tx.tickets.findMany({
						where: {
							userId: input.userId,
						},
					});

					if (uts.length >= 14) {
						// user has reached the limit of 14 tickets - throw error
						throw new Error("User has reached the limit of 14 tickets");
					}

					const user = await tx.users.findUnique({
						where: {
							id: input.userId,
						},
					});

					if (!user) {
						// user not found - throw error
						throw new Error("User not found");
					}

					if (et && et.state !== TicketState.CANCELLED) {
						// exists and not cancelled - throw error
						throw new Error("Seat is already booked");
					}

					if (et && et.state === TicketState.CANCELLED) {
						// exists and cancelled - delete and continue
						await tx.tickets.delete({ where: { id: et.id } });
					}

					const ticket = await tx.tickets.create({
						data: {
							eventId: input.eventId,
							teamId: input.teamId,
							userId: input.userId,
							expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
							state: TicketState.PENDING,
							seatId: input.seatId,
							type: TicketType.SINGLE,
							bearer: {
								name: user.name,
								email: user.email,
								phone: user.phone,
							},
						},
					});

					if (ticket) {
						// Update event seat to mark seat as unavailable
						const eventSeat = await tx.eventSeats.update({
							where: {
								eventId_seatId: {
									eventId: input.eventId,
									seatId: input.seatId,
								},
							},
							data: {
								isAvailable: false,
							},
						});

						const eventSeats = await tx.eventSeats.findMany({
							where: {
								eventId: input.eventId,
							},
							include: {
								seat: {
									select: {
										label: true,
									},
									include: {
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

						if (eventSeat && eventSeats) {
							const seatingPlan: Record<string, Seat> = eventSeats.reduce(
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

							sseManager.broadcastSeatingUpdate(input.eventId, seatingPlan);
						}

						return {
							success: true,
							message: "Ticket created successfully",
							ticket,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to create ticket", error, {
					operation: "createTicket",
					eventId: input.eventId,
					teamId: input.teamId,
					seatId: input.seatId,
					userId: input.userId,
				});
				return {
					success: false,
					message: "Failed to create ticket",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Create Ticket (Gift)
	createGiftTicket: devProcedure
		.input(
			z.object({
				eventId: z.string(),
				teamId: z.string(),
				userId: z.string(),
				seatId: z.string(),
				bearer: z.email(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const user = await tx.users.findUnique({
						where: {
							email: input.bearer,
						},
					});

					const uts = await tx.tickets.findMany({
						where: {
							userId: input.userId,
							state: {
								in: [TicketState.PENDING, TicketState.PAID],
							},
							event: {
								active: true,
							},
						},
					});

					if (uts.length >= 14) {
						// user has reached the limit of 14 tickets - throw error
						throw new Error("User has reached the limit of 14 tickets");
					}

					const et = await tx.tickets.findUnique({
						where: {
							seatId_eventId: {
								seatId: input.seatId,
								eventId: input.eventId,
							},
						},
					});

					if (et && et.state !== TicketState.CANCELLED) {
						// exists and not cancelled - throw error
						throw new Error("Seat is already booked");
					}

					if (et && et.state === TicketState.CANCELLED) {
						// exists and cancelled - delete and continue
						await tx.tickets.delete({ where: { id: et.id } });
					}

					if (!user) {
						// user not found - throw error
						throw new Error("Gifted user not found");
					}

					const ticket = await tx.tickets.create({
						data: {
							eventId: input.eventId,
							teamId: input.teamId,
							userId: input.userId,
							seatId: input.seatId,
							type: TicketType.GIFT,
							expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
							state: TicketState.PENDING,
							bearer: {
								name: user.name,
								email: user.email,
								phone: user.phone,
							},
						},
					});

					if (ticket) {
						// Update event seat to mark seat as unavailable
						const eventSeat = await tx.eventSeats.update({
							where: {
								eventId_seatId: {
									eventId: input.eventId,
									seatId: input.seatId,
								},
							},
							data: {
								isAvailable: false,
							},
						});

						const eventSeats = await tx.eventSeats.findMany({
							where: {
								eventId: input.eventId,
							},
							include: {
								seat: {
									select: {
										label: true,
									},
									include: {
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

						if (eventSeat && eventSeats) {
							const seatingPlan: Record<string, Seat> = eventSeats.reduce(
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

							if (eventSeats.length > 0) {
								sseManager.broadcastSeatingUpdate(input.eventId, seatingPlan);
							}
						}

						return {
							success: true,
							message: "Ticket created successfully",
							ticket,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to create ticket", error, {
					operation: "createGiftTicket",
					eventId: input.eventId,
					teamId: input.teamId,
					seatId: input.seatId,
					userId: input.userId,
					bearer: input.bearer,
				});
				return {
					success: false,
					message: "Failed to create ticket",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Create Tickets (Group)
	createGroupTicket: devProcedure
		.input(
			z.object({
				eventId: z.string(),
				userId: z.string(),
				seatId: z.string(),
				teamId: z.string(),
				group: z
					.array(
						z.object({
							teamId: z.string(),
							seatId: z.string(),
							bearer: z.object({
								name: z.string(),
								email: z.string(),
								phone: z.string(),
							}),
						}),
					)
					.min(2)
					.max(4), // Group size must be between 3 and 5
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const user = await tx.users.findUnique({
						where: {
							id: input.userId,
						},
					});

					if (!user) {
						// user not found - throw error
						throw new Error("User not found");
					}

					const uts = await tx.tickets.findMany({
						where: {
							userId: input.userId,
						},
					});

					if (uts.length >= 14) {
						// user has reached the limit of 14 tickets - throw error
						throw new Error("User has reached the limit of 14 tickets");
					}

					let tickets: Tickets[] = [];

					const group = [...input.group];

					group.push({
						teamId: input.teamId,
						seatId: input.seatId,
						bearer: {
							name: user.name,
							email: user.email,
							phone: user.phone,
						},
					});

					for (const member of group) {
						const et = await tx.tickets.findUnique({
							where: {
								seatId_eventId: {
									seatId: member.seatId,
									eventId: input.eventId,
								},
							},
						});

						if (et && et.state !== TicketState.CANCELLED) {
							// exists and not cancelled - throw error
							throw new Error("Seat is already booked");
						}

						if (et && et.state === TicketState.CANCELLED) {
							// exists and cancelled - delete and continue
							await tx.tickets.delete({ where: { id: et.id } });
						}

						if (group.filter((m) => m.seatId === member.seatId).length > 1) {
							// seat is already booked - throw error
							throw new Error("Seat is already booked");
						}

						const ticket = await tx.tickets.create({
							data: {
								eventId: input.eventId,
								teamId: member.teamId,
								userId: input.userId,
								seatId: member.seatId,
								type: TicketType.GROUP,
								expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
								state: TicketState.PENDING,
								bearer: member.bearer,
							},
						});

						tickets.push(ticket);
					}

					if (tickets.length === input.group.length) {
						// Update event seats to mark seats as unavailable
						for (const ticket of tickets) {
							await tx.eventSeats.update({
								where: {
									eventId_seatId: {
										eventId: input.eventId,
										seatId: ticket.seatId,
									},
								},
								data: {
									isAvailable: false,
								},
							});
						}

						const eventSeats = await tx.eventSeats.findMany({
							where: {
								eventId: input.eventId,
							},
							include: {
								seat: {
									select: {
										label: true,
									},
									include: {
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

						if (eventSeats) {
							const seatingPlan: Record<string, Seat> = eventSeats.reduce(
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

							if (eventSeats.length > 0) {
								sseManager.broadcastSeatingUpdate(input.eventId, seatingPlan);
							}
						}

						return {
							success: true,
							message: "Tickets created successfully",
							tickets,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to create ticket", error, {
					operation: "createGroupTicket",
					eventId: input.eventId,
					userId: input.userId,
					group: input.group,
				});
				return {
					success: false,
					message: "Failed to create ticket",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Create Tickets (Family)
	createFamilyTicket: devProcedure
		.input(
			z.object({
				eventId: z.string(),
				userId: z.string(),
				seatId: z.string(),
				teamId: z.string(),
				family: z
					.array(
						z.object({
							teamId: z.string(),
							seatId: z.string(),
							bearer: z.object({
								name: z.string(),
								email: z.string(),
								phone: z.string(),
							}),
						}),
					)
					.min(2)
					.max(6), // Family size must be between 3 and 7
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const user = await tx.users.findUnique({
						where: {
							id: input.userId,
						},
					});

					if (!user) {
						// user not found - throw error
						throw new Error("User not found");
					}

					const uts = await tx.tickets.findMany({
						where: {
							userId: input.userId,
						},
					});

					if (uts.length >= 14) {
						// user has reached the limit of 14 tickets - throw error
						throw new Error("User has reached the limit of 14 tickets");
					}

					let tickets: Tickets[] = [];

					const family = [...input.family];

					family.push({
						teamId: input.teamId,
						seatId: input.seatId,
						bearer: {
							name: user.name,
							email: user.email,
							phone: user.phone,
						},
					});

					for (const member of family) {
						const et = await tx.tickets.findUnique({
							where: {
								seatId_eventId: {
									seatId: member.seatId,
									eventId: input.eventId,
								},
							},
						});

						if (et && et.state !== TicketState.CANCELLED) {
							// exists and not cancelled - throw error
							throw new Error("Seat is already booked");
						}

						if (et && et.state === TicketState.CANCELLED) {
							// exists and cancelled - delete and continue
							await tx.tickets.delete({ where: { id: et.id } });
						}

						if (family.filter((m) => m.seatId === member.seatId).length > 1) {
							// seat is already booked - throw error
							throw new Error("Seat is already booked");
						}

						const ticket = await tx.tickets.create({
							data: {
								eventId: input.eventId,
								teamId: member.teamId,
								userId: input.userId,
								seatId: member.seatId,
								type: TicketType.FAMILY,
								expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
								state: TicketState.PENDING,
								bearer: member.bearer,
							},
						});

						tickets.push(ticket);
					}

					if (tickets.length === family.length) {
						// Update event seats to mark seats as unavailable
						for (const ticket of tickets) {
							await tx.eventSeats.update({
								where: {
									eventId_seatId: {
										eventId: input.eventId,
										seatId: ticket.seatId,
									},
								},
								data: {
									isAvailable: false,
								},
							});
						}

						const eventSeats = await tx.eventSeats.findMany({
							where: {
								eventId: input.eventId,
							},
							include: {
								seat: {
									select: {
										label: true,
									},
									include: {
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

						if (eventSeats) {
							const seatingPlan: Record<string, Seat> = eventSeats.reduce(
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

							if (eventSeats.length > 0) {
								sseManager.broadcastSeatingUpdate(input.eventId, seatingPlan);
							}
						}

						return {
							success: true,
							message: "Tickets created successfully",
							tickets,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to create ticket", error, {
					operation: "createFamilyTicket",
					eventId: input.eventId,
					userId: input.userId,
					family: input.family,
				});
				return {
					success: false,
					message: "Failed to create ticket",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get All Tickets
	getTickets: adminProcedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				const tickets = await tx.tickets.findMany();
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
			logger.error("Failed to retrieve all tickets", error, {
				operation: "getTickets",
			});
			return {
				success: false,
				message: "Failed to retrieve tickets",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}),

	// Get Ticket
	getTicket: adminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const ticket = await tx.tickets.findUnique({
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
				});
			} catch (error) {
				logger.error("Failed to retrieve ticket", error, {
					operation: "getTicket",
					ticketId: input.id,
				});
				return {
					success: false,
					message: "Failed to retrieve ticket",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get Tickets By Event
	getTicketsByEvent: adminProcedure
		.input(
			z.object({
				eventId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const tickets = await tx.tickets.findMany({
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
				});
			} catch (error) {
				logger.error("Failed to retrieve tickets by event", error, {
					operation: "getTicketsByEvent",
					eventId: input.eventId,
				});
				return {
					success: false,
					message: "Failed to retrieve tickets",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get Tickets By Team
	getTicketsByTeam: adminProcedure
		.input(
			z.object({
				teamId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const tickets = await tx.tickets.findMany({
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
				});
			} catch (error) {
				logger.error("Failed to retrieve tickets by team", error, {
					operation: "getTicketsByTeam",
					teamId: input.teamId,
				});
				return {
					success: false,
					message: "Failed to retrieve tickets",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get Tickets By State
	getTicketByState: adminProcedure
		.input(
			z.object({
				state: z.enum(["PENDING", "PAID", "CANCELLED", "USED"]),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const tickets = await tx.tickets.findMany({
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
				});
			} catch (error) {
				logger.error("Failed to retrieve tickets by state", error, {
					operation: "getTicketByState",
					state: input.state,
				});
				return {
					success: false,
					message: "Failed to retrieve tickets",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get user's tickets ()
	getUserTickets: devProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const user = await tx.users.findUnique({
						where: {
							id: input.userId,
						},
					});

					if (!user) {
						throw new Error("User not found");
					}

					const tickets = await tx.tickets.findMany({
						where: {
							OR: [
								{
									userId: input.userId,
								},
								{
									bearer: {
										path: ["email"],
										equals: user.email,
									},
								},
							],
							state: {
								in: [TicketState.PAID, TicketState.PENDING],
							},
						},
					});

					if (tickets) {
						return {
							success: true,
							message: "Tickets retrieved successfully",
							tickets,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to retrieve user's tickets", error, {
					operation: "getUserTickets",
					userId: input.userId,
				});
				return {
					success: false,
					message: "Failed to retrieve user's tickets",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Cancel Ticket
	cancelTicket: adminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const ticket = await tx.tickets.update({
						where: {
							id: input.id,
						},
						data: {
							state: TicketState.CANCELLED,
						},
					});

					if (ticket) {
						// Release the seat and broadcast update
						const eventSeat = await tx.eventSeats.update({
							where: {
								eventId_seatId: {
									eventId: ticket.eventId,
									seatId: ticket.seatId,
								},
							},
							data: {
								isAvailable: true,
							},
						});

						const eventSeats = await tx.eventSeats.findMany({
							where: {
								eventId: ticket.eventId,
							},
							include: {
								seat: {
									select: {
										label: true,
									},
									include: {
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

						const seatingPlan: Record<string, Seat> = eventSeats.reduce(
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

						if (eventSeat && eventSeats) {
							sseManager.broadcastSeatingUpdate(ticket.eventId, seatingPlan);
						}

						return {
							success: true,
							message: "Ticket cancelled successfully",
							ticket,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to cancel ticket", error, {
					operation: "cancelTicket",
					ticketId: input.id,
				});
				return {
					success: false,
					message: "Failed to cancel ticket",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Place payment order
	placePaymentOrder: devProcedure
		.input(
			z.object({
				userId: z.string(),
				tickets: z
					.array(
						z.object({
							id: z.string(),
						}),
					)
					.min(1),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const tickets = await tx.tickets.findMany({
						where: {
							id: {
								in: input.tickets.map((ticket) => ticket.id),
							},
						},
						include: {
							seat: {
								select: {
									price: true,
								},
							},
						},
					});

					if (tickets) {
						const order = await tx.orders.create({
							data: {
								userId: input.userId,
							},
						});

						if (order) {
							return {
								success: true,
								message: "Payment order placed successfully",
								order,
							};
						}
					} else {
						return {
							success: false,
							message: "Ticket not found",
							order: null,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to place payment order", error, {
					operation: "placePaymentOrder",
					tickets: input.tickets,
				});
				return {
					success: false,
					message: "Failed to place payment order",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get Ticket QR Code
	getTicketQRCode: devProcedure
		.input(
			z.object({
				ticketId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const ticket = await tx.tickets.findUnique({
						where: {
							id: input.ticketId,
						},
					});

					if (ticket) {
						const qrData = generateSecureQRData(ticket);
						const qrBuffer = await QRCode.toBuffer(qrData, {
							width: 256,
							margin: 2,
							errorCorrectionLevel: "M",
						});
						return {
							success: true,
							message: "Ticket QR code retrieved successfully",
							qrCode: `data:image/png;base64,${qrBuffer.toString("base64")}`,
							ticketInfo: {
								event: await tx.events
									.findUnique({ where: { id: ticket.eventId } })
									.then((event) => event?.name),
								seat: ticket.seatId,
								date: await tx.events
									.findUnique({ where: { id: ticket.eventId } })
									.then((event) => event?.startsAt),
								client: ticket.bearer,
							},
						};
					}
				});
			} catch (error) {
				logger.error("Failed to retrieve ticket QR code", error, {
					operation: "getTicketQRCode",
					ticketId: input.ticketId,
				});
				return {
					success: false,
					message: "Failed to retrieve ticket QR code",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Validate Ticket QR Code
	validateQRCode: adminProcedure
		.input(
			z.object({
				qrData: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const [encodedPayload, signature] = input.qrData.split(".");
					const payload = JSON.parse(
						Buffer.from(encodedPayload, "base64").toString("utf-8"),
					);

					if (!process.env.QR_SECRET) {
						throw new Error("QR_SECRET is not defined");
					}

					// Verify signature
					const expectedSig = crypto
						.createHmac("sha256", process.env.QR_SECRET)
						.update(JSON.stringify(payload))
						.digest("hex")
						.substring(0, 16);

					if (signature !== expectedSig) {
						throw new Error("Invalid signature");
					}

					const ticket = await tx.tickets.update({
						where: {
							id: payload.t,
							state: TicketState.PAID,
						},
						data: {
							state: TicketState.USED,
						},
						include: {
							event: true,
							seat: true,
						},
					});

					const seat = await tx.seats.findUnique({
						where: {
							id: ticket.seat.seatId,
						},
					});

					if (!seat) {
						throw new Error("Seat not found");
					}

					return {
						success: true,
						message: "Ticket QR code validated successfully",
						ticket: {
							id: ticket.id,
							event: ticket.event.name,
							seat: seat.label,
							client: ticket.bearer,
							startsAt: ticket.event.startsAt,
						},
					};
				});
			} catch (error) {
				logger.error("Failed to validate ticket QR code", error, {
					operation: "validateQRCode",
					qrData: input.qrData,
				});
				return {
					success: false,
					message: "Failed to validate ticket QR code",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),
});
