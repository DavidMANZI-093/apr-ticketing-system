import { z } from "zod";
import { t } from "../controllers/trpc";
import { prisma } from "../controllers/prisma";

export const eventRouter = t.router({
	createEvent: t.procedure
		.input(
			z.object({
				name: z.string(),
				description: z.string(),
				location: z.string(),
				startsAt: z.string().transform((val) => new Date(val)),
				seatingPlan: z.object({
					sections: z.array(
						z.object({
							name: z.string().regex(/^[A-Z]$/), // Section name must be a single uppercase letter
							rows: z.array(
								z.object({
									name: z.string().regex(/^[A-Z]$/), // Row name must be a single uppercase letter
									seats: z.array(
										z.object({
											name: z.string().regex(/^[A-Z]$/), // Seat name must be a single uppercase letter
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
				const event = await prisma.event.create({
					data: {
						name: input.name,
						description: input.description,
						location: input.location,
						seatingPlan: input.seatingPlan,
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
			} catch (error) {
				return {
					success: false,
					message: "Failed to create event",
					error: error as string,
				};
			}
		}),

	getEvents: t.procedure.query(async () => {
		try {
			const events = await prisma.event.findMany({
                where: {
                    active: true,
                },
            });
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
		} catch (error) {
			return {
				success: false,
				message: "Failed to retrieve events",
				error: error as string,
			};
		}
	}),
});
