import { TRPCError } from "@trpc/server";
import { baseProcedure } from "../controllers/trpc";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const alphaProcedure = baseProcedure.use(async ({ ctx, next }) => {
	const token = ctx.req.headers.authorization?.replace("Bearer ", "");

	if (!token) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Unauthorized - No token provided",
		});
	}

	if (!process.env.ALPHA_JWT_SECRET) {
		throw new Error("ALPHA_JWT_SECRET is not defined");
	}

	try {
		const payload = jwt.verify(token, process.env.ALPHA_JWT_SECRET) as {
			role: string;
		};
		if (payload.role !== "alpha") {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Unauthorized - Invalid role",
			});
		}
	} catch (error) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Unauthorized - Invalid token",
		});
	}

	return next({
		ctx,
	});
});
