import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

export interface AuthenticatedSSERequest extends Request {
	user?: {
		keyId: string;
		name: string;
		role: string;
	};
}

export const authenticateSSE = (
	req: AuthenticatedSSERequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const authHeader = req.headers.authorization;
		const token = authHeader?.replace("Bearer ", "");

		if (!token) {
			return res.status(401).json({
				success: false,
				message: "Unauthorized - No token provided",
			});
		}

		if (!process.env.JWT_SECRET) {
			throw new Error("JWT_SECRET is not defined");
		}

		const payload = jwt.verify(token, process.env.JWT_SECRET) as {
			keyId: string;
			name: string;
		};

		if (payload.name !== "dev") {
			return res.status(401).json({
				success: false,
				message: "Unauthorized - Invalid role for SSE access",
			});
		}

		req.user = {
			keyId: payload.keyId,
			name: payload.name,
			role: "dev",
		};

		next();
	} catch (error) {
		logger.error("SSE authentication failed", error, {
			operation: "sseAuth",
			ip: req.ip,
		});

		return res.status(401).json({
			success: false,
			message: "Unauthorized - Invalid token",
		});
	}
};