import { z } from "zod";
import { t } from "../controllers/trpc";
import { prisma } from "../controllers/prisma";
import dotenv from "dotenv";
import { logger } from "../utils/logger";
import { devProcedure } from "../middleware/dev-procedure";
import { adminProcedure } from "../middleware/admin-procedure";
dotenv.config();

export const eventRouter = t.router({
	// Create Event
	createEvent: adminProcedure
		.input(
			z.object({
				name: z.string(),
				description: z.string(),
				venueId: z.string(),
				startsAt: z.string().transform((val) => {
					const date = new Date(val);
					if (date <= new Date()) {
						throw new Error("Event start time must be in the future");
					}
					return date;
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
					const event = await tx.events.create({
						data: {
							name: input.name,
							description: input.description,
							venueId: input.venueId,
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
				logger.error("Failed to create event", error, {
					operation: "createEvent",
					eventName: input.name,
					eventDescription: input.description,
					eventVenueId: input.venueId,
					eventStartsAt: input.startsAt,
					eventTeams: input.teams,
				});
				return {
					success: false,
					message: "Failed to create event",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get All Events
	getAllEvents: adminProcedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				const events = await tx.events.findMany();
				if (events) {
					return {
						success: true,
						message: "Events retrieved successfully",
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
			logger.error("Failed to retrieve all events", error, {
				operation: "getAllEvents",
			});
			return {
				success: false,
				message: "Failed to retrieve events",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}),

	// Get Events - Active only
	getEvents: devProcedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				const events = await tx.events.findMany({
					where: {
						active: true,
					},
					include: {
						venue: {
							include: {
								sections: {
									select: {
										id: true,
										name: true,
										svgPathData: true,
									},
								},
							},
						},
						teams: true,
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
			logger.error("Failed to retrieve active events", error, {
				operation: "getEvents",
			});
			return {
				success: false,
				message: "Failed to retrieve events",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}),

	// Get Event
	getEvent: devProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const event = await tx.events.findUnique({
						where: {
							id: input.id,
							active: true,
						},
						select: {
							venue: {
								select: {
									sections: {
										select: {
											id: true,
											name: true,
											svgPathData: true,
										},
									},
								},
							},
							teams: true,
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
				logger.error("Failed to retrieve event", error, {
					operation: "getEvent",
					eventId: input.id,
				});
				return {
					success: false,
					message: "Failed to retrieve event",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Update Event
	updateEvent: devProcedure
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
					const event = await tx.events.update({
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
				logger.error("Failed to update event", error, {
					operation: "updateEvent",
					eventId: input.id,
					updateFields: Object.keys(input).filter((key) => key !== "id"),
				});
				return {
					success: false,
					message: "Failed to update event",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Cancel Event
	cancelEvent: adminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const event = await tx.events.update({
						where: {
							id: input.id,
						},
						data: {
							active: false,
						},
					});

					if (event) {
						return {
							success: true,
							message: "Event cancelled successfully",
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
				logger.error("Failed to cancel event", error, {
					operation: "cancelEvent",
					eventId: input.id,
				});
				return {
					success: false,
					message: "Failed to cancel event",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),
});
