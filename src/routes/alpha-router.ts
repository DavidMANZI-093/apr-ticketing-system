import { prisma } from "../controllers/prisma";
import { t } from "../controllers/trpc";
import { z } from "zod";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";
import { alphaProcedure } from "../middleware/alpha-procedure";
import jwt from "jsonwebtoken";
import { UserRole } from "../../generated/prisma";

export const alphaRouter = t.router({
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

					const user = await tx.admins.findUnique({
						where: {
							name: input.username,
							role: UserRole.DEV,
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

					// Issue alpha token for protected alpha procedures
					if (!process.env.ALPHA_JWT_SECRET) {
						throw new Error("ALPHA_JWT_SECRET is not defined");
					}

					const alphaToken = jwt.sign(
						{
							role: "alpha",
							userId: user.id,
							username: user.name,
						},
						process.env.ALPHA_JWT_SECRET,
						{ expiresIn: "1d" },
					);

					return {
						success: true,
						message: "User logged in successfully",
						user,
						token: alphaToken,
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
	createApiKey: alphaProcedure
		.input(
			z.object({
				name: z.enum(["dev", "admin"]).default("dev"),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				if (!process.env.JWT_SECRET) {
					throw new Error("JWT_SECRET is not defined");
				}

				if (!process.env.ADMIN_JWT_SECRET) {
					throw new Error("ADMIN_JWT_SECRET is not defined");
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
					input.name === "admin"
						? process.env.ADMIN_JWT_SECRET
						: process.env.JWT_SECRET,
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
	listApiKeys: alphaProcedure.query(async () => {
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
	revokeApiKey: alphaProcedure
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

	// Get Metrics (Prometheus)
	getMetrics: alphaProcedure.query(async () => {
		try {
			const { register } = await import("../utils/metrics");
			const metrics = await register.metrics();
			
			return {
				success: true,
				message: "Metrics retrieved successfully",
				metrics,
				contentType: register.contentType,
			};
		} catch (error) {
			logger.error("Failed to retrieve metrics", error, {
				operation: "getMetrics",
			});
			return {
				success: false,
				message: "Failed to retrieve metrics",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}),
});
