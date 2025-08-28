export interface RateLimitRecord {
	count: number;
	resetTime: number;
	firstRequest: number;
}

export interface Address {
	longitude: number;
	latitude: number;
}

export interface Seat {
	label: string;
	price: number | 0;
	isAvailable: boolean;
	category: string;
}
