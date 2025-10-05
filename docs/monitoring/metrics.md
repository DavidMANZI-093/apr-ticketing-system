# Prometheus Metrics

## Overview

Comprehensive Prometheus monitoring has been implemented for the APR Ticketing System. This provides production-ready observability with detailed metrics collection across all system components.

## Metrics Endpoint

```typescript
// tRPC Query - Requires Alpha Authentication
alpha.getMetrics
Headers: { Authorization: "Bearer <alpha-token>" }

// Success Response:
{
  "success": true,
  "message": "Metrics retrieved successfully", 
  "metrics": "# HELP trpc_request_duration_seconds Duration of tRPC requests in seconds\n# TYPE trpc_request_duration_seconds histogram\n...",
  "contentType": "text/plain; version=0.0.4; charset=utf-8"
}
```

**Security Note**: Metrics are now protected by Alpha authentication to prevent unauthorized access to system performance data.

## Core Infrastructure

### Components
- **`src/utils/metrics.ts`** - Centralized metrics registry with 20+ metric definitions
- **`src/middleware/metrics-middleware.ts`** - Automatic tRPC request tracking middleware
- **`src/controllers/trpc.ts`** - Base procedure with metrics middleware
- **Auth procedures** - Track rate limit hits
- **Business logic** - Track domain-specific events

### Automatic Request Tracking
Every tRPC request is automatically tracked with:
- **Duration** (histogram with p50/p95/p99 support)
- **Total count** (success/error breakdown)
- **Active requests** (concurrent load monitoring)
- **Labels**: `procedure`, `status`, `role`, `error_code`

## Metrics Collected

### 1. tRPC Request Metrics

#### `trpc_request_duration_seconds` (Histogram)
Tracks request duration for all tRPC procedures.

**Labels:**
- `procedure` - Full procedure path (e.g., "ticket.createTicket")
- `status` - "success" or "error"
- `role` - User role ("dev", "admin", "alpha", "public")

**Buckets:** 1ms, 5ms, 10ms, 50ms, 100ms, 500ms, 1s, 2s, 5s, 10s

#### `trpc_requests_total` (Counter)
Total number of tRPC requests.

**Labels:**
- `procedure` - Full procedure path
- `status` - "success" or "error"
- `role` - User role
- `error_code` - tRPC error code (e.g., "UNAUTHORIZED", "NOT_FOUND")

#### `trpc_active_requests` (Gauge)
Number of currently active tRPC requests.

**Labels:**
- `procedure` - Full procedure path

### 2. Business Metrics

#### Tickets
- `tickets_created_total` - Track ticket creations by type and status
- `ticket_state_changes_total` - Monitor state transitions (PENDING → PAID → USED)
- `tickets_by_state` - Current distribution of tickets by state

#### Payments
- `payment_attempts_total` - Success/failure tracking
- `payment_duration_seconds` - Performance monitoring with buckets: 100ms, 500ms, 1s, 2s, 5s, 10s, 30s

#### Seats
- `seat_availability_changes_total` - Availability tracking
- `available_seats` - Per-event availability gauge

### 3. Real-time Metrics

#### SSE (Server-Sent Events)
- `sse_active_connections` - Live connection count per event
- `sse_messages_sent_total` - Message delivery tracking by event and message type

### 4. System Metrics

#### Rate Limiting
- `rate_limit_hits_total` - Total number of rate limit violations by role

#### Cron Jobs
- `cron_job_executions_total` - Success/failure tracking
- `cron_job_duration_seconds` - Performance monitoring with buckets: 100ms, 500ms, 1s, 5s, 10s, 30s, 60s
- `expired_tickets_cleaned_total` - Cleanup metrics
- `events_deactivated_total` - Event lifecycle tracking

#### Database (Ready to Use)
- `db_query_duration_seconds` - Query performance
- `db_errors_total` - Error tracking

### 5. Default Node.js Metrics
Standard metrics collected automatically:
- `process_cpu_user_seconds_total`
- `process_cpu_system_seconds_total`
- `process_heap_bytes`
- `process_resident_memory_bytes`
- `nodejs_eventloop_lag_seconds`
- `nodejs_gc_duration_seconds`

## Example Grafana Queries

### Request Performance
```promql
# Request Rate by Procedure
rate(trpc_requests_total[5m])

# P95 Latency
histogram_quantile(0.95, rate(trpc_request_duration_seconds_bucket[5m]))

# Error Rate
rate(trpc_requests_total{status="error"}[5m]) / rate(trpc_requests_total[5m])

# Top 5 Slowest Endpoints
topk(5, histogram_quantile(0.95, rate(trpc_request_duration_seconds_bucket[5m])))
```

### Business Metrics
```promql
# Ticket Creation Rate
rate(tickets_created_total{status="success"}[5m])

# Payment Success Rate
rate(payment_attempts_total{status="success"}[5m]) / rate(payment_attempts_total[5m])

# Active SSE Connections
sum(sse_active_connections)

# Expired Tickets Cleanup Rate
rate(expired_tickets_cleaned_total[5m])
```

### System Health
```promql
# Request Volume by Role
sum by (role) (rate(trpc_requests_total[5m]))

# Rate Limit Hits by Role
rate(rate_limit_hits_total[5m])

# Cron Job Success Rate
rate(cron_job_executions_total{status="success"}[5m]) / rate(cron_job_executions_total[5m])
```

## Key Data Points Collected

### Performance Metrics
- Request duration (with percentiles)
- Request volume
- Error rates
- Concurrent load
- Payment processing time
- Cron job execution time

### Business Metrics
- Ticket creation/cancellation rates
- Payment success/failure rates
- Seat availability changes
- SSE connection health
- Rate limit violations
- Expired ticket cleanup stats

### System Metrics
- CPU usage
- Memory usage
- Event loop lag
- Garbage collection

## Best Practices

### Cardinality Control

**Good Labels:**
- `procedure` - Limited set of endpoints
- `role` - Fixed set of roles
- `status` - success/error
- `error_code` - Limited set of tRPC error codes

**Avoid High Cardinality:**
- `user_id` - Unbounded
- `event_id` - Can grow indefinitely (use sparingly)
- `ticket_id` - Unbounded
- `timestamp` - Unbounded

### Performance Considerations
- **Minimal Overhead** - Metrics middleware adds <1ms overhead per request
- **Async Operations** - Metric increments are non-blocking
- **Memory Usage** - Each unique label combination creates a time series
- **Scrape Interval** - 15s recommended for balance between freshness and load

## Implementation Details

### Zero Configuration
- Metrics are collected automatically for all tRPC procedures
- No code changes required for basic request metrics
- Business metrics added where relevant in application logic

### Type Safety
- Full TypeScript support
- Compile-time validation of metric names and labels
- IDE autocomplete for metric methods

### Production Ready
- Follows Prometheus best practices
- Efficient metric collection
- Proper cleanup and resource management
- Comprehensive error handling