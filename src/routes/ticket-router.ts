import { t } from "../controllers/trpc";
import { z } from "zod";
import { prisma } from "../controllers/prisma";
import parsePhoneNumber from "libphonenumber-js";
import { TicketState } from "../../generated/prisma";
import { logger } from "../utils/logger";
import { devProcedure } from "../middleware/dev-procedure";
import { generateSecureQRData } from "../utils/qr-code";
import QRCode from "qrcode";
import crypto from "crypto";

export const ticketRouter = t.router({
	// Create Ticket
	createTicket: devProcedure
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
					}, "Invalid phone number format (e.g. +250 788 888 888)"),
				}),
				seatId: z.string(),
			}),
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
					});

					if (et && et.state !== TicketState.CANCELLED) {
						// exists and not cancelled - throw error
						throw new Error("Seat is already booked");
					}

					if (et?.state === TicketState.CANCELLED) {
						// exists and cancelled - delete and continue
						await tx.ticket.delete({ where: { id: et.id } });
					}

					const ticket = await tx.ticket.create({
						data: {
							eventId: input.eventId,
							teamId: input.teamId,
							client: input.client,
							expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
							state: TicketState.PENDING,
							seatId: input.seatId,
						},
					});

					if (ticket) {
						// Update event seatingPlan to mark seat as unavailable
						const event = await tx.event.findUnique({
							where: { id: input.eventId },
							select: { seatingPlan: true },
						});

						if (event?.seatingPlan) {
							const seatingPlan = event.seatingPlan as Record<
								string,
								{ label: string; price: number; isAvailable: boolean }
							>;

							if (seatingPlan[input.seatId]) {
								seatingPlan[input.seatId].isAvailable = false;

								await tx.event.update({
									where: { id: input.eventId },
									data: { seatingPlan },
								});

								// Broadcast seat update via SSE
								const { sseManager } = await import("../utils/sse-manager");
								const seat = seatingPlan[input.seatId];
								sseManager.broadcastSeatUpdate(
									input.eventId,
									input.seatId,
									false, // seat is now unavailable
									seat?.price,
									seat?.label,
								);
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
					operation: "createTicket",
					eventId: input.eventId,
					teamId: input.teamId,
					seatId: input.seatId,
					clientEmail: input.client.email,
				});
				return {
					success: false,
					message: "Failed to create ticket",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get All Tickets
	getTickets: devProcedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				const tickets = await tx.ticket.findMany();
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
	getTicket: devProcedure
		.input(
			z.object({
				id: z.string(),
			}),
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
	getTicketsByEvent: devProcedure
		.input(
			z.object({
				eventId: z.string(),
			}),
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
	getTicketsByTeam: devProcedure
		.input(
			z.object({
				teamId: z.string(),
			}),
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
	getTicketByState: devProcedure
		.input(
			z.object({
				state: z.enum(["PENDING", "PAID", "CANCELLED", "USED"]),
			}),
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

	// Cancel Ticket
	cancelTicket: devProcedure
		.input(
			z.object({
				id: z.string(),
			}),
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
						// Release the seat and broadcast update
						const event = await tx.event.findUnique({
							where: { id: ticket.eventId },
							select: { seatingPlan: true },
						});

						if (event?.seatingPlan) {
							const seatingPlan = event.seatingPlan as Record<
								string,
								{ label: string; price: number; isAvailable: boolean }
							>;

							if (seatingPlan[ticket.seatId]) {
								seatingPlan[ticket.seatId].isAvailable = true;

								await tx.event.update({
									where: { id: ticket.eventId },
									data: { seatingPlan },
								});

								// Broadcast seat update via SSE
								const { sseManager } = await import("../utils/sse-manager");
								const seat = seatingPlan[ticket.seatId];
								sseManager.broadcastSeatUpdate(
									ticket.eventId,
									ticket.seatId,
									true, // seat is now available
									seat?.price,
									seat?.label,
								);
							}
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

	// Update Ticket State (PENDING -> PAID)
	updateTicketStatePaid: devProcedure
		.input(
			z.object({
				id: z.string(),
			}),
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
				});
			} catch (error) {
				logger.error("Failed to update ticket state to paid", error, {
					operation: "updateTicketStatePaid",
					ticketId: input.id,
				});
				return {
					success: false,
					message: "Failed to update ticket state",
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
		.query(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const ticket = await tx.ticket.findUnique({
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
								event: await tx.event
									.findUnique({ where: { id: ticket.eventId } })
									.then((event) => event?.name),
								seat: ticket.seatId,
								date: await tx.event
									.findUnique({ where: { id: ticket.eventId } })
									.then((event) => event?.startsAt),
								client: ticket.client,
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
	validateQRCode: devProcedure
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

					const ticket = await tx.ticket.update({
						where: {
							id: payload.t,
							state: TicketState.PAID,
						},
						data: {
							state: TicketState.USED,
						},
						include: {
							event: true,
						},
					});

					// Type-safe seatingPlan access
					const seatingPlan = ticket.event.seatingPlan as Record<string, { label: string; price: number; isAvailable: boolean }> | null;
					const seatLabel = seatingPlan?.[ticket.seatId]?.label || ticket.seatId;

					return {
						success: true,
						message: "Ticket QR code validated successfully",
						ticket: {
							id: ticket.id,
							event: ticket.event.name,
							seat: seatLabel,
							client: ticket.client,
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
