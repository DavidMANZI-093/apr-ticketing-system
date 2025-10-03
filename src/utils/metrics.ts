import * as client from "prom-client";

export const register = new client.Registry();

register.setDefaultLabels({
	app: "apr-ticketing-system",
});

client.collectDefaultMetrics({ register });

// tRPC Metrics
export const trpcRequestDuration = new client.Histogram({
	name: "trpc_request_duration_seconds",
	help: "Duration of tRPC requests in seconds",
	labelNames: ["procedure", "status", "role"],
	buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // 1ms to 10s
	registers: [register],
});

export const trpcRequestTotal = new client.Counter({
	name: "trpc_requests_total",
	help: "Total number of tRPC requests",
	labelNames: ["procedure", "status", "role", "error_code"],
	registers: [register],
});

export const trpcActiveRequests = new client.Gauge({
	name: "trpc_active_requests",
	help: "Number of active tRPC requests",
	labelNames: ["procedure"],
	registers: [register],
});

// Ticket Metrics
export const ticketCreations = new client.Counter({
	name: "tickets_created_total",
	help: "Total number of tickets created",
	labelNames: ["ticket_type", "status"],
	registers: [register],
});

export const ticketStateChanges = new client.Counter({
	name: "ticket_state_changes_total",
	help: "Total number of ticket state changes",
	labelNames: ["from_state", "to_state"],
	registers: [register],
});

export const ticketsByState = new client.Gauge({
	name: "tickets_by_state",
	help: "Number of tickets in each state",
	labelNames: ["state"],
	registers: [register],
});

// Payment Metrics
export const paymentAttempts = new client.Counter({
	name: "payment_attempts_total",
	help: "Total number of payment attempts",
	labelNames: ["status"],
	registers: [register],
});

export const paymentDuration = new client.Histogram({
	name: "payment_duration_seconds",
	help: "Duration of payment processing in seconds",
	buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
	registers: [register],
});

export const seatAvailabilityChanges = new client.Counter({
	name: "seat_availability_changes_total",
	help: "Total number of seat availability changes",
	labelNames: ["available"],
	registers: [register],
});

// Seat Metrics
export const availableSeatsGauge = new client.Gauge({
	name: "available_seats",
	help: "Number of available seats per event",
	labelNames: ["event_id"],
	registers: [register],
});

// SSE Metrics
export const sseActiveConnections = new client.Gauge({
	name: "sse_active_connections",
	help: "Number of active SSE connections",
	labelNames: ["event_id"],
	registers: [register],
});

export const sseMessagesSent = new client.Counter({
	name: "sse_messages_sent_total",
	help: "Total number of SSE messages sent",
	labelNames: ["event_id", "message_type"],
	registers: [register],
});

// Rate Limiting Metrics
export const rateLimitHits = new client.Counter({
	name: "rate_limit_hits_total",
	help: "Total number of rate limit hits",
	labelNames: ["role"],
	registers: [register],
});

// Database Metrics
export const dbQueryDuration = new client.Histogram({
	name: "db_query_duration_seconds",
	help: "Duration of database queries in seconds",
	labelNames: ["operation", "model"],
	buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
	registers: [register],
});

export const dbErrors = new client.Counter({
	name: "db_errors_total",
	help: "Total number of database errors",
	labelNames: ["operation", "model", "error_type"],
	registers: [register],
});

// Cron Job Metrics
export const cronJobExecutions = new client.Counter({
	name: "cron_job_executions_total",
	help: "Total number of cron job executions",
	labelNames: ["job_name", "status"],
	registers: [register],
});

export const cronJobDuration = new client.Histogram({
	name: "cron_job_duration_seconds",
	help: "Duration of cron job executions in seconds",
	labelNames: ["job_name"],
	buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
	registers: [register],
});

export const expiredTicketsCleaned = new client.Counter({
	name: "expired_tickets_cleaned_total",
	help: "Total number of expired tickets cleaned up by cron job",
	registers: [register],
});

export const eventsDeactivated = new client.Counter({
	name: "events_deactivated_total",
	help: "Total number of events deactivated by cron job",
	registers: [register],
});
