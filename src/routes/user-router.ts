import { t } from "../controllers/trpc";
import { z } from "zod";
import { prisma } from "../controllers/prisma";
import { devProcedure } from "../middleware/dev-procedure";
import { logger } from "../utils/logger";
import { Users } from "../../generated/prisma";

export const userRouter = t.router({
	// Create User
	createUser: devProcedure
		.input(
			z.object({
				username: z.string(),
				name: z.string(),
				email: z.email(),
				phone: z.string().regex(/^\+2507[2389]\d{7}$/, "Invalid phone number"),
			})
		).mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					const user = await tx.users.create({
						data: {
							username: input.username,
							name: input.name,
							email: input.email,
							phone: input.phone,
						},
					});

					if (!user) {
						throw new Error("Unknown error");
					}

					return {
						success: true,
						message: "User created successfully",
						user,
					};
				});
			} catch (error) {
				logger.error("Failed to create user", error, {
					operation: "createUser",
					username: input.username,
					name: input.name,
					email: input.email,
					phone: input.phone,
				});
				return {
					success: false,
					message: "Failed to create user",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

	// Get User
	getUser: devProcedure // Recommended for mock sign-in
		.input(
			z.object({
				usernameOrEmailOrPhone: z.object({
					type: z.enum(["username", "email", "phone"]),
					value: z.string(),
				}).refine((data) => {
					switch (data.type) {
						case "phone":
							return z.string().regex(/^\+2507[2389]\d{7}$/).safeParse(data.value).success;
						case "email":
							return z.email().safeParse(data.value).success;
						case "username":
							return z.string().safeParse(data.value).success;
						default:
							return true;
					}
				}),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await prisma.$transaction(async (tx) => {
					let user: Users | null = null;

					switch (input.usernameOrEmailOrPhone.type) {
						case "username":
							user = await tx.users.findUnique({
								where: { username: input.usernameOrEmailOrPhone.value },
							});
							break;
						case "email":
							user = await tx.users.findUnique({
								where: { email: input.usernameOrEmailOrPhone.value },
							});
							break;
						case "phone":
							user = await tx.users.findUnique({
								where: { phone: input.usernameOrEmailOrPhone.value },
							});
							break;
					}

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
					value: input.usernameOrEmailOrPhone.value,
					type: input.usernameOrEmailOrPhone.type,
				});
				return {
					success: false,
					message: "Failed to retrieve user",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}),

		// Get User By ID
		getUserById: devProcedure
			.input(
				z.object({
					id: z.string(),
				})
			)
			.mutation(async ({ input }) => {
				try {
					return await prisma.$transaction(async (tx) => {
						const user = await tx.users.findUnique({
							where: { id: input.id },
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
					})
				} catch (error) {
					logger.error("Failed to retrieve user", error, {
						operation: "getUserById",
						id: input.id,
					});
					return {
						success: false,
						message: "Failed to retrieve user",
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			})
});
