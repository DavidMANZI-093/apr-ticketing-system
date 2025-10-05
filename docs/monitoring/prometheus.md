# Prometheus Setup Guide

## Prometheus Configuration

### Basic Configuration

**Important**: Metrics endpoint now requires Alpha authentication.

Create a `prometheus.yml` file:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'apr-ticketing-system'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    authorization:
      type: Bearer
      credentials: 'your-alpha-token-here'
```

**Getting Alpha Token:**
```bash
# Get Alpha token via login
curl -X POST http://localhost:3000/trpc/alpha.login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password","phrase":"your-phrase"}'

# Test metrics access
curl -H "Authorization: Bearer <your-alpha-token>" http://localhost:3000/metrics
```

### Docker Compose Setup

```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

## Alerting Rules

Create `alert_rules.yml`:

```yaml
groups:
  - name: apr-ticketing-system
    rules:
      - alert: HighErrorRate
        expr: rate(trpc_requests_total{status="error"}[5m]) / rate(trpc_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.procedure }}"

      - alert: SlowEndpoint
        expr: histogram_quantile(0.95, rate(trpc_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow endpoint detected"
          description: "P95 latency is {{ $value }}s for {{ $labels.procedure }}"

      - alert: HighRateLimitHits
        expr: rate(rate_limit_hits_total[5m]) > 10
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High rate limit hits"
          description: "{{ $labels.role }} role is hitting rate limits frequently"

      - alert: CronJobFailures
        expr: rate(cron_job_executions_total{status="error"}[15m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Cron job failures detected"
          description: "{{ $labels.job_name }} is failing"

      - alert: SSEConnectionDrop
        expr: decrease(sse_active_connections[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Large SSE connection drop"
          description: "{{ $value }} SSE connections dropped for event {{ $labels.event_id }}"

      - alert: PaymentFailureSpike
        expr: rate(payment_attempts_total{status="failure"}[5m]) > rate(payment_attempts_total{status="success"}[5m])
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "Payment failure rate exceeds success rate"
          description: "Payment failures are higher than successes"
```

Update `prometheus.yml` to include alerting:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'apr-ticketing-system'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Grafana Dashboard Queries

### Request Performance Dashboard

#### Request Rate Panel
```promql
sum(rate(trpc_requests_total[5m])) by (procedure)
```

#### Error Rate Panel
```promql
sum(rate(trpc_requests_total{status="error"}[5m])) by (procedure) / sum(rate(trpc_requests_total[5m])) by (procedure)
```

#### Latency Percentiles Panel
```promql
histogram_quantile(0.50, sum(rate(trpc_request_duration_seconds_bucket[5m])) by (le, procedure))
histogram_quantile(0.95, sum(rate(trpc_request_duration_seconds_bucket[5m])) by (le, procedure))
histogram_quantile(0.99, sum(rate(trpc_request_duration_seconds_bucket[5m])) by (le, procedure))
```

#### Active Requests Panel
```promql
sum(trpc_active_requests) by (procedure)
```

### Business Metrics Dashboard

#### Ticket Creation Rate
```promql
rate(tickets_created_total{status="success"}[5m])
```

#### Payment Success Rate
```promql
rate(payment_attempts_total{status="success"}[5m]) / rate(payment_attempts_total[5m])
```

#### Seat Availability Changes
```promql
rate(seat_availability_changes_total[5m])
```

#### SSE Connections
```promql
sum(sse_active_connections) by (event_id)
```

### System Health Dashboard

#### CPU Usage
```promql
rate(process_cpu_user_seconds_total[5m]) + rate(process_cpu_system_seconds_total[5m])
```

#### Memory Usage
```promql
process_resident_memory_bytes / 1024 / 1024
```

#### Event Loop Lag
```promql
nodejs_eventloop_lag_seconds
```

#### Rate Limit Hits
```promql
rate(rate_limit_hits_total[5m])
```

## Alertmanager Configuration

Create `alertmanager.yml`:

```yaml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@yourcompany.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'admin@yourcompany.com'
        subject: 'APR Ticketing System Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

## Production Deployment

### Environment Variables
```bash
# Add to your production environment
PROMETHEUS_ENABLED=true
METRICS_PORT=3000
```

### Security Considerations

#### Metrics Endpoint Security
Metrics are now protected by Alpha authentication, providing several security benefits:

- **Authentication Required**: Only users with valid Alpha tokens can access metrics
- **Audit Trail**: All metrics access is logged and tracked
- **Rate Limiting**: Alpha procedures can be rate-limited if needed
- **No Direct Exposure**: Metrics are not exposed via direct HTTP endpoint

#### Alpha Token Management
```bash
# Generate Alpha token via login
curl -X POST http://localhost:3000/trpc/alpha.login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password","phrase":"your-phrase"}'

# Use token for metrics access
export ALPHA_TOKEN="your-alpha-token"
```

#### Network Security
- Use internal networks for Prometheus scraping
- Implement proper firewall rules
- Consider VPN access for monitoring tools

### Performance Tuning

#### Prometheus Configuration
```yaml
global:
  scrape_interval: 15s
  scrape_timeout: 10s
  evaluation_interval: 15s

# Increase retention for production
storage:
  tsdb:
    retention.time: 30d
    retention.size: 10GB
```

#### Application Configuration
```javascript
// Adjust histogram buckets if needed
export const trpcRequestDuration = new client.Histogram({
  name: "trpc_request_duration_seconds",
  help: "Duration of tRPC requests in seconds",
  labelNames: ["procedure", "status", "role"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});
```

## Monitoring Best Practices

### Query Optimization
- Use recording rules for frequently used queries
- Avoid high cardinality labels
- Use appropriate time ranges for queries

### Dashboard Design
- Group related metrics together
- Use consistent time ranges
- Add meaningful descriptions and units
- Implement drill-down capabilities

### Alert Management
- Set appropriate thresholds based on baseline metrics
- Implement alert fatigue prevention
- Use proper severity levels
- Include runbook links in alert descriptions

## Troubleshooting

### Common Issues

#### Metrics Not Appearing
1. Check `/metrics` endpoint accessibility
2. Verify Prometheus scrape configuration
3. Check for TypeScript compilation errors
4. Validate metric names and labels

#### High Memory Usage
1. Review label cardinality
2. Check for metric leaks (gauges not decremented)
3. Reduce histogram bucket count if needed
4. Monitor Prometheus memory usage

#### Missing Data Points
1. Ensure metrics are incremented in all code paths
2. Check for try/catch blocks that skip metrics
3. Verify middleware application to all procedures
4. Review error logs for metric collection failures

### Debug Commands

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Validate Prometheus config
promtool check config prometheus.yml

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Query specific metric
curl 'http://localhost:9090/api/v1/query?query=trpc_requests_total'
```