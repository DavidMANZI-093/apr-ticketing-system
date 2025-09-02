import { t } from "../controllers/trpc";
import { prisma } from "../controllers/prisma";
import { z } from "zod";
import { logger } from "../utils/logger";
import { devProcedure } from "../middleware/dev-procedure";

export const teamRouter = t.router({
	// get Teams
	getTeams: devProcedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				const teams = await tx.teams.findMany();
				if (teams) {
					return {
						success: true,
						message: "Teams retrieved successfully",
						teams,
					};
				} else {
					return {
						success: true,
						message: "No teams found",
						teams: [],
					};
				}
			});
		} catch (error) {
			logger.error("Failed to retrieve teams", error, {
				operation: "getTeams",
			});
			return {
				success: false,
				message: "Failed to retrieve teams",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}),

	// get Team
	getTeam: devProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const team = await tx.teams.findUnique({
						where: {
							id: input.id,
						},
					});
					if (team) {
						return {
							success: true,
							message: "Team retrieved successfully",
							team,
						};
					} else {
						return {
							success: true,
							message: "No team found",
							team: null,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to retrieve team", error, {
					operation: "getTeam",
					teamId: input.id,
				});
				return {
					success: false,
					message: "Failed to retrieve team",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Update Team
	updateTeam: devProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string(),
				description: z.string(),
				logoUrl: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const team = await tx.teams.update({
						where: {
							id: input.id,
						},
						data: {
							name: input.name,
							description: input.description,
							logoUrl: input.logoUrl,
						},
					});
					if (team) {
						return {
							success: true,
							message: "Team updated successfully",
							team,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to update team", error, {
					operation: "updateTeam",
					teamId: input.id,
					teamName: input.name,
				});
				return {
					success: false,
					message: "Failed to update team",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),
});
