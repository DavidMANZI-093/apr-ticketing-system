# Ticket Operations

## Overview

The ticket system supports multiple ticket types with a comprehensive lifecycle management system. All tickets have a 15-minute expiration window and support real-time seat updates via SSE.

## Ticket Types & Lifecycle

```
Ticket Types: 
- SINGLE: Single ticket (1 person)
- GROUP: Group ticket (3-5 people total: main user + 2-4 additional)
- FAMILY: Family ticket (3-7 people total: main user + 2-6 additional)  
- GIFT: Gift ticket (1 person, purchased for another user)

States: PENDING (15min expiry) → PAID → USED
                              ↓
                          CANCELLED → REFUNDED

User Limits: Maximum 14 tickets per user
Expiration: All tickets expire 15 minutes after creation if not paid
```

## Ticket Creation

### Create Single Ticket
```typescript
// tRPC Mutation - Requires Dev Authentication
ticket.createTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
  "userId": "110e8400-e29b-41d4-a716-44665544000b",
  "seatId": "220e8400-e29b-41d4-a716-44665544000c"
}

// Success Response:
{
  "success": true,
  "message": "Ticket created successfully",
  "ticket": {
    "id": "330e8400-e29b-41d4-a716-44665544000d",
    "userId": "110e8400-e29b-41d4-a716-44665544000b",
    "bearer": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+250788123456"
    },
    "orderId": null,
    "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
    "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
    "seatId": "220e8400-e29b-41d4-a716-44665544000c",
    "type": "SINGLE",
    "state": "PENDING",
    "expiresAt": "2024-12-25T19:15:00.000Z",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}
```

### Create Gift Ticket
```typescript
// tRPC Mutation - Requires Dev Authentication
ticket.createGiftTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
  "userId": "110e8400-e29b-41d4-a716-44665544000b",
  "seatId": "220e8400-e29b-41d4-a716-44665544000c",
  "bearer": "recipient@example.com"
}

// Success Response:
{
  "success": true,
  "message": "Ticket created successfully",
  "ticket": {
    "id": "330e8400-e29b-41d4-a716-44665544000d",
    "userId": "110e8400-e29b-41d4-a716-44665544000b",
    "bearer": {
      "name": "Jane Smith",
      "email": "recipient@example.com",
      "phone": "+250788654321"
    },
    "orderId": null,
    "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
    "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
    "seatId": "220e8400-e29b-41d4-a716-44665544000c",
    "type": "GIFT",
    "state": "PENDING",
    "expiresAt": "2024-12-25T19:15:00.000Z",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}
```

### Create Group Ticket
```typescript
// tRPC Mutation - Requires Dev Authentication
ticket.createGroupTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
  "userId": "110e8400-e29b-41d4-a716-44665544000b",
  "seatId": "220e8400-e29b-41d4-a716-44665544000c",
  "group": [
    {
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "seatId": "440e8400-e29b-41d4-a716-44665544000e",
      "bearer": {
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "phone": "+250788654321"
      }
    },
    {
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "seatId": "550e8400-e29b-41d4-a716-44665544000f",
      "bearer": {
        "name": "Bob Johnson",
        "email": "bob.johnson@example.com",
        "phone": "+250788987654"
      }
    }
  ]
}

// Success Response:
{
  "success": true,
  "message": "Tickets created successfully",
  "tickets": [
    {
      "id": "330e8400-e29b-41d4-a716-44665544000d",
      "userId": "110e8400-e29b-41d4-a716-44665544000b",
      "bearer": {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+250788123456"
      },
      "type": "GROUP",
      "state": "PENDING"
    },
    {
      "id": "660e8400-e29b-41d4-a716-44665544001e",
      "userId": "110e8400-e29b-41d4-a716-44665544000b",
      "bearer": {
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "phone": "+250788654321"
      },
      "type": "GROUP",
      "state": "PENDING"
    }
  ]
}

// Creates tickets for main user + group members (2-4 additional people)
// All tickets linked to same user but different bearers
```

### Create Family Ticket
```typescript
// tRPC Mutation - Requires Dev Authentication
ticket.createFamilyTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
  "userId": "110e8400-e29b-41d4-a716-44665544000b",
  "seatId": "220e8400-e29b-41d4-a716-44665544000c",
  "family": [
    {
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "seatId": "440e8400-e29b-41d4-a716-44665544000e",
      "bearer": {
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "phone": "+250788654321"
      }
    },
    {
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "seatId": "550e8400-e29b-41d4-a716-44665544000f",
      "bearer": {
        "name": "Little Doe",
        "email": "little.doe@example.com",
        "phone": "+250788987654"
      }
    }
  ]
}

// Similar to group tickets but for families (2-6 additional people)
// Type will be "FAMILY" instead of "GROUP"
```

## Ticket Retrieval

### Get All Tickets (Admin)
```typescript
// tRPC Query - Requires Admin Authentication
ticket.getTickets
Headers: { Authorization: "Bearer <admin-token>" }

// Returns all tickets in the system
```

### Get Ticket by ID (Admin)
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.getTicket
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "330e8400-e29b-41d4-a716-44665544000d"
}

// Success Response:
{
  "success": true,
  "message": "Ticket retrieved successfully",
  "ticket": {
    "id": "330e8400-e29b-41d4-a716-44665544000d",
    "userId": "110e8400-e29b-41d4-a716-44665544000b",
    "bearer": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+250788123456"
    },
    "orderId": null,
    "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
    "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
    "seatId": "220e8400-e29b-41d4-a716-44665544000c",
    "type": "SINGLE",
    "state": "PENDING",
    "expiresAt": "2024-12-25T19:15:00.000Z",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}
```

### Get User's Tickets
```typescript
// tRPC Mutation - Requires Dev Authentication
ticket.getUserTickets
Headers: { Authorization: "Bearer <dev-token>" }
{
  "userId": "110e8400-e29b-41d4-a716-44665544000b"
}

// Returns tickets where user is owner OR bearer (gift tickets)
// Only returns PAID and PENDING tickets
```

### Get Tickets by Event (Admin)
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.getTicketsByEvent
Headers: { Authorization: "Bearer <admin-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005"
}
```

### Get Tickets by Team (Admin)
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.getTicketsByTeam
Headers: { Authorization: "Bearer <admin-token>" }
{
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007"
}
```

### Get Tickets by State (Admin)
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.getTicketByState
Headers: { Authorization: "Bearer <admin-token>" }
{
  "state": "PENDING" // PENDING | PAID | CANCELLED | USED
}
```

## Payment Processing

### Place Payment Order
```typescript
// tRPC Mutation - Requires Dev Authentication
ticket.placePaymentOrder
Headers: { Authorization: "Bearer <dev-token>" }
{
  "userId": "110e8400-e29b-41d4-a716-44665544000b",
  "tickets": [
    { "id": "330e8400-e29b-41d4-a716-44665544000d" },
    { "id": "550e8400-e29b-41d4-a716-44665544000f" }
  ]
}

// Success Response (Payment Success - 70% probability):
{
  "success": true,
  "message": "Order placed and tickets paid successfully",
  "order": {
    "id": "660e8400-e29b-41d4-a716-44665544001e",
    "userId": "110e8400-e29b-41d4-a716-44665544000b",
    "status": "PAID",
    "total": null,
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z",
    "tickets": [
      {
        "id": "330e8400-e29b-41d4-a716-44665544000d",
        "state": "PAID"
      },
      {
        "id": "550e8400-e29b-41d4-a716-44665544000f", 
        "state": "PAID"
      }
    ]
  }
}

// Insufficient Funds Response (30% probability):
{
  "success": true,
  "message": "Insufficient funds",
  "order": {
    "id": "660e8400-e29b-41d4-a716-44665544001e",
    "userId": "110e8400-e29b-41d4-a716-44665544000b",
    "status": "PENDING",
    "total": null,
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}

// Mock Payment Simulation:
// - 70% success rate: tickets automatically marked as PAID, order status updated
// - 30% insufficient funds: order remains PENDING, tickets stay PENDING
// - Links tickets to order via connect relationship
```

## Ticket Management

### Cancel Ticket (Admin)
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.cancelTicket
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "330e8400-e29b-41d4-a716-44665544000d"
}

// Success Response:
{
  "success": true,
  "message": "Ticket cancelled successfully",
  "ticket": {
    "id": "330e8400-e29b-41d4-a716-44665544000d",
    "state": "CANCELLED",
    "updatedAt": "2024-12-25T19:10:00.000Z"
  }
}

// Releases seat and broadcasts SSE update
```

### Validate Ticket (Admin)
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.validateTicket
Headers: { Authorization: "Bearer <admin-token>" }
{
  "ticketId": "330e8400-e29b-41d4-a716-44665544000d"
}

// Success Response:
{
  "success": true,
  "message": "Ticket validated successfully",
  "ticket": {
    "id": "330e8400-e29b-41d4-a716-44665544000d",
    "state": "USED",
    "validatedAt": "2024-12-25T20:00:00.000Z"
  }
}

// Validates HMAC signature and marks PAID ticket as USED
// Returns ticket details with event and seat information
// One-time use validation (PAID → USED state transition)
```

## Business Rules

### Ticket Limits
- Maximum 14 tickets per user across all events
- Group tickets: 3-5 people total (main user + 2-4 additional)
- Family tickets: 3-7 people total (main user + 2-6 additional)

### Expiration Rules
- All tickets expire 15 minutes after creation if not paid
- Expired tickets are automatically cancelled by cron job
- Seats are released when tickets expire or are cancelled

### Seat Management
- Seats are marked unavailable when tickets are created
- Seats are released when tickets are cancelled or expire
- Real-time updates via SSE for seat availability changes

### Payment Rules
- Mock payment simulation with 70% success rate
- Orders link multiple tickets for batch payment
- Automatic state transitions on successful payment
- Failed payments leave tickets in PENDING state

## Error Handling

### Common Errors
- **Seat already booked**: Another ticket exists for the same seat/event
- **User limit exceeded**: User has reached 14 ticket limit
- **Event not found**: Invalid event ID
- **Ticket expired**: Ticket has passed 15-minute expiration
- **Invalid state transition**: Attempting invalid state change

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```