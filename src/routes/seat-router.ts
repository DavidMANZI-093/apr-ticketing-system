import { t } from "../controllers/trpc";
import { z } from "zod";
import { prisma } from "../controllers/prisma";
import { adminProcedure } from "../middleware/admin-procedure";
import { logger } from "../utils/logger";
import { devProcedure } from "../middleware/dev-procedure";

export const seatRouter = t.router({
	// Create Seats
	createSeats: adminProcedure
		.input(
			z.object({
				venueId: z.string(),
				seats: z.array(
					z.object({
						sectionId: z.string(),
						row: z.number(),
						number: z.number(),
					}),
				),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const venue = await tx.venues.findUnique({
						where: {
							id: input.venueId,
						},
					});

					if (!venue) {
						return {
							success: false,
							message: "Venue not found",
							venue: null,
						};
					}

					// Verify all sections exist
					const sectionIds = [
						...new Set(input.seats.map((seat) => seat.sectionId)),
					];
					const sections = await tx.seatSections.findMany({
						where: {
							id: { in: sectionIds },
							venueId: input.venueId,
						},
					});

					if (sections.length !== sectionIds.length) {
						return {
							success: false,
							message: "One or more sections not found",
							seats: null,
						};
					}

					const seats = await tx.seats.createMany({
						data: input.seats.map((seat) => {
							const section = sections.find((s) => s.id === seat.sectionId);
							return {
								venueId: input.venueId,
								label: `${section?.name}${seat.row}-${seat.number}`,
								sectionId: seat.sectionId,
								row: seat.row,
								number: seat.number,
							};
						}),
					});

					if (seats) {
						return {
							success: true,
							message: "Seats created successfully",
							seats,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to create seats", error, {
					operation: "createSeats",
					venueId: input.venueId,
					seats: input.seats,
				});
				return {
					success: false,
					message: "Failed to create seats",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get All Seats
	getAllSeats: adminProcedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				const seats = await tx.seats.findMany();
				if (seats) {
					return {
						success: true,
						message: "Seats retrieved successfully",
						seats,
					};
				} else {
					return {
						success: true,
						message: "No seats found",
						seats: [],
					};
				}
			});
		} catch (error) {
			logger.error("Failed to retrieve all seats", error, {
				operation: "getAllSeats",
			});
			return {
				success: false,
				message: "Failed to retrieve seats",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}),

	// Get Seats by Venue
	getSeatsByVenue: devProcedure
		.input(
			z.object({
				venueId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			// TODO: Remove loggs later
			logger.info("Processing getSeatsByVenue", {
				eventId: input.venueId,
			});
			try {
				return await prisma.$transaction(async (tx) => {
					const seats = await tx.seats.findMany({
						where: {
							venueId: input.venueId,
						},
						select: {
							id: true,
							venueId: true,
							label: true,
							sectionId: true,
							row: true,
							number: true,
							section: {
								select: {
									id: true,
									name: true,
									svgPathData: true,
								},
							},
						},
					});

					if (seats) {
						return {
							success: true,
							message: "Seats retrieved successfully",
							seats,
						};
					} else {
						return {
							success: true,
							message: "No seats found",
							seats: [],
						};
					}
				});
			} catch (error) {
				logger.error("Failed to retrieve seats by venue", error, {
					operation: "getSeatsByVenue",
					venueId: input.venueId,
				});
				return {
					success: false,
					message: "Failed to retrieve seats",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Create Event Seats
	createEventSeats: adminProcedure
		.input(
			z.object({
				eventId: z.string(),
				seats: z.array(
					z.object({
						seatId: z.string(),
						price: z.number(),
						category: z.string(),
					}),
				),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const seats = await tx.eventSeats.createMany({
						data: input.seats.map((seat) => {
							return {
								eventId: input.eventId,
								seatId: seat.seatId,
								price: seat.price,
								category: seat.category,
								available: true,
							};
						}),
						skipDuplicates: true,
					});

					if (seats) {
						return {
							success: true,
							message: "Event seats created successfully",
							seats,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to create event seats", error, {
					operation: "createEventSeats",
					eventId: input.eventId,
					seats: input.seats,
				});
				return {
					success: false,
					message: "Failed to create event seats",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get Event Seats
	getEventSeats: devProcedure
		.input(
			z.object({
				eventId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				// TODO: Remove loggs later
				logger.info("Processing getEventSeats", {
					eventId: input.eventId,
				});

				return await prisma.$transaction(async (tx) => {
					const eventSeats = await tx.eventSeats.findMany({
						where: {
							eventId: input.eventId,
						},
						select: {
							id: true,
							eventId: true,
							seatId: true,
							category: true,
							price: true,
							isAvailable: true,
							createdAt: true,
							updatedAt: true,
							seat: {
								select: {
									label: true,
									row: true,
									number: true,
									section: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
						},
					});

					if (eventSeats) {
						return {
							success: true,
							message: "Event seats retrieved successfully",
							eventSeats,
						};
					} else {
						return {
							success: true,
							message: "No event seats found",
							eventSeats: [],
						};
					}
				}, { timeout: 10000 });
			} catch (error) {
				logger.error("Failed to retrieve event seats", error, {
					operation: "getEventSeats",
					eventId: input.eventId,
				});
				return {
					success: false,
					message: "Failed to retrieve event seats",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get Event Seat
	getEventSeat: devProcedure
		.input(
			z.object({
				eventId: z.string(),
				seatId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const eventSeat = await tx.eventSeats.findUnique({
						where: {
							eventId_seatId: {
								eventId: input.eventId,
								seatId: input.seatId,
							},
						},
					});

					if (eventSeat) {
						return {
							success: true,
							message: "Event seat retrieved successfully",
							eventSeat,
						};
					} else {
						return {
							success: true,
							message: "No event seat found",
							eventSeat: null,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to retrieve event seat", error, {
					operation: "getEventSeat",
					eventId: input.eventId,
					seatId: input.seatId,
				});
				return {
					success: false,
					message: "Failed to retrieve event seat",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get Event Seats Stats
	getEventSeatsStats: devProcedure
		.input(
			z.object({
				eventId: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const eventSeats = await tx.eventSeats.findMany({
						where: {
							eventId: input.eventId,
						},
					});

					if (eventSeats) {
						const status = {
							availableSeats: eventSeats.filter((seat) => seat.isAvailable)
								.length,
							totalSeats: eventSeats.length,
						};

						return {
							success: true,
							message: "Event seats stats retrieved successfully",
							status,
						};
					} else {
						return {
							success: true,
							message: "No event seats found",
							status: null,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to retrieve event seats stats", error, {
					operation: "getEventSeatsStats",
					eventId: input.eventId,
				});
				return {
					success: false,
					message: "Failed to retrieve event seats stats",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),
});
