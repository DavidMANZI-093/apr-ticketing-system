# Analytics

## Overview

The analytics system provides revenue tracking for events. Currently, only event-level revenue analytics are implemented. All analytics endpoints require Dev authentication.

**Prerequisites**: [Dev Authentication](authentication.md)  
**Related**: [Event Management](events.md), [Ticket Operations](tickets.md)

## Revenue Analytics

### Get Event Revenue

```typescript
// tRPC Mutation - Requires Dev Authentication
analytics.getEventRevenue
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005"
}

// Success Response:
{
  "success": true,
  "message": "Event revenue retrieved successfully",
  "revenue": 2500000,
  "ticketCount": 50
}

// Event Not Found Response:
{
  "success": false,
  "message": "Event not found",
  "revenue": 0
}
```

**Revenue Calculation:**
- Only includes tickets in PAID or USED states
- Excludes PENDING, CANCELLED, and REFUNDED tickets
- Based on seat pricing from event seats configuration
- Calculated in real-time from current ticket states

## Future Analytics Features

The following analytics features are planned for future implementation:

### Planned Features
- Total system revenue tracking
- Revenue by date range
- Team performance analytics
- Ticket statistics and conversion rates
- Seat category performance analysis
- Payment statistics and trends
- Real-time event analytics
- Analytics dashboard
- Export and reporting capabilities
- Key performance indicators (KPIs)

### Current Limitations
- Only event-level revenue is currently available
- No historical data aggregation
- No comparative analytics between events or teams
- No export functionality

## Integration Examples

### Event Revenue Tracking

```javascript
// Track revenue for specific event
async function trackEventRevenue(eventId) {
  const response = await fetch('/trpc/analytics.getEventRevenue', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <dev-token>',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ eventId })
  });

  const data = await response.json();
  
  if (data.success) {
    return {
      revenue: data.revenue,
      ticketCount: data.ticketCount
    };
  }
}

// Example usage
const eventRevenue = await trackEventRevenue('event-uuid');
console.log(`Event generated ${eventRevenue.revenue} RWF from ${eventRevenue.ticketCount} tickets`);
```

## Error Handling

### Common Errors

**Data Retrieval:**
- Event not found
- Invalid event ID format
- No tickets found for event

**Authentication:**
- Invalid or expired token
- Insufficient permissions
- Rate limit exceeded

### Error Response Format

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Detailed error description"
}
```

## Performance Considerations

### Current Implementation
- Revenue calculations are performed in real-time
- Single database query per request
- Efficient aggregation using database-level operations
- No caching implemented (suitable for real-time accuracy)

### Monitoring
Analytics operations are tracked in Prometheus metrics:
- Query execution times
- Success/failure rates
- API endpoint usage patterns