# APR Ticketing System

A production-ready, enterprise-grade ticketing system built with TypeScript, tRPC, and Prisma. Features secure authentication, QR code generation, dynamic resource management, and comprehensive event management.

## System Architecture

### Core Technologies
- **Backend**: Node.js + Express + tRPC
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control
- **Real-time**: Server-Sent Events (SSE) for live seat updates
- **Security**: Rate limiting, HMAC-signed QR codes
- **Scheduling**: Dynamic cron jobs with adaptive intervals

### Project Structure
```
src/
├── controllers/          # Database and tRPC setup
│   ├── prisma.ts        # Prisma client configuration
│   └── trpc.ts          # tRPC context and router setup
├── middleware/          # Authentication and authorization
│   ├── admin-procedure.ts   # Admin-level JWT middleware
│   ├── dev-procedure.ts     # Developer-level JWT middleware with rate limiting
│   └── sse-auth.ts         # SSE authentication middleware
├── routes/              # API endpoint definitions
│   ├── admin-router.ts      # User management and API key operations
│   ├── analytics-router.ts  # Revenue and statistics endpoints
│   ├── event-router.ts      # Event CRUD and management
│   ├── team-router.ts       # Team management
│   └── ticket-router.ts     # Ticket lifecycle and QR code operations
├── utils/               # Utility functions
│   ├── logger.ts           # Structured logging with context
│   ├── qr-code.ts          # Secure QR code generation
│   ├── rate-limiter.ts     # In-memory rate limiting
│   └── sse-manager.ts      # Server-Sent Events management
├── types/               # TypeScript type definitions
└── server.ts           # Main application entry point
```

## Authentication System

### User Roles
- **ADMIN**: Full system access, user management, API key creation
- **DEV**: API access with rate limiting (100 requests/hour)

### Authentication Flow
1. Admin login with username + password + phrase (2FA)
2. API key creation for different environments (dev/prod/readonly)
3. JWT token usage with Bearer authentication
4. Automatic rate limiting and token validation

### Security Features
- Bcrypt password hashing
- HMAC-SHA256 signed QR codes
- JWT token expiration (15 days)
- Rate limiting with automatic cleanup
- Role-based endpoint protection

## Core Features

### Event Management
- Create events with flexible seating plans
- Team-based ticket organization (2 teams per event)
- Automatic event deactivation after start time
- Real-time seat availability tracking

### Ticket Lifecycle
```
PENDING (15min expiry) → PAID → USED
                    ↓
                CANCELLED
```

### QR Code System
- Cryptographically secure QR generation
- Anti-tampering protection with HMAC signatures
- One-time use validation
- Base64 PNG format for easy integration

### Real-time Updates
- Server-Sent Events for live seat availability
- Automatic connection management and cleanup
- Efficient broadcasting to connected clients
- Instant seat reservation/release notifications

### Dynamic Resource Management
- Adaptive cron job scheduling based on event proximity
- Batch processing for expired ticket cleanup
- Memory-efficient rate limiting
- Optimized database queries with transactions

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

## Admin Endpoints

### Login
```typescript
POST /admin.login
{
  "username": "admin_user",
  "password": "secure_password", 
  "phrase": "security_phrase"
}
```

### Create API Key
```typescript
POST /admin.createApiKey
Headers: { Authorization: "Bearer <admin-token>" }
{
  "name": "dev" | "prod" | "readonly"
}
```

### List API Keys
```typescript
GET /admin.listApiKeys
Headers: { Authorization: "Bearer <admin-token>" }
```

### Revoke API Key
```typescript
POST /admin.revokeApiKey
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "api-key-uuid"
}
```

## Event Management

### Create Event
```typescript
POST /event.createEvent
Headers: { Authorization: "Bearer <dev-token>" }
{
  "name": "Concert 2024",
  "description": "Amazing live performance",
  "location": "Main Arena",
  "startsAt": "2024-12-25T19:00:00Z",
  "seatingPlan": {
    "sections": [
      {
        "name": "A",
        "rows": [
          {
            "number": 1,
            "seats": [
              {
                "number": 1,
                "price": 50.00,
                "isAvailable": true
              }
            ]
          }
        ]
      }
    ]
  },
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

### Get Active Events
```typescript
GET /event.getEvents
Headers: { Authorization: "Bearer <dev-token>" }
```

### Get Event Details
```typescript
GET /event.getEvent
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "event-uuid"
}
```

### Get Event Status & Statistics
```typescript
GET /event.getEventStatus
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "event-uuid"
}

// Response includes:
// - Total/available/reserved seats
// - Ticket counts by state
// - Revenue calculations
```

### Update Event
```typescript
POST /event.updateEvent
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "event-uuid",
  "name": "Updated Event Name", // optional
  "description": "New description", // optional
  "startsAt": "2024-12-26T19:00:00Z", // optional
  "teams": [
    {
      "id": "team-uuid",
      "name": "Updated Team Name" // optional
    }
  ]
}
```

### Cancel Event
```typescript
POST /event.cancelEvent
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "event-uuid"
}
```

## Ticket Operations

### Create Ticket
```typescript
POST /ticket.createTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid",
  "teamId": "team-uuid", 
  "seatId": "seat-uuid",
  "client": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+250 788 888 888"
  }
}
```

### Get Tickets
```typescript
// All tickets
GET /ticket.getTickets
Headers: { Authorization: "Bearer <dev-token>" }

// By event
GET /ticket.getTicketsByEvent
Headers: { Authorization: "Bearer <dev-token>" }
{ "eventId": "event-uuid" }

// By team  
GET /ticket.getTicketsByTeam
Headers: { Authorization: "Bearer <dev-token>" }
{ "teamId": "team-uuid" }

// By state
GET /ticket.getTicketByState
Headers: { Authorization: "Bearer <dev-token>" }
{ "state": "PENDING" | "PAID" | "USED" | "CANCELLED" }
```

### Update Ticket State
```typescript
// Mark as paid (with payment processing)
POST /ticket.updateTicketStatePaid
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "ticket-uuid"
}

// Payment Processing Flow:
// 1. Validates ticket exists and is in PENDING state
// 2. Extracts client info and seat pricing from ticket
// 3. Creates signed invoice with JWT using PAY_JWT_SECRET
// 4. Sends payment request to external payment gateway
// 5. Validates payment response and updates ticket to PAID state
// 6. Returns success/error with detailed messaging

// Required Environment Variables:
// PAY_JWT_SECRET - Secret for signing payment invoices
// PAY_API_URL - Payment gateway base URL
// PAY_API_KEY - API key for payment gateway authentication

// Cancel ticket
POST /ticket.cancelTicket  
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "ticket-uuid"
}
```

## QR Code Operations

### Generate QR Code
```typescript
GET /ticket.getTicketQRCode
Headers: { Authorization: "Bearer <dev-token>" }
{
  "ticketId": "ticket-uuid"
}

// Returns:
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "ticketInfo": {
    "event": "Concert 2024",
    "seat": "A1-1", 
    "date": "2024-12-25T19:00:00Z",
    "client": { "name": "John Doe", ... }
  }
}
```

### Validate QR Code
```typescript
POST /ticket.validateQRCode
Headers: { Authorization: "Bearer <dev-token>" }
{
  "qrData": "base64-encoded-signed-payload"
}

// Marks ticket as USED and returns validation result
```

## Team Management

### Get Teams
```typescript
GET /team.getTeams
Headers: { Authorization: "Bearer <dev-token>" }
```

### Get Team Details
```typescript
GET /team.getTeam
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "team-uuid"
}
```

### Update Team
```typescript
POST /team.updateTeam
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "team-uuid",
  "name": "New Team Name",
  "description": "Updated description", 
  "logoUrl": "https://example.com/new-logo.png"
}
```

## Analytics

### Get Event Revenue
```typescript
GET /analytics.getEventRevenue
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid"
}

// Returns total revenue from PAID and USED tickets
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
DATABASE_URL="postgresql://user:password@localhost:5432/database"
UUID_NAMESPACE="6ba7b810-9dad-11d1-80b4-00c04fd430c8"
ADMIN_JWT_SECRET="your-admin-secret"
JWT_SECRET="your-api-secret"
HASH_SECRET="your-hash-secret"
QR_SECRET="your-qr-secret"
PAY_JWT_SECRET="your-pay-jwt-secret"
PAY_API_URL="https://payment-gateway.com/api"
PAY_API_KEY="your-pay-api-key"
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