import { t } from "../controllers/trpc";
import { prisma } from "../controllers/prisma";
import { z } from "zod";

export const teamRouter = t.router({
    // get Teams
    getTeams: t.procedure.query(async () => {
        try {
            return await prisma.$transaction(async (tx) => {
                const teams = await tx.team.findMany();
                if (teams) {
                    return {
                        success: true,
                        message: "Teams retrieved successfully",
                        teams,
                    }
                } else {
                    return {
                        success: true,
                        message: "No teams found",
                        teams: [],
                    }
                }
            })
        } catch (error) {
            return {
                success: false,
                message: "Failed to retrieve teams",
                error: error as string,
            }
        }
    }),

    // get Team
    getTeam: t.procedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .query(async ({ input }) => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const team = await tx.team.findUnique({
                        where: {
                            id: input.id,
                        },
                    });
                    if (team) {
                        return {
                            success: true,
                            message: "Team retrieved successfully",
                            team,
                        }
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to retrieve team",
                    error: error as string,
                }
            }
        }),

    // Update Team
    updateTeam: t.procedure
        .input(
            z.object({
                id: z.string(),
                name: z.string(),
                description: z.string(),
                logoUrl: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            try {
                return await prisma.$transaction(async (tx) => {
                    const team = await tx.team.update({
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
                        }
                    }
                })
            } catch (error) {
                return {
                    success: false,
                    message: "Failed to update team",
                    error: error as string,
                }
            }
        }),
});
