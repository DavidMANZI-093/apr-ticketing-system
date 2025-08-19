import { RateLimitRecord } from "../types";

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup expired entries every minute
setInterval(() => {
	const now = Date.now();
	for (const [key, record] of rateLimitStore.entries()) {
		if (now > record.resetTime) {
			rateLimitStore.delete(key);
		}
	}
}, 60 * 1000);

export const checkRateLimit = (
	keyId: string,
	limit: number,
	windowMs: number,
): { allowed: boolean; remaining: number; resetTime: number } => {
	const now = Date.now();
	const key = `dev:${keyId}`;
	const record = rateLimitStore.get(key);

	// First request or window expired
	if (!record || now > record.resetTime) {
		const newRecord = {
			count: 1,
			resetTime: now + windowMs,
			firstRequest: now,
		};

		rateLimitStore.set(key, newRecord);

		return {
			allowed: true,
			remaining: limit - 1,
			resetTime: newRecord.resetTime,
		};
	}

	// Within window - check limit
	if (record.count >= limit) {
		return {
			allowed: false,
			remaining: 0,
			resetTime: record.resetTime,
		};
	}

	// Increment and allow
	record.count++;
	return {
		allowed: true,
		remaining: limit - record.count,
		resetTime: record.resetTime,
	};
};

export const getRateLimitStats = (keyId: string) => {
	const record = rateLimitStore.get(`dev:${keyId}`);
	if (!record) return null;

	return {
		currentCount: record.count,
		resetTime: record.resetTime,
		requestRate: record.count / ((Date.now() - record.firstRequest) / 60000), // requests per minute
	};
};

// Get current store size for monitoring
export const getRateLimitStoreSize = () => rateLimitStore.size;
