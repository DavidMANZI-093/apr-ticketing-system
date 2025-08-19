export interface SeatingPlan {
	label: string;
	price: number;
	isAvailable: boolean;
}

export interface RateLimitRecord {
	count: number;
	resetTime: number;
	firstRequest: number;
}
