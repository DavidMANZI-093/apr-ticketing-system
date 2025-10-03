import {
	trpcRequestDuration,
	trpcRequestTotal,
	trpcActiveRequests,
} from "../utils/metrics";
import { TRPCError } from "@trpc/server";

export const metricsMiddleware = async ({ ctx, next, path }: any) => {
	const startTime = Date.now();
	const procedure = path;

	// Extract role from context (set by auth middleware)
	let role = "public";
	if ("apiKey" in ctx && ctx.apiKey && typeof ctx.apiKey === "object") {
		role = (ctx.apiKey as any).name || "unknown";
	}

	trpcActiveRequests.inc({ procedure });

	try {
		const result = await next();

		const duration = (Date.now() - startTime) / 1000;

		trpcRequestDuration.observe(
			{ procedure, status: "success", role },
			duration,
		);
		trpcRequestTotal.inc({
			procedure,
			status: "success",
			role,
			error_code: "none",
		});

		return result;
	} catch (error) {
		const duration = (Date.now() - startTime) / 1000;

		let errorCode = "INTERNAL_SERVER_ERROR";
		if (error instanceof TRPCError) {
			errorCode = error.code;
		}
		trpcRequestDuration.observe({ procedure, status: "error", role }, duration);
		trpcRequestTotal.inc({
			procedure,
			status: "error",
			role,
			error_code: errorCode,
		});

		throw error;
	} finally {
		trpcActiveRequests.dec({ procedure });
	}
};
