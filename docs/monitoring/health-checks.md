# Health Checks

## Overview

The APR Ticketing System provides comprehensive health check endpoints for monitoring system status, database connectivity, and application health in production environments.

## Health Endpoints

### Main Health Check

```
GET /health
```

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-25T19:00:00.000Z",
  "uptime": 3600.123,
  "memory": {
    "used": "45MB",
    "total": "128MB"
  },
  "database": "connected",
  "version": "1.0.0"
}
```

**Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-12-25T19:00:00.000Z",
  "error": "Database connection failed"
}
```

**HTTP Status Codes:**
- `200 OK` - System is healthy
- `503 Service Unavailable` - System is unhealthy

### SSE Statistics

```
GET /sse/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "SSE statistics retrieved",
  "stats": {
    "totalConnections": 15,
    "eventsWithConnections": 3,
    "connectionsByEvent": [
      {
        "eventId": "event-1",
        "connections": 8
      },
      {
        "eventId": "event-2",
        "connections": 7
      }
    ]
  }
}
```

## Health Check Components

### Database Connectivity

The health check performs a simple database ping:

```sql
SELECT 1
```

**Status Indicators:**
- `"connected"` - Database is accessible
- `"disconnected"` - Database connection failed

### Memory Usage

Reports current Node.js memory usage:

```javascript
const memoryUsage = process.memoryUsage();
const memory = {
  used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
  total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB"
};
```

### Application Uptime

Reports process uptime in seconds:

```javascript
const uptime = process.uptime(); // seconds since process start
```

### Version Information

Reports application version from package.json:

```javascript
const version = process.env.npm_package_version || "unknown";
```

## Monitoring Integration

### Prometheus Metrics

Health checks integrate with Prometheus metrics:

- Health check requests are tracked in request metrics
- Database connectivity status affects database metrics
- Memory usage is available in default Node.js metrics

### Load Balancer Integration

**AWS Application Load Balancer:**
```yaml
HealthCheckPath: /health
HealthCheckProtocol: HTTP
HealthCheckIntervalSeconds: 30
HealthyThresholdCount: 2
UnhealthyThresholdCount: 3
HealthCheckTimeoutSeconds: 5
```

**Kubernetes Liveness Probe:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Kubernetes Readiness Probe:**
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## Monitoring Best Practices

### Health Check Frequency

**Recommended intervals:**
- Load balancer health checks: 30 seconds
- Kubernetes liveness probes: 10 seconds
- Kubernetes readiness probes: 5 seconds
- External monitoring: 60 seconds

### Alerting Rules

**Prometheus alerting rules:**

```yaml
groups:
  - name: health-checks
    rules:
      - alert: ServiceDown
        expr: up{job="apr-ticketing-system"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "APR Ticketing System is down"
          description: "Service has been down for more than 1 minute"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}MB"

      - alert: DatabaseConnectionFailed
        expr: increase(http_requests_total{endpoint="/health",status="503"}[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "Health check is failing due to database issues"
```

### Uptime Monitoring

**External monitoring services:**
- Pingdom
- UptimeRobot
- StatusCake
- AWS CloudWatch Synthetics

**Configuration example:**
```
URL: https://your-domain.com/health
Method: GET
Expected Status: 200
Check Interval: 60 seconds
Timeout: 10 seconds
```

## Advanced Health Checks

### Custom Health Checks

Extend health checks for specific components:

```javascript
// Custom health check implementation
app.get('/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalAPI: await checkExternalAPI(),
    diskSpace: await checkDiskSpace()
  };

  const allHealthy = Object.values(checks).every(check => check.healthy);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  });
});
```

### Dependency Health Checks

Check external dependencies:

```javascript
async function checkExternalAPI() {
  try {
    const response = await fetch('https://api.external-service.com/health', {
      timeout: 5000
    });
    return {
      healthy: response.ok,
      responseTime: response.headers.get('x-response-time'),
      status: response.status
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}
```

## Troubleshooting

### Common Issues

**Database Connection Failures:**
1. Check DATABASE_URL environment variable
2. Verify database server is running
3. Check network connectivity
4. Verify database credentials
5. Check connection pool limits

**High Memory Usage:**
1. Monitor for memory leaks
2. Check for large object retention
3. Review caching strategies
4. Consider garbage collection tuning

**Slow Health Check Response:**
1. Check database query performance
2. Monitor network latency
3. Review health check timeout settings
4. Consider health check caching

### Debug Commands

```bash
# Test health endpoint
curl -v http://localhost:3000/health

# Check with timeout
curl --max-time 5 http://localhost:3000/health

# Monitor health checks
watch -n 5 'curl -s http://localhost:3000/health | jq'

# Check SSE stats (requires auth)
curl -H "Authorization: Bearer <token>" http://localhost:3000/sse/stats
```

### Health Check Logs

Health checks generate structured logs:

```json
{
  "level": "info",
  "message": "Health check successful",
  "operation": "healthCheck",
  "timestamp": "2024-12-25T19:00:00.000Z",
  "uptime": 3600.123,
  "memory": {
    "used": "45MB",
    "total": "128MB"
  },
  "version": "1.0.0"
}
```

**Failed health check log:**
```json
{
  "level": "error",
  "message": "Health check failed",
  "operation": "healthCheck",
  "timestamp": "2024-12-25T19:00:00.000Z",
  "error": "Database connection failed"
}
```

## Production Considerations

### Security

- Health endpoints don't require authentication (by design)
- Avoid exposing sensitive information in health responses
- Consider rate limiting health check endpoints
- Use internal networks for health checks when possible

### Performance

- Keep health checks lightweight and fast
- Avoid expensive operations in health checks
- Cache health check results if appropriate
- Set reasonable timeouts for dependency checks

### Reliability

- Health checks should be more reliable than the service itself
- Avoid cascading failures in health check dependencies
- Implement circuit breakers for external dependency checks
- Use appropriate retry logic with exponential backoff