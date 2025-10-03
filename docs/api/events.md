# Event Management

## Overview

Events are the core entity of the ticketing system. Each event must be associated with a venue and exactly 2 teams. Events automatically deactivate 5 minutes after their start time.

**Prerequisites**: [Venue Creation](venues-seats.md), [Admin Authentication](authentication.md)  
**Related**: [Ticket Operations](tickets.md), [Real-time Updates](../architecture/real-time.md), [Analytics](analytics.md)

## Event Operations

### Create Event

```typescript
// tRPC Mutation - Requires Admin Authentication
event.createEvent
Headers: { Authorization: "Bearer <admin-token>" }
{
  "name": "Concert 2024",
  "description": "Amazing live performance",
  "venueId": "990e8400-e29b-41d4-a716-446655440004",
  "startsAt": "2024-12-25T19:00:00Z",
  "teams": [
    {
      "name": "Team Alpha",
      "description": "First team",
      "logoUrl": "https://example.com/logo1.png"
    },
    {
      "name": "Team Beta", 
      "description": "Second team",
      "logoUrl": "https://example.com/logo2.png"
    }
  ]
}

// Success Response:
{
  "success": true,
  "message": "Event created successfully",
  "event": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "name": "Concert 2024",
    "description": "Amazing live performance",
    "venueId": "990e8400-e29b-41d4-a716-446655440004",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z",
    "startsAt": "2024-12-25T19:00:00.000Z",
    "active": true
  }
}

// Note: Must provide exactly 2 teams
// Event seats are created separately via seat router
```

**Validation Rules:**
- Event name: Required, string
- Description: Required, string
- Venue ID: Must reference existing venue
- Start time: Must be in the future
- Teams: Exactly 2 teams required

### Get Active Events

```typescript
// tRPC Query - Requires Dev Authentication
event.getEvents
Headers: { Authorization: "Bearer <dev-token>" }

// Success Response:
{
  "success": true,
  "message": "Events retrieved successfully (active only)",
  "events": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "name": "Concert 2024",
      "description": "Amazing live performance",
      "venueId": "990e8400-e29b-41d4-a716-446655440004",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z",
      "startsAt": "2024-12-25T19:00:00.000Z",
      "active": true,
      "venue": {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "name": "Main Arena",
        "description": "Large concert venue",
        "location": "-1.9441,30.0619",
        "sections": [
          {
            "id": "bb0e8400-e29b-41d4-a716-446655440006",
            "name": "Section A",
            "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2489.97707 2079.993076 L 2489.97707 2232.146287 L 2415.080682 2307.042675 L 2345.144747 2237.10674 L 2357.542755 2224.709773 L 2282.919286 2150.086304 L 2296.582929 2136.421619 L 2263.65456 2103.493251 L 2263.65456 2080.675373 Z M 2489.97707 2079.993076 ' transform='matrix(-3.749972,0.000000000000000459,-0.000000000000000459,-3.749972,13324.669065,14137.767822)'"
          }
        ]
      },
      "teams": [
        {
          "id": "cc0e8400-e29b-41d4-a716-446655440007",
          "name": "Team Alpha",
          "description": "First team",
          "logoUrl": "https://example.com/logo1.png",
          "eventId": "aa0e8400-e29b-41d4-a716-446655440005"
        },
        {
          "id": "dd0e8400-e29b-41d4-a716-446655440008",
          "name": "Team Beta",
          "description": "Second team",
          "logoUrl": "https://example.com/logo2.png",
          "eventId": "aa0e8400-e29b-41d4-a716-446655440005"
        }
      ]
    }
  ]
}

// Empty Response:
{
  "success": true,
  "message": "No events found",
  "events": []
}
```

### Get All Events (Admin)

```typescript
// tRPC Query - Requires Admin Authentication
event.getAllEvents
Headers: { Authorization: "Bearer <admin-token>" }

// Success Response:
{
  "success": true,
  "message": "Events retrieved successfully",
  "events": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "name": "Concert 2024",
      "description": "Amazing live performance",
      "venueId": "990e8400-e29b-41d4-a716-446655440004",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z",
      "startsAt": "2024-12-25T19:00:00.000Z",
      "active": true
    },
    {
      "id": "ee0e8400-e29b-41d4-a716-446655440009",
      "name": "Past Event",
      "description": "Event that has ended",
      "venueId": "990e8400-e29b-41d4-a716-446655440004",
      "createdAt": "2024-12-20T19:00:00.000Z",
      "updatedAt": "2024-12-20T19:05:00.000Z",
      "startsAt": "2024-12-20T19:00:00.000Z",
      "active": false
    }
  ]
}

// Returns both active and inactive events
```

### Get Event Details

```typescript
// tRPC Mutation - Requires Dev Authentication
event.getEvent
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005"
}

// Success Response:
{
  "success": true,
  "message": "Event retrieved successfully",
  "event": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "name": "Concert 2024",
    "description": "Amazing live performance",
    "startsAt": "2024-12-25T19:00:00Z",
    "active": true,
    "venue": {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "name": "Main Arena",
      "sections": [
        {
          "id": "bb0e8400-e29b-41d4-a716-446655440006",
          "name": "Section A"
        }
      ]
    },
    "teams": [
      {
        "id": "cc0e8400-e29b-41d4-a716-446655440007",
        "name": "Team Alpha"
      },
      {
        "id": "dd0e8400-e29b-41d4-a716-446655440008", 
        "name": "Team Beta"
      }
    ]
  }
}

// Event Not Found Response:
{
  "success": true,
  "message": "Event not found",
  "event": null
}
```

### Update Event

```typescript
// tRPC Mutation - Requires Dev Authentication
event.updateEvent
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "name": "Updated Event Name", // optional
  "description": "New description", // optional
  "startsAt": "2024-12-26T19:00:00Z", // optional
  "teams": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440007",
      "name": "Updated Team Name", // optional
      "description": "Updated description", // optional
      "logoUrl": "https://example.com/new-logo.png" // optional
    }
  ]
}

// Success Response:
{
  "success": true,
  "message": "Event updated successfully",
  "event": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "name": "Updated Event Name",
    "description": "New description",
    "startsAt": "2024-12-26T19:00:00Z",
    "updatedAt": "2024-12-25T20:00:00.000Z"
  }
}
```

### Cancel Event

```typescript
// tRPC Mutation - Requires Admin Authentication
event.cancelEvent
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005"
}

// Success Response:
{
  "success": true,
  "message": "Event cancelled successfully",
  "event": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "active": false,
    "updatedAt": "2024-12-25T20:00:00.000Z"
  }
}

// Sets event.active = false
// Existing tickets remain valid but no new tickets can be created
```

## Event Lifecycle

### Automatic Deactivation

Events are automatically deactivated by a cron job 5 minutes after their start time:

```
Event Start Time: 2024-12-25T19:00:00Z
Auto-deactivation: 2024-12-25T19:05:00Z
```

**Cron Job Behavior:**
- Runs every 1-5 minutes (adaptive based on event proximity)
- Updates `active` field to `false` for events past their start time + 5 minutes
- Logs deactivation events for monitoring
- Tracked in Prometheus metrics (`events_deactivated_total`)

### Event States

**Active Event:**
- `active: true`
- Accepts new ticket purchases
- Visible in public event listings
- SSE connections allowed for real-time updates

**Inactive Event:**
- `active: false`
- No new ticket purchases allowed
- Not visible in public listings (admin can still see all)
- Existing tickets remain valid
- SSE connections may be maintained for existing tickets

## Business Rules

### Team Requirements

- **Exactly 2 teams** must be provided when creating an event
- Teams can be existing (referenced by name) or new (created automatically)
- Team names must be unique within the system
- Teams are linked to the event via `eventId`

### Venue Association

- Event must reference an existing venue
- Venue must have seat sections defined
- Event seats are created separately after event creation
- Venue cannot be changed after event creation

### Timing Rules

- Event start time must be in the future when creating
- Events automatically deactivate 5 minutes after start time
- No new tickets can be created for inactive events
- Existing tickets remain valid regardless of event status

### Capacity Management

- Event capacity determined by venue seat configuration
- Real-time seat availability via SSE
- Automatic seat reservation/release based on ticket lifecycle
- No overbooking protection built into event creation

## Integration Examples

### Event Creation Flow

```javascript
// 1. Create event
const eventResponse = await fetch('/trpc/event.createEvent', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <admin-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Concert 2024',
    description: 'Amazing live performance',
    venueId: 'venue-uuid',
    startsAt: '2024-12-25T19:00:00Z',
    teams: [
      {
        name: 'Team Alpha',
        description: 'First team',
        logoUrl: 'https://example.com/logo1.png'
      },
      {
        name: 'Team Beta',
        description: 'Second team', 
        logoUrl: 'https://example.com/logo2.png'
      }
    ]
  })
});

// 2. Create event seats (separate API call)
const seatsResponse = await fetch('/trpc/seat.createEventSeats', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <admin-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventId: eventData.event.id,
    seats: [
      {
        seatId: 'seat-uuid-1',
        price: 50000,
        category: 'VIP'
      }
    ]
  })
});
```

### Event Listing with Real-time Updates

```javascript
// Get active events
const eventsResponse = await fetch('/trpc/event.getEvents', {
  headers: { 'Authorization': 'Bearer <dev-token>' }
});

const events = await eventsResponse.json();

// Connect to SSE for real-time seat updates
events.events.forEach(event => {
  const eventSource = new EventSource(
    `/events/${event.id}/seats/stream`,
    {
      headers: { 'Authorization': 'Bearer <dev-token>' }
    }
  );

  eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'seatingPlan') {
      updateEventSeating(data.eventId, data.data);
    }
  };
});
```

## Error Handling

### Common Errors

**Event Creation:**
- Invalid venue ID
- Start time in the past
- Wrong number of teams (not exactly 2)
- Missing required fields

**Event Retrieval:**
- Event not found
- Invalid authentication
- Insufficient permissions

**Event Updates:**
- Event not found
- Cannot update past events
- Invalid field values

### Error Response Format

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Detailed error description"
}
```

## Monitoring

### Metrics Tracked

- Event creation rate
- Event deactivation by cron job
- Event retrieval requests
- SSE connections per event
- Event update operations

### Logging

All event operations are logged with:
- Operation type (create/update/retrieve/deactivate)
- Event ID and name
- User information
- Success/failure status
- Performance metrics