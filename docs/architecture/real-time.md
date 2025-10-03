# Real-time Architecture

## Server-Sent Events (SSE) Implementation

The APR Ticketing System uses Server-Sent Events to provide real-time seat availability updates to connected clients. This ensures users see live seat availability changes as tickets are purchased or released.

## SSE Manager

### Connection Management
- Automatic connection management and cleanup
- Efficient broadcasting to connected clients per event
- Connection tracking with user attribution
- Automatic dead connection detection and removal

### Message Types

#### Seating Plan Updates
Complete seating plan broadcasts when multiple seats change:
```json
{
  "type": "seatingPlan",
  "eventId": "event-uuid",
  "data": {
    "seat-id-1": {
      "isAvailable": true,
      "price": 50000,
      "label": "A1-1",
      "category": "VIP",
      "section": {
        "id": "section-uuid",
        "name": "Section A",
        "svgPathData": "..."
      }
    }
  },
  "timestamp": 1703539200000
}
```

#### Individual Seat Updates
Efficient updates for single seat changes:
```json
{
  "type": "seatUpdate",
  "eventId": "event-uuid",
  "data": {
    "seatId": "seat-uuid",
    "isAvailable": false,
    "price": 50000,
    "label": "A1-1"
  },
  "timestamp": 1703539200000
}
```

#### Keepalive Messages
Periodic keepalive to maintain connections:
```json
{
  "type": "keepalive",
  "timestamp": 1703539200000
}
```

## SSE Endpoints

### Stream Connection
```
GET /events/{eventId}/seats/stream
Authorization: Bearer <token>
```

**Response Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
```

### Connection Statistics
```
GET /sse/stats
Authorization: Bearer <token>
```

Returns connection statistics for monitoring:
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

## Authentication

SSE connections require valid authentication:
- Bearer token in Authorization header
- Same authentication as tRPC endpoints
- Connection attributed to authenticated user
- Automatic cleanup on authentication failure

## Connection Lifecycle

### Establishment
1. Client connects to `/events/{eventId}/seats/stream`
2. Authentication middleware validates token
3. Event existence and active status verified
4. Initial seating plan sent immediately
5. Connection added to SSE manager
6. Keepalive timer started

### Maintenance
- Keepalive messages every 5 minutes
- Automatic dead connection detection
- Connection cleanup on client disconnect
- Error handling and logging

### Cleanup
- Automatic cleanup on connection close
- Dead connection removal during broadcasts
- Periodic stale connection cleanup (every 10 minutes)
- Proper resource cleanup and logging

## Broadcasting Strategy

### Seat Availability Changes
When tickets are created, cancelled, or expire:
1. Database transaction updates seat availability
2. SSE manager broadcasts to all event connections
3. Dead connections automatically removed
4. Metrics tracked for monitoring

### Efficient Updates
- Batch updates for multiple seat changes
- Individual seat updates for single changes
- Minimal payload size for performance
- Structured data format for easy parsing

## Performance Considerations

### Connection Limits
- No hard connection limits implemented
- Monitoring via Prometheus metrics
- Automatic cleanup prevents memory leaks
- Efficient message broadcasting

### Memory Management
- Connection objects stored in Map structures
- Automatic cleanup of empty event sets
- Periodic stale connection removal
- Proper event listener cleanup

### Network Efficiency
- Keepalive every 5 minutes (before 30min timeout)
- Minimal message payloads
- Efficient JSON serialization
- Proper HTTP headers for caching

## Monitoring

### Prometheus Metrics
- `sse_active_connections` - Active connections per event
- `sse_messages_sent_total` - Messages sent by event and type
- Connection establishment and cleanup logging
- Error tracking and alerting

### Health Monitoring
- Connection statistics endpoint
- Structured logging for all SSE events
- Dead connection detection and removal
- Performance metrics collection

## Error Handling

### Connection Errors
- Graceful handling of client disconnects
- Automatic cleanup on write errors
- Proper error logging without sensitive data
- Fallback mechanisms for failed broadcasts

### Authentication Errors
- Proper 401/403 responses for invalid tokens
- Connection rejection for inactive events
- Audit logging for security events
- Rate limiting integration

## Client Implementation

### JavaScript Example
```javascript
const eventSource = new EventSource('/events/event-id/seats/stream', {
  headers: {
    'Authorization': 'Bearer your-token'
  }
});

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'seatingPlan':
      updateFullSeatingPlan(data.data);
      break;
    case 'seatUpdate':
      updateSingleSeat(data.data);
      break;
    case 'keepalive':
      console.log('Connection alive');
      break;
  }
};

eventSource.onerror = function(event) {
  console.error('SSE connection error:', event);
};
```

### Connection Management
- Implement reconnection logic for dropped connections
- Handle authentication token expiration
- Graceful degradation when SSE unavailable
- Proper cleanup on page unload