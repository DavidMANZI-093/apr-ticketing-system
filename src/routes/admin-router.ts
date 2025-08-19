import { prisma } from "../controllers/prisma";
import { t } from "../controllers/trpc";
import { z } from "zod";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";
import { adminProcedure } from "../middleware/admin-procedure";
import jwt from "jsonwebtoken";

export const adminRouter = t.router({
	// Admin login
	login: t.procedure
		.input(
			z.object({
				username: z.string(),
				password: z.string(),
				phrase: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					if (!process.env.HASH_SECRET) {
						// Hash secret is required for password comparison
						throw new Error("HASH_SECRET is not defined");
					}

					const user = await tx.user.findUnique({
						where: {
							name: input.username,
						},
					});

					if (!user) {
						return {
							success: false,
							message: "User not found",
							user: null,
						};
					}

					if (!bcrypt.compareSync(input.password, user.password)) {
						return {
							success: false,
							message: "Incorrect password",
							user: null,
						};
					}

					if (!bcrypt.compareSync(input.phrase, user.phrase)) {
						return {
							success: false,
							message: "Incorrect phrase",
							user: null,
						};
					}

					return {
						success: true,
						message: "User logged in successfully",
						user,
					};
				});
			} catch (error) {
				logger.error("Failed to login", error, {
					operation: "login",
					username: input.username,
				});
				return {
					success: false,
					message: "Failed to login",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Create API Key
	createApiKey: adminProcedure
		.input(
			z.object({
				name: z.enum(["dev", "prod", "readonly"]).default("dev"),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				if (!process.env.JWT_SECRET) {
					throw new Error("JWT_SECRET is not defined");
				}

				const keyRecord = await prisma.apiKey.create({
					data: {
						name: input.name,
					},
				});

				const apiToken = jwt.sign(
					{
						keyId: keyRecord.id,
						name: input.name,
					},
					process.env.JWT_SECRET,
					{
						expiresIn: "15d", // 15 days
					},
				);

				return {
					success: true,
					message: "API Key created successfully",
					apiToken,
				};
			} catch (error) {
				logger.error("Failed to create API key", error, {
					operation: "createApiKey",
					name: input.name,
				});
				return {
					success: false,
					message: "Failed to create API key",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// listApiKeys
	listApiKeys: adminProcedure.query(async () => {
		try {
			return await prisma.$transaction(async (tx) => {
				return await tx.apiKey.findMany();
			});
		} catch (error) {
			logger.error("Failed to list API keys", error, {
				operation: "listApiKeys",
			});
			return {
				success: false,
				message: "Failed to list API keys",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}),

	// revokeApiKey
	revokeApiKey: adminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const apiKey = await tx.apiKey.update({
						where: {
							id: input.id,
						},
						data: {
							active: false,
						},
					});

					if (apiKey) {
						return {
							success: true,
							message: "API key revoked successfully",
						};
					}
				});
			} catch (error) {
				logger.error("Failed to revoke API key", error, {
					operation: "revokeApiKey",
					id: input.id,
				});
				return {
					success: false,
					message: "Failed to revoke API key",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),
});
