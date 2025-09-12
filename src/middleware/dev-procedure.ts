import { TRPCError } from "@trpc/server";
import { t } from "../controllers/trpc";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { checkRateLimit } from "../utils/rate-limiter";

dotenv.config();

export const devProcedure = t.procedure.use(async ({ ctx, next }) => {
	const token = ctx.req.headers.authorization?.replace("Bearer ", "");

	if (!token) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Unauthorized - No token provided",
		});
	}

	if (!process.env.JWT_SECRET) {
		throw new Error("JWT_SECRET is not defined");
	}

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET) as {
			keyId: string;
			name: string;
		};

		if (payload.name !== "dev") {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Unauthorized - Invalid role",
			});
		}

		const rateLimit = checkRateLimit(payload.keyId, "dev", 300, 3600000); // 300 requests per hour

		if (!rateLimit.allowed) {
			throw new TRPCError({
				code: "TOO_MANY_REQUESTS",
				message: `Rate limit exceeded. Reset at ${new Date(rateLimit.resetTime).toISOString()}`,
			});
		}

		return next({
			ctx: {
				...ctx,
				apiKey: payload,
				rateLimit: {
					remaining: rateLimit.remaining,
					resetTime: rateLimit.resetTime,
				},
			},
		});
	} catch (error) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Unauthorized - Invalid token",
		});
	}
});
