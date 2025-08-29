import { t } from "../controllers/trpc";
import { prisma } from "../controllers/prisma";
import z from "zod";
import { UserRole } from "../../generated/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import { adminProcedure } from "../middleware/admin-procedure";

export const adminRouter = t.router({
	// Admin login
	login: t.procedure
		.input(
			z.object({
				nameOrEmail: z.string().or(z.email()),
				password: z.string(),
				phrase: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const user = await tx.admins.findFirst({
						where: {
							OR: [{ name: input.nameOrEmail }, { email: input.nameOrEmail }],
							role: UserRole.ADMIN,
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

					// Issue admin token for protected admin procedures
					if (!process.env.ADMIN_JWT_SECRET) {
						throw new Error("ADMIN_JWT_SECRET is not defined");
					}

					const KeyRecord = await prisma.apiKey.create({
						data: {
							name: "admin",
						},
					});

					const adminToken = jwt.sign(
						{
							keyId: KeyRecord.id,
							name: "admin",
						},
						process.env.ADMIN_JWT_SECRET,
						{ expiresIn: "1h" }, // 1 hour expiration
					);

					return {
						success: true,
						message: "User logged in successfully",
						user,
						token: adminToken,
					};
				});
			} catch (error) {
				logger.error("Failed to login", error, {
					operation: "login",
					nameOrEmail: input.nameOrEmail,
				});
				return {
					success: false,
					message: "Failed to login",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Refresh Admin Token
	refreshAdminToken: adminProcedure
		.input(
			z.object({
				token: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					if (!process.env.ADMIN_JWT_SECRET) {
						throw new Error("ADMIN_JWT_SECRET is not defined");
					}

					const decodedToken = jwt.verify(
						input.token,
						process.env.ADMIN_JWT_SECRET,
					) as { keyId: string; name: string };

					await tx.apiKey.update({
						where: {
							id: decodedToken.keyId,
						},
						data: {
							active: false,
						},
					});

					const newToken = jwt.sign(
						{
							keyId: decodedToken.keyId,
							name: decodedToken.name,
						},
						process.env.ADMIN_JWT_SECRET,
						{
							expiresIn: "1h", // 1 hour expiration
						},
					);

					return {
						success: true,
						message: "Token refreshed successfully",
						token: newToken,
					};
				});
			} catch (error) {
				logger.error("Failed to refresh token", error, {
					operation: "refreshAdminToken",
					token: input.token,
				});
				return {
					success: false,
					message: "Failed to refresh token",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Admin logout
	logout: adminProcedure
		.input(
			z.object({
				token: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					if (!process.env.ADMIN_JWT_SECRET) {
						throw new Error("ADMIN_JWT_SECRET is not defined");
					}

					const decodedToken = jwt.verify(
						input.token,
						process.env.ADMIN_JWT_SECRET,
					) as { keyId: string; name: string };

					await tx.apiKey.update({
						where: {
							id: decodedToken.keyId,
						},
						data: {
							active: false,
						},
					});

					return {
						success: true,
						message: "Logged out successfully",
					};
				});
			} catch (error) {
				logger.error("Failed to logout", error, {
					operation: "logout",
					token: input.token,
				});
				return {
					success: false,
					message: "Failed to logout",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),
});
