import { t } from "../controllers/trpc";
import { z } from "zod";
import { prisma } from "../controllers/prisma";
import { devProcedure } from "../middleware/dev-procedure";
import { logger } from "../utils/logger";

export const userRouter = t.router({
	getUser: devProcedure
		.input(
			z.object({
				email: z.email(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const user = await tx.users.findUnique({
						where: { email: input.email },
					});
					if (user) {
						return {
							success: true,
							message: "User retrieved successfully",
							user,
						};
					} else {
						return {
							success: true,
							message: "User not found",
							user: null,
						};
					}
				});
			} catch (error) {
				logger.error("Failed to retrieve user", error, {
					operation: "getUser",
					email: input.email,
				});
				return {
					success: false,
					message: "Failed to retrieve user",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),
});
