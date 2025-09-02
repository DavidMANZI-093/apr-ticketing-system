# APR Ticketing System

A comprehensive event ticketing system built with TypeScript, tRPC, and Prisma. Features secure authentication, QR code generation, real-time seat updates, and comprehensive event management with payment processing integration.

## System Architecture

### Core Technologies
- **Backend**: Node.js + Express + tRPC
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control (Admin, Dev, Alpha)
- **Real-time**: Server-Sent Events (SSE) for live seat updates
- **Security**: Rate limiting, HMAC-signed QR codes, bcrypt password hashing
- **Scheduling**: Dynamic cron jobs with adaptive intervals
- **Payment**: External payment gateway integration with JWT-signed invoices

### Project Structure
```
src/
├── controllers/          # Database and tRPC setup
│   ├── app.ts           # Application configuration
│   ├── prisma.ts        # Prisma client configuration
│   └── trpc.ts          # tRPC context and router setup
├── middleware/          # Authentication and authorization
│   ├── admin-procedure.ts   # Admin-level JWT middleware (100 req/hour)
│   ├── alpha-procedure.ts   # Alpha-level JWT middleware (super admin)
│   ├── dev-procedure.ts     # Developer-level JWT middleware (100 req/hour)
│   └── sse-auth.ts         # SSE authentication middleware
├── routes/              # API endpoint definitions
│   ├── admin-router.ts      # Admin authentication and token management
│   ├── alpha-router.ts      # DEV login and API key management
│   ├── analytics-router.ts  # Revenue and statistics endpoints
│   ├── event-router.ts      # Event CRUD and management
│   ├── seat-router.ts       # Venue and seat management
│   ├── team-router.ts       # Team management
│   ├── ticket-router.ts     # Ticket lifecycle and QR code operations
│   ├── user-router.ts       # User management
│   └── venue-router.ts      # Venue CRUD operations
├── utils/               # Utility functions
│   ├── logger.ts           # Structured logging with context
│   ├── qr-code.ts          # Secure QR code generation
│   ├── rate-limiter.ts     # In-memory rate limiting
│   └── sse-manager.ts      # Server-Sent Events management
├── types/               # TypeScript type definitions
└── server.ts           # Main application entry point with cron jobs
```

## Authentication System

### User Roles
- **ALPHA**: Super admin access via DEV role, can create API keys and manage system
- **ADMIN**: Full system access with dedicated admin router, event and ticket management
- **DEV**: API access with rate limiting (100 requests/hour)

### Authentication Flows

#### Alpha Authentication (DEV Role)
1. Alpha login with username + password + phrase (triple authentication)
2. Manual API key creation for different roles (dev/admin)
3. Long-lived tokens (1 day expiration)

#### Admin Authentication (ADMIN Role)
1. Admin login with username/email + password + phrase
2. Automatic API key creation during login
3. Short-lived tokens (1 hour expiration)
4. Token refresh and logout capabilities

#### General
- JWT token usage with Bearer authentication
- Automatic rate limiting and token validation

### Security Features
- Bcrypt password hashing with salt
- HMAC-SHA256 signed QR codes
- JWT token expiration (1 day for alpha, 1 hour for admin, 15 days for API keys)
- Rate limiting with automatic cleanup (100 requests/hour)
- Role-based endpoint protection
- Separate authentication flows for different user roles

## Core Features

### Event Management
- Create events with venue association and team setup (exactly 2 teams per event)
- Automatic event deactivation 5 minutes after start time
- Real-time seat availability tracking via SSE
- Event seat pricing and category management

### Ticket Types & Lifecycle
```
Ticket Types: SINGLE (1 person) | GROUP (3-5 people) | FAMILY (3-7 people) | GIFT
States: PENDING (15min expiry) → PAID → USED
                              ↓
                          CANCELLED/REFUNDED
```

### QR Code System
- Cryptographically secure QR generation with HMAC-SHA256
- Anti-tampering protection with payload signing
- One-time use validation (PAID → USED)
- Base64 PNG format for easy integration

### Real-time Updates
- Server-Sent Events for live seat availability
- Automatic connection management and cleanup
- Efficient broadcasting to connected clients per event
- Instant seat reservation/release notifications

### Dynamic Resource Management
- Adaptive cron job scheduling based on event proximity (1-5 minutes)
- Batch processing for expired ticket cleanup and seat release
- Memory-efficient rate limiting with automatic cleanup
- Optimized database queries with transactions

### Payment Processing
- External payment gateway integration
- JWT-signed invoice generation
- Automatic ticket state updates upon payment confirmation
- Comprehensive error handling and logging

---

# API Documentation

## Base URLs
```
tRPC API: http://localhost:3000/trpc
SSE Streams: http://localhost:3000/events
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

## Authentication Endpoints

### Alpha Login (DEV Role)
```typescript
POST /trpc/alpha.login
{
  "username": "dev_user",
  "password": "secure_password", 
  "phrase": "security_phrase"
}

// Response:
{
  "success": true,
  "message": "User logged in successfully",
  "user": { /* dev user object */ },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Admin Login (ADMIN Role)
```typescript
POST /trpc/admin.login
{
  "nameOrEmail": "admin@example.com", // or username
  "password": "secure_password",
  "phrase": "security_phrase"
}

// Response:
{
  "success": true,
  "message": "User logged in successfully",
  "user": { /* admin user object */ },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Create API Key
```typescript
POST /trpc/alpha.createApiKey
Headers: { Authorization: "Bearer <alpha-token>" }
{
  "name": "dev" | "admin"
}

// Response:
{
  "success": true,
  "message": "API Key created successfully",
  "apiToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### List API Keys
```typescript
GET /trpc/alpha.listApiKeys
Headers: { Authorization: "Bearer <alpha-token>" }

// Returns array of API key records
```

### Revoke API Key
```typescript
POST /trpc/alpha.revokeApiKey
Headers: { Authorization: "Bearer <alpha-token>" }
{
  "id": "api-key-uuid"
}
```

## Admin Token Management

### Refresh Admin Token
```typescript
POST /trpc/admin.refreshAdminToken
Headers: { Authorization: "Bearer <admin-token>" }
{
  "token": "current-admin-token"
}

// Response:
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "new-admin-token"
}
```

### Admin Logout
```typescript
POST /trpc/admin.logout
Headers: { Authorization: "Bearer <admin-token>" }
{
  "token": "admin-token-to-revoke"
}

// Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Event Management

### Create Event
```typescript
POST /trpc/event.createEvent
Headers: { Authorization: "Bearer <admin-token>" }
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

// Note: Must provide exactly 2 teams
// Event seats are created separately via seat router
```

### Get Active Events
```typescript
GET /trpc/event.getEvents
Headers: { Authorization: "Bearer <dev-token>" }

// Returns only active events
```

### Get All Events (Admin)
```typescript
GET /trpc/event.getAllEvents
Headers: { Authorization: "Bearer <admin-token>" }

// Returns all events (active and inactive)
```

### Get Event Details
```typescript
POST /trpc/event.getEvent
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "event-uuid"
}

// Response:
{
  "success": true,
  "message": "Event retrieved successfully",
  "event": {
    "id": "event-uuid",
    "name": "Concert 2024",
    "description": "Amazing live performance",
    "startsAt": "2024-12-25T19:00:00Z",
    "active": true,
    "teams": [
      {
        "id": "team-uuid-1",
        "name": "Team Alpha"
      },
      {
        "id": "team-uuid-2", 
        "name": "Team Beta"
      }
    ]
  }
}
```

### Update Event
```typescript
POST /trpc/event.updateEvent
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "event-uuid",
  "name": "Updated Event Name", // optional
  "description": "New description", // optional
  "startsAt": "2024-12-26T19:00:00Z", // optional
  "teams": [
    {
      "id": "team-uuid",
      "name": "Updated Team Name", // optional
      "description": "Updated description", // optional
      "logoUrl": "https://example.com/new-logo.png" // optional
    }
  ]
}
```

### Cancel Event
```typescript
POST /trpc/event.cancelEvent
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "event-uuid"
}

// Sets event.active = false
```

## Venue & Seat Management

### Create Venue
```typescript
POST /trpc/venue.createVenue
Headers: { Authorization: "Bearer <admin-token>" }
{
  "name": "Main Arena",
  "description": "Large concert venue",
  "location": {
    "longitude": -1.9441,
    "latitude": 30.0619
  }
}
```

### Get All Venues
```typescript
GET /trpc/venue.getAllVenues
Headers: { Authorization: "Bearer <dev-token>" }

// Returns all venues in the system
```

### Get Venue Details
```typescript
POST /trpc/venue.getVenue
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "venue-uuid"
}

// Returns single venue details or null if not found
```

### Update Venue
```typescript
POST /trpc/venue.updateVenue
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "venue-uuid",
  "name": "Updated Arena Name", // optional
  "description": "Updated venue description", // optional
  "location": { // optional
    "longitude": -1.9500,
    "latitude": 30.0700
  }
}
```

### Delete Venue
```typescript
POST /trpc/venue.deleteVenue
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "venue-uuid"
}

// Permanently removes venue from system
// Note: Ensure no active events are associated with venue
```

### Get Seats by Venue
```typescript
POST /trpc/seat.getSeatsByVenue
Headers: { Authorization: "Bearer <dev-token>" }
{
  "venueId": "venue-uuid"
}

// Response:
{
  "success": true,
  "message": "Seats retrieved successfully",
  "seats": [
    {
      "id": "seat-uuid",
      "venueId": "venue-uuid",
      "label": "A1-1",
      "section": "A",
      "row": 1,
      "number": 1
    }
  ]
}
```

### Create Seats for Venue
```typescript
POST /trpc/seat.createSeats
Headers: { Authorization: "Bearer <admin-token>" }
{
  "venueId": "venue-uuid",
  "seats": [
    {
      "section": "A",
      "row": 1,
      "number": 1
    },
    {
      "section": "A",
      "row": 1,
      "number": 2
    }
  ]
}

// Creates seats with labels like "A1-1", "A1-2"
```

### Create Event Seats (Pricing)
```typescript
POST /trpc/seat.createEventSeats
Headers: { Authorization: "Bearer <admin-token>" }
{
  "eventId": "event-uuid",
  "seats": [
    {
      "seatId": "seat-uuid",
      "price": 50.00,
      "category": "VIP"
    },
    {
      "seatId": "seat-uuid-2",
      "price": 30.00,
      "category": "Regular"
    }
  ]
}
```

### Get Event Seats
```typescript
POST /trpc/seat.getEventSeats
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid"
}

// Response:
{
  "success": true,
  "message": "Event seats retrieved successfully",
  "eventSeats": [
    {
      "id": "event-seat-uuid",
      "seatId": "seat-uuid",
      "price": 50.00,
      "category": "VIP",
      "isAvailable": true
    }
  ]
}
```

### Get Event Seat Statistics
```typescript
POST /trpc/seat.getEventSeatsStats
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid"
}

// Response:
{
  "success": true,
  "message": "Event seats stats retrieved successfully",
  "status": {
    "availableSeats": 45,
    "totalSeats": 100
  }
}
```

## Ticket Operations

### Create Single Ticket
```typescript
POST /trpc/ticket.createTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid",
  "teamId": "team-uuid", 
  "userId": "user-uuid",
  "seatId": "seat-uuid"
}

// Bearer info is automatically extracted from user record
// Ticket expires in 15 minutes
// User limited to 14 tickets total
```

### Create Gift Ticket
```typescript
POST /trpc/ticket.createGiftTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid",
  "teamId": "team-uuid", 
  "userId": "purchaser-user-uuid",
  "seatId": "seat-uuid",
  "bearer": "recipient@example.com"
}

// Bearer info extracted from recipient user record
```

### Create Group Ticket (3-5 people)
```typescript
POST /trpc/ticket.createGroupTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid",
  "userId": "user-uuid",
  "seatId": "main-seat-uuid",
  "teamId": "team-uuid",
  "group": [
    {
      "teamId": "team-uuid",
      "seatId": "seat-uuid-2",
      "bearer": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+250 788 888 889"
      }
    },
    {
      "teamId": "team-uuid",
      "seatId": "seat-uuid-3",
      "bearer": {
        "name": "Bob Smith",
        "email": "bob@example.com",
        "phone": "+250 788 888 890"
      }
    }
  ]
}

// Creates tickets for main user + 2-4 additional people
// Total group size: 3-5 people
```

### Create Family Ticket (3-7 people)
```typescript
POST /trpc/ticket.createFamilyTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid",
  "userId": "user-uuid",
  "seatId": "main-seat-uuid",
  "teamId": "team-uuid",
  "family": [
    // 2-6 additional family members
    {
      "teamId": "team-uuid",
      "seatId": "seat-uuid-2",
      "bearer": {
        "name": "Family Member",
        "email": "member@example.com",
        "phone": "+250 788 888 891"
      }
    }
  ]
}

// Creates tickets for main user + 2-6 family members
// Total family size: 3-7 people
```

### Get Tickets
```typescript
// All tickets (Admin only)
GET /trpc/ticket.getTickets
Headers: { Authorization: "Bearer <admin-token>" }

// Single ticket (Admin only)
POST /trpc/ticket.getTicket
Headers: { Authorization: "Bearer <admin-token>" }
{ "id": "ticket-uuid" }

// By event (Admin only)
POST /trpc/ticket.getTicketsByEvent
Headers: { Authorization: "Bearer <admin-token>" }
{ "eventId": "event-uuid" }

// By team (Admin only)
POST /trpc/ticket.getTicketsByTeam
Headers: { Authorization: "Bearer <admin-token>" }
{ "teamId": "team-uuid" }

// By state (Admin only)
POST /trpc/ticket.getTicketByState
Headers: { Authorization: "Bearer <admin-token>" }
{ "state": "PENDING" | "PAID" | "USED" | "CANCELLED" | "REFUNDED" }

// User's tickets (Dev access)
POST /trpc/ticket.getUserTickets
Headers: { Authorization: "Bearer <dev-token>" }
{ "userId": "user-uuid" }

// Returns tickets where user is owner OR bearer (gift tickets)
// Only returns PAID and PENDING tickets
```

### Ticket State Management

```typescript
// Place Payment Order
POST /trpc/ticket.placePaymentOrder
Headers: { Authorization: "Bearer <dev-token>" }
{
  "userId": "user-uuid",
  "tickets": [
    { "id": "ticket-uuid-1" },
    { "id": "ticket-uuid-2" }
  ]
}

// Creates order record for payment processing
// Note: Actual payment processing integration needs to be implemented

// Cancel ticket (Admin only)
POST /trpc/ticket.cancelTicket  
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "ticket-uuid"
}

// Releases seat and broadcasts SSE update
```

## QR Code Operations

### Generate QR Code
```typescript
POST /trpc/ticket.getTicketQRCode
Headers: { Authorization: "Bearer <dev-token>" }
{
  "ticketId": "ticket-uuid"
}

// Returns:
{
  "success": true,
  "message": "Ticket QR code retrieved successfully",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "ticketInfo": {
    "event": "Concert 2024",
    "seat": "seat-uuid", 
    "date": "2024-12-25T19:00:00Z",
    "client": { "name": "John Doe", "email": "...", "phone": "..." }
  }
}
```

### Validate QR Code
```typescript
POST /trpc/ticket.validateQRCode
Headers: { Authorization: "Bearer <admin-token>" }
{
  "qrData": "encoded-payload.signature"
}

// Validates HMAC signature and marks PAID ticket as USED
// Returns ticket details with event and seat information
```

## User Management

### Get User by Email
```typescript
POST /trpc/user.getUser
Headers: { Authorization: "Bearer <dev-token>" }
{
  "email": "user@example.com"
}

// Returns user record or null if not found
```

## Team Management

### Get Teams
```typescript
GET /trpc/team.getTeams
Headers: { Authorization: "Bearer <dev-token>" }

// Returns all teams
```

### Get Team Details
```typescript
POST /trpc/team.getTeam
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "team-uuid"
}
```

### Update Team
```typescript
POST /trpc/team.updateTeam
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "team-uuid",
  "name": "New Team Name",
  "description": "Updated description", 
  "logoUrl": "https://example.com/new-logo.png"
}

// All fields are required
```

## Analytics

### Get Event Revenue
```typescript
POST /trpc/analytics.getEventRevenue
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid"
}

// Returns:
{
  "success": true,
  "message": "Event revenue retrieved successfully",
  "revenue": 1500.00,
  "ticketCount": 30
}

// Calculates revenue from PAID and USED tickets only
```

## Real-time Seat Updates (SSE)

### Connect to Live Seat Updates
```javascript
// Establish SSE connection for live seat availability
GET /events/{eventId}/seats/stream
Headers: { Authorization: "Bearer <dev-token>" }

// JavaScript client example:
const eventSource = new EventSource(
  `/events/${eventId}/seats/stream`,
  { 
    headers: { 
      Authorization: `Bearer ${devToken}` 
    }
  }
);

eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  if (update.type === 'seatingPlan') {
    // Full seating plan update
    console.log('Full seating plan:', update.data);
    setSeatingPlan(update.data);
  }
  
  if (update.type === 'seatUpdate') {
    // Individual seat change
    console.log('Seat update:', update.data);
    updateSeat(update.data.seatId, update.data.isAvailable);
  }
};

eventSource.onerror = (error) => {
  console.log('SSE connection error, will auto-reconnect');
};
```

### SSE Message Types

#### Full Seating Plan Update
```json
{
  "type": "seatingPlan",
  "eventId": "event-uuid",
  "data": {
    "seat-uuid-1": {
      "label": "A1-1",
      "price": 50.00,
      "isAvailable": false
    },
    "seat-uuid-2": {
      "label": "A1-2", 
      "price": 50.00,
      "isAvailable": true
    }
  },
  "timestamp": 1703123456789
}
```

#### Individual Seat Update
```json
{
  "type": "seatUpdate",
  "eventId": "event-uuid",
  "data": {
    "seatId": "seat-uuid-1",
    "isAvailable": false,
    "price": 50.00,
    "label": "A1-1"
  },
  "timestamp": 1703123456789
}
```

### SSE Connection Management
```javascript
// Connection automatically reconnects on failure
// Keepalive messages sent every 30 seconds
// Stale connections cleaned up after 30 minutes
// Multiple clients can connect to same event stream
```

### SSE Statistics (Monitoring)
```typescript
GET /sse/stats
Headers: { Authorization: "Bearer <dev-token>" }

// Returns connection statistics for monitoring
{
  "success": true,
  "stats": {
    "totalConnections": 15,
    "eventsWithConnections": 3,
    "connectionsByEvent": [
      { "eventId": "event-1", "connections": 8 },
      { "eventId": "event-2", "connections": 5 },
      { "eventId": "event-3", "connections": 2 }
    ]
  }
}
```

## Environment Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# UUID Generation
UUID_NAMESPACE="6ba7b810-9dad-11d1-80b4-00c04fd430c8"

# JWT Secrets
ADMIN_JWT_SECRET="your-admin-secret"     # For admin API keys
ALPHA_JWT_SECRET="your-alpha-secret"     # For alpha login tokens
JWT_SECRET="your-dev-secret"             # For dev API keys

# Security
HASH_SECRET="your-hash-secret"           # For password hashing
QR_SECRET="your-qr-secret"               # For QR code signing

# Payment Gateway
PAY_API_KEY="your-payment-api-key"       # Payment gateway authentication
PAY_API_URL="https://payment-gateway.com/api"  # Payment gateway base URL
```

### Development Setup
```bash
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:reset

# Start development server
npm run dev

# Production build
npm run build
npm start
```

## Production Considerations

### Rate Limiting
- Dev API keys: 100 requests/hour
- Automatic cleanup of expired rate limit records
- Rate limit headers included in responses

### Security
- All endpoints protected with JWT authentication
- QR codes signed with HMAC-SHA256
- Bcrypt password hashing with salt
- Input validation with Zod schemas

### Performance
- Database transactions for data consistency
- Batch processing for bulk operations
- Optimized cron job scheduling
- Memory-efficient rate limiting
- Real-time SSE with automatic connection management

### Monitoring
- Structured logging with operation context
- Error tracking with stack traces
- Rate limit and performance metrics
- Automated cleanup processes
- SSE connection statistics and health monitoring

## Error Handling

All endpoints return standardized responses:
```typescript
// Success
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}

// Error
{
  "success": false, 
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Contributing

1. Follow TypeScript strict mode guidelines
2. Use Prisma transactions for data consistency
3. Add proper error logging with context
4. Include input validation with Zod
5. Test authentication flows thoroughly

## License

MIT License - See package.json for details.