# Team Management

## Overview

Teams are associated with events and tickets. Each event must have exactly 2 teams, and tickets are linked to specific teams. The team system supports basic CRUD operations for managing team information.

**Prerequisites**: [Dev Authentication](authentication.md)  
**Related**: [Event Management](events.md), [Ticket Operations](tickets.md)

## Team Operations

### Get All Teams

```typescript
// tRPC Query - Requires Dev Authentication
team.getTeams
Headers: { Authorization: "Bearer <dev-token>" }

// Success Response:
{
  "success": true,
  "message": "Teams retrieved successfully",
  "teams": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440007",
      "name": "Team Alpha",
      "description": "First team description",
      "logoUrl": "https://example.com/logo1.png",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    },
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440008",
      "name": "Team Beta",
      "description": "Second team description",
      "logoUrl": "https://example.com/logo2.png",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    }
  ]
}

// Empty Response:
{
  "success": true,
  "message": "No teams found",
  "teams": []
}
```

### Get Team Details

```typescript
// tRPC Mutation - Requires Dev Authentication
team.getTeam
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "cc0e8400-e29b-41d4-a716-446655440007"
}

// Success Response:
{
  "success": true,
  "message": "Team retrieved successfully",
  "team": {
    "id": "cc0e8400-e29b-41d4-a716-446655440007",
    "name": "Team Alpha",
    "description": "First team description",
    "logoUrl": "https://example.com/logo1.png",
    "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}

// Team Not Found Response:
{
  "success": true,
  "message": "Team not found",
  "team": null
}
```

### Update Team

```typescript
// tRPC Mutation - Requires Dev Authentication
team.updateTeam
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "cc0e8400-e29b-41d4-a716-446655440007",
  "name": "Updated Team Name",
  "description": "Updated team description",
  "logoUrl": "https://example.com/new-logo.png"
}

// Success Response:
{
  "success": true,
  "message": "Team updated successfully",
  "team": {
    "id": "cc0e8400-e29b-41d4-a716-446655440007",
    "name": "Updated Team Name",
    "description": "Updated team description",
    "logoUrl": "https://example.com/new-logo.png",
    "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T20:00:00.000Z"
  }
}

// Note: All fields are required for updates
```

## Team Creation

Teams are not created directly through the team router. Instead, they are created automatically when creating events:

```typescript
// Teams are created via event creation
event.createEvent
{
  "name": "Concert 2024",
  "description": "Amazing live performance",
  "venueId": "venue-uuid",
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
```

**Team Creation Behavior:**
- Teams are created using `connectOrCreate` logic
- If a team with the same name exists, it will be linked to the event
- If no team exists with that name, a new team is created
- Each team is automatically linked to the event via `eventId`

## Team-Event Relationship

### Event Requirements

- **Exactly 2 teams** must be associated with each event
- Teams are linked to events via `eventId` field
- Teams cannot exist without being associated with an event
- Multiple events can share the same teams

### Team Reuse

Teams can be reused across multiple events:

```typescript
// Event 1 creates teams
event.createEvent({
  teams: [
    { name: "Team Alpha", description: "...", logoUrl: "..." },
    { name: "Team Beta", description: "...", logoUrl: "..." }
  ]
})

// Event 2 can reuse existing teams
event.createEvent({
  teams: [
    { name: "Team Alpha", description: "...", logoUrl: "..." }, // Existing team
    { name: "Team Gamma", description: "...", logoUrl: "..." }  // New team
  ]
})
```

## Team-Ticket Relationship

### Ticket Assignment

Every ticket must be assigned to a team:

```typescript
// Single ticket creation
ticket.createTicket({
  "eventId": "event-uuid",
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007", // Required
  "userId": "user-uuid",
  "seatId": "seat-uuid"
})

// Group ticket creation
ticket.createGroupTicket({
  "eventId": "event-uuid",
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007", // Main user's team
  "userId": "user-uuid",
  "seatId": "seat-uuid",
  "group": [
    {
      "teamId": "dd0e8400-e29b-41d4-a716-446655440008", // Can be different team
      "seatId": "other-seat-uuid",
      "bearer": { ... }
    }
  ]
})
```

### Team Statistics

Teams can be used for analytics and reporting:

```typescript
// Get tickets by team (Admin only)
ticket.getTicketsByTeam({
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007"
})

// Useful for:
// - Team-based revenue analysis
// - Fan distribution statistics
// - Seating arrangement planning
```

## Use Cases

### Event Setup Flow

```javascript
// 1. Create event with teams
const eventResponse = await fetch('/trpc/event.createEvent', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <admin-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Championship Match',
    description: 'Final championship game',
    venueId: 'venue-uuid',
    startsAt: '2024-12-25T19:00:00Z',
    teams: [
      {
        name: 'Lions FC',
        description: 'Home team',
        logoUrl: 'https://example.com/lions-logo.png'
      },
      {
        name: 'Eagles United',
        description: 'Away team',
        logoUrl: 'https://example.com/eagles-logo.png'
      }
    ]
  })
});

// 2. Teams are now available for ticket creation
const eventData = await eventResponse.json();
const teams = eventData.event.teams;
```

### Team Information Display

```javascript
// Get all teams for display
const teamsResponse = await fetch('/trpc/team.getTeams', {
  headers: { 'Authorization': 'Bearer <dev-token>' }
});

const teams = await teamsResponse.json();

// Display team selection in UI
teams.teams.forEach(team => {
  console.log(`${team.name}: ${team.description}`);
  console.log(`Logo: ${team.logoUrl}`);
});
```

### Team Updates

```javascript
// Update team information
const updateResponse = await fetch('/trpc/team.updateTeam', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <dev-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 'team-uuid',
    name: 'Updated Team Name',
    description: 'New team description',
    logoUrl: 'https://example.com/new-logo.png'
  })
});
```

## Business Rules

### Team Naming

- Team names must be unique across the system
- Team names are used for `connectOrCreate` logic during event creation
- Changing a team name affects all future event associations
- Existing event associations remain unchanged

### Team Lifecycle

- Teams are created automatically during event creation
- Teams persist beyond individual events
- Teams can be reused across multiple events
- Teams cannot be deleted (only updated)

### Logo Management

- Logo URLs should be publicly accessible
- Recommended image formats: PNG, JPG, SVG
- Recommended dimensions: Square aspect ratio (e.g., 200x200px)
- No file size validation is performed server-side

### Event Association

- Teams are linked to events via `eventId`
- One team can be associated with multiple events
- Teams cannot exist without an event association
- Team-event relationships are established during event creation

## Integration Examples

### Team Selection Component

```javascript
// React component for team selection
function TeamSelector({ onTeamSelect, selectedTeamId }) {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetch('/trpc/team.getTeams', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        setTeams(data.teams);
      }
    });
  }, []);

  return (
    <div className="team-selector">
      {teams.map(team => (
        <div 
          key={team.id}
          className={`team-option ${selectedTeamId === team.id ? 'selected' : ''}`}
          onClick={() => onTeamSelect(team.id)}
        >
          <img src={team.logoUrl} alt={team.name} />
          <h3>{team.name}</h3>
          <p>{team.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Team Statistics Dashboard

```javascript
// Get team-specific statistics
async function getTeamStats(teamId) {
  const ticketsResponse = await fetch('/trpc/ticket.getTicketsByTeam', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <admin-token>',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ teamId })
  });

  const ticketsData = await ticketsResponse.json();
  
  if (ticketsData.success) {
    const stats = {
      totalTickets: ticketsData.tickets.length,
      paidTickets: ticketsData.tickets.filter(t => t.state === 'PAID').length,
      pendingTickets: ticketsData.tickets.filter(t => t.state === 'PENDING').length,
      revenue: ticketsData.tickets
        .filter(t => t.state === 'PAID')
        .reduce((sum, ticket) => sum + (ticket.seat?.price || 0), 0)
    };
    
    return stats;
  }
}
```

## Error Handling

### Common Errors

**Team Retrieval:**
- Invalid team ID
- Team not found
- Authentication failure

**Team Updates:**
- Team not found
- Missing required fields (all fields required for updates)
- Invalid logo URL format

**Team Creation (via Events):**
- Duplicate team names in same event
- Missing team information
- Invalid team data format

### Error Response Format

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Detailed error description"
}
```

### Validation Rules

**Team Name:**
- Required field
- String type
- Must be unique across system

**Description:**
- Required field
- String type
- No length restrictions

**Logo URL:**
- Required field
- Must be valid URL format
- Should be publicly accessible

## Best Practices

### Team Management

- Use descriptive team names that are unlikely to conflict
- Provide high-quality logo images for better user experience
- Keep team descriptions concise but informative
- Update team information when branding changes

### Performance Considerations

- Team data is relatively static, consider caching
- Logo images should be optimized for web display
- Use CDN for logo hosting when possible
- Batch team operations when creating multiple events

### Security Considerations

- Validate logo URLs to prevent malicious content
- Ensure logo hosting is secure (HTTPS)
- Consider image size limits for performance
- Implement proper authentication for team updates