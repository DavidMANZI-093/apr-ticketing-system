import { t } from "../controllers/trpc";
import { z } from "zod";
import { adminProcedure } from "../middleware/admin-procedure";
import { prisma } from "../controllers/prisma";
import { logger } from "../utils/logger";
import { devProcedure } from "../middleware/dev-procedure";

export const venueRouter = t.router({
	// Create Venue
	createVenue: adminProcedure
		.input(
			z.object({
				name: z.string(),
				description: z.string(),
				location: z.object({
					longitude: z.number(),
					latitude: z.number(),
				}),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const venue = await tx.venues.create({
						data: {
							name: input.name,
							description: input.description,
							location: `${input.location.longitude},${input.location.latitude}`,
						},
					});

					if (venue) {
						return {
							success: true,
							message: "Venue created successfully",
							venue,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to create venue", error, {
					operation: "createVenue",
					venueName: input.name,
					location: input.location,
				});
				return {
					success: false,
					message: "Failed to create venue",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get All Venues
	getAllVenues: devProcedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				const venues = await tx.venues.findMany();
				if (venues) {
					return {
						success: true,
						message: "Venues retrieved successfully",
						venues,
					};
				} else {
					return {
						success: true,
						message: "No venues found",
						venues: [],
					};
				}
			});
		} catch (error) {
			logger.error("Failed to retrieve all venues", error, {
				operation: "getAllVenues",
			});
			return {
				success: false,
				message: "Failed to retrieve venues",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}),

	// Get Venue
	getVenue: devProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const venue = await tx.venues.findUnique({
						where: {
							id: input.id,
						},
					});

					if (venue) {
						return {
							success: true,
							message: "Venue retrieved successfully",
							venue,
						};
					} else {
						return {
							success: true,
							message: "No venue found",
							venue: null,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to retrieve venue", error, {
					operation: "getVenue",
					venueId: input.id,
				});
				return {
					success: false,
					message: "Failed to retrieve venue",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Update Venue
	updateVenue: adminProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().optional(),
				description: z.string().optional(),
				location: z
					.object({
						longitude: z.number(),
						latitude: z.number(),
					})
					.optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const venue = await tx.venues.update({
						where: {
							id: input.id,
						},
						data: {
							...(input.name !== undefined && { name: input.name }),
							...(input.description !== undefined && {
								description: input.description,
							}),
							...(input.location !== undefined && {
								location: `${input.location.longitude},${input.location.latitude}`,
							}),
						},
					});

					if (venue) {
						return {
							success: true,
							message: "Venue updated successfully",
							venue,
						};
					} else {
						return {
							success: true,
							message: "No venue found",
							venue: null,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to update venue", error, {
					operation: "updateVenue",
					venueId: input.id,
				});
				return {
					success: false,
					message: "Failed to update venue",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Delete Venue
	deleteVenue: adminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const venue = await tx.venues.delete({
						where: {
							id: input.id,
						},
					});

					if (venue) {
						return {
							success: true,
							message: "Venue deleted successfully",
							venue,
						};
					} else {
						return {
							success: true,
							message: "No venue found",
							venue: null,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to delete venue", error, {
					operation: "deleteVenue",
					venueId: input.id,
				});
				return {
					success: false,
					message: "Failed to delete venue",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),
});
