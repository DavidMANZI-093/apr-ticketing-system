# APR Ticketing System

A comprehensive event ticketing system built with TypeScript, tRPC, and Prisma. Features secure authentication, QR code generation, real-time seat updates, and comprehensive event management with payment processing integration.

## System Architecture

### Core Technologies
- **Backend**: Node.js + Express + tRPC
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control (Admin, Dev, Alpha)
- **Real-time**: Server-Sent Events (SSE) for live seat updates
- **Security**: Rate limiting, HMAC-signed QR codes, bcrypt password hashing
- **Scheduling**: Dynamic cron jobs with adaptive intervals (node-cron)
- **Payment**: External payment gateway integration
- **QR Codes**: QR code generation with qrcode library
- **Validation**: Zod for input validation and schema enforcement
<!-- - **Testing**: Jest with TypeScript support -->

### Project Structure
```
src/
├── controllers/          # Database and tRPC setup
│   ├── app.ts           # Application configuration
│   ├── prisma.ts        # Prisma client configuration
│   └── trpc.ts          # tRPC context and router setup
├── middleware/          # Authentication and authorization
│   ├── admin-procedure.ts   # Admin API key middleware (100 req/hour, ADMIN_JWT_SECRET)
│   ├── alpha-procedure.ts   # Alpha login middleware (no rate limit, ALPHA_JWT_SECRET)
│   ├── dev-procedure.ts     # Dev API key middleware (100 req/hour, JWT_SECRET)
│   └── sse-auth.ts         # SSE authentication middleware
├── routes/              # API endpoint definitions
│   ├── admin-router.ts      # Admin authentication and token management
│   ├── alpha-router.ts      # DEV login and API key management
│   ├── analytics-router.ts  # Revenue and statistics endpoints
│   ├── event-router.ts      # Event CRUD and management
│   ├── seat-router.ts       # Seat and event seat management
│   ├── team-router.ts       # Team management
│   ├── ticket-router.ts     # Ticket lifecycle and QR code operations
│   ├── user-router.ts       # User management
│   └── venue-router.ts      # Venue CRUD and seat section management
├── utils/               # Utility functions
│   ├── logger.ts           # Structured logging with context
│   ├── qr-code.ts          # Secure QR code generation with HMAC
│   ├── rate-limiter.ts     # In-memory rate limiting with cleanup
│   └── sse-manager.ts      # Server-Sent Events connection management
├── types/               # TypeScript type definitions
│   └── index.ts            # Shared type definitions (Seat interface)
└── server.ts           # Main application entry point with SSE endpoints and cron jobs

prisma/
├── migrations/          # Database migration files
└── schema.prisma       # Prisma schema with all models

generated/             # Generated Prisma client
└── prisma/           # Prisma client files
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
4. No rate limiting applied to alpha tokens

#### Admin Authentication (ADMIN Role)
1. Admin login with username/email + password + phrase
2. Automatic API key creation during login
3. Short-lived tokens (1 hour expiration)
4. Token refresh and logout capabilities
5. Rate limiting: 100 requests/hour for admin API keys

#### Developer API Keys
1. Created by alpha users for API access
2. Rate limiting: 100 requests/hour for dev API keys
3. Long-lived tokens (15 days expiration)
4. Uses JWT_SECRET for token signing

#### General
- JWT token usage with Bearer authentication
- Automatic rate limiting and token validation for API keys
- Different JWT secrets for different token types

### Security Features
- Bcrypt password hashing with salt
- HMAC-SHA256 signed QR codes
- JWT token expiration (1 day for alpha, 1 hour for admin, 15 days for API keys)
- Rate limiting with automatic cleanup (100 requests/hour for admin and dev API keys)
- Role-based endpoint protection
- Separate JWT secrets for different authentication types:
  - ALPHA_JWT_SECRET for alpha login tokens
  - ADMIN_JWT_SECRET for admin API keys
  - JWT_SECRET for dev API keys

## Core Features

### Event Management
- Create events with venue association and team setup (exactly 2 teams per event)
- Automatic event deactivation 5 minutes after start time
- Real-time seat availability tracking via SSE
- Event seat pricing and category management

### Ticket Types & Lifecycle
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

## Table of Contents

### Quick Reference
- [Base URLs & Authentication](#base-urls--authentication)
- [Common Response Formats](#common-response-formats)
- [Error Handling](#error-handling-1)

### Authentication & Authorization
- [Alpha Authentication (DEV Role)](#alpha-authentication-dev-role)
- [Admin Authentication (ADMIN Role)](#admin-authentication-admin-role)
- [API Key Management](#api-key-management)
- [Admin Token Management](#admin-token-management)

### Core API Endpoints
- [Event Management](#event-management-1) - Create, update, and manage events
- [Venue & Seat Management](#venue--seat-management-1) - Venue, sections, and seat operations
- [Ticket Operations](#ticket-operations-1) - All ticket types and lifecycle management
- [QR Code Operations](#qr-code-operations-1) - Generation and validation
- [User Management](#user-management-1) - User lookup and management
- [Team Management](#team-management-1) - Team CRUD operations
- [Analytics](#analytics-1) - Revenue and statistics

### Real-time & Monitoring
- [Real-time Seat Updates (SSE)](#real-time-seat-updates-sse) - Live seat availability
- [System Monitoring](#system-monitoring-1) - Health checks and statistics

### Reference
- [Environment Setup](#environment-setup-1) - Configuration and deployment
- [Production Considerations](#production-considerations-1) - Performance and security
- [Error Reference](#error-handling) - Complete error response guide

---

## Base URLs & Authentication

### Base URLs
```
tRPC API: http://localhost:3000/trpc
SSE Streams: http://localhost:3000/events
System Endpoints: http://localhost:3000
```

### Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

### Common Response Formats

#### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## Authentication & Authorization

### Overview
The APR Ticketing System uses JWT-based authentication with three distinct roles:
- **ALPHA**: Super admin access (DEV role) - can create API keys and manage system
- **ADMIN**: Full system access - event and ticket management with 1-hour tokens
- **DEV**: API access with rate limiting (100 requests/hour) - 15-day tokens

Related sections: [Security Features](#security-features), [Rate Limiting](#rate-limiting), [Environment Variables](#required-environment-variables)

### Authentication Endpoints

### Alpha Login (DEV Role)
```typescript
// tRPC Mutation
alpha.login
{
  "username": "dev_user",
  "password": "secure_password", 
  "phrase": "security_phrase"
}

// Success Response:
{
  "success": true,
  "message": "User logged in successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "dev_user",
    "email": "dev@example.com",
    "password": "$2b$10$...", // bcrypt hash
    "phrase": "$2b$10$...", // bcrypt hash
    "role": "DEV",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWxwaGEiLCJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ1c2VybmFtZSI6ImRldl91c2VyIiwiaWF0IjoxNzAzNTM5MjAwLCJleHAiOjE3MDM2MjU2MDB9.signature"
}
```

### Admin Login (ADMIN Role)
```typescript
// tRPC Mutation
admin.login
{
  "nameOrEmail": "admin@example.com", // or username
  "password": "secure_password",
  "phrase": "security_phrase"
}

// Success Response:
{
  "success": true,
  "message": "User logged in successfully",
  "user": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "admin_user",
    "email": "admin@example.com",
    "password": "$2b$10$...", // bcrypt hash
    "phrase": "$2b$10$...", // bcrypt hash
    "role": "ADMIN",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlJZCI6IjY2MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMSIsIm5hbWUiOiJhZG1pbiIsImlhdCI6MTcwMzUzOTIwMCwiZXhwIjoxNzAzNTQyODAwfQ.signature"
}
```

### API Key Management

#### Create API Key
```typescript
// tRPC Mutation - Requires Alpha Authentication
alpha.createApiKey
Headers: { Authorization: "Bearer <alpha-token>" }
{
  "name": "dev" | "admin" // defaults to "dev"
}

// Success Response:
{
  "success": true,
  "message": "API Key created successfully",
  "apiToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlJZCI6Ijc3MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMiIsIm5hbWUiOiJkZXYiLCJpYXQiOjE3MDM1MzkyMDAsImV4cCI6MTcwNDgzNTIwMH0.signature"
}
```

**Related**: Use created API keys for [Event Management](#event-management-1), [Ticket Operations](#ticket-operations-1), [SSE Connections](#real-time-seat-updates-sse)

### List API Keys
```typescript
// tRPC Query - Requires Alpha Authentication
alpha.listApiKeys
Headers: { Authorization: "Bearer <alpha-token>" }

// Success Response:
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "dev",
    "active": true,
    "createdAt": "2024-12-25T19:00:00.000Z",
    "revokedAt": null,
    "lastUsedAt": "2024-12-25T20:30:00.000Z"
  },
  {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "admin",
    "active": false,
    "createdAt": "2024-12-24T15:00:00.000Z",
    "revokedAt": "2024-12-25T10:00:00.000Z",
    "lastUsedAt": "2024-12-25T09:45:00.000Z"
  }
]
```

### Revoke API Key
```typescript
// tRPC Mutation - Requires Alpha Authentication
alpha.revokeApiKey
Headers: { Authorization: "Bearer <alpha-token>" }
{
  "id": "770e8400-e29b-41d4-a716-446655440002"
}

// Success Response:
{
  "success": true,
  "message": "API key revoked successfully"
}
```

## Admin Token Management

### Refresh Admin Token
```typescript
// tRPC Mutation - Requires Admin Authentication
admin.refreshAdminToken
Headers: { Authorization: "Bearer <admin-token>" }
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlJZCI6IjY2MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMSIsIm5hbWUiOiJhZG1pbiIsImlhdCI6MTcwMzUzOTIwMCwiZXhwIjoxNzAzNTQyODAwfQ.old_signature"
}

// Success Response:
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlJZCI6IjY2MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMSIsIm5hbWUiOiJhZG1pbiIsImlhdCI6MTcwMzU0MjgwMCwiZXhwIjoxNzAzNTQ2NDAwfQ.new_signature"
}
```

### Admin Logout
```typescript
// tRPC Mutation - Requires Admin Authentication
admin.logout
Headers: { Authorization: "Bearer <admin-token>" }
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlJZCI6IjY2MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMSIsIm5hbWUiOiJhZG1pbiIsImlhdCI6MTcwMzUzOTIwMCwiZXhwIjoxNzAzNTQyODAwfQ.signature"
}

// Success Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Event Management

### Overview
Events are the core entity of the ticketing system. Each event must be associated with a venue and exactly 2 teams. Events automatically deactivate 5 minutes after their start time.

**Prerequisites**: [Venue Creation](#venue--seat-management-1), [Authentication](#authentication--authorization)  
**Related**: [Ticket Operations](#ticket-operations-1), [Real-time Updates](#real-time-seat-updates-sse), [Analytics](#analytics-1)

### Event CRUD Operations

#### Create Event
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
        "createdAt": "2024-12-25T18:00:00.000Z",
        "updatedAt": "2024-12-25T18:00:00.000Z",
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
          "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
          "createdAt": "2024-12-25T19:00:00.000Z",
          "updatedAt": "2024-12-25T19:00:00.000Z"
        },
        {
          "id": "dd0e8400-e29b-41d4-a716-446655440008",
          "name": "Team Beta",
          "description": "Second team",
          "logoUrl": "https://example.com/logo2.png",
          "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
          "createdAt": "2024-12-25T19:00:00.000Z",
          "updatedAt": "2024-12-25T19:00:00.000Z"
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

// Empty Response:
{
  "success": true,
  "message": "No events found",
  "events": []
}
```

### Get Event Details
```typescript
// tRPC Mutation - Requires Dev Authentication
event.getEvent
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
    "venue": {
      "id": "venue-uuid",
      "name": "Main Arena",
      "sections": [...]
    },
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
// tRPC Mutation - Requires Dev Authentication
event.updateEvent
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
// tRPC Mutation - Requires Admin Authentication
event.cancelEvent
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "event-uuid"
}

// Sets event.active = false
```

## Venue & Seat Management

### Overview
Venues contain seat sections and individual seats. Event seats link venue seats to specific events with pricing. The system supports SVG-based seat section visualization.

**Prerequisites**: [Admin Authentication](#admin-authentication-admin-role)  
**Related**: [Event Management](#event-management-1), [Ticket Operations](#ticket-operations-1)

### Venue Operations

#### Create Venue
```typescript
// tRPC Mutation - Requires Admin Authentication
venue.createVenue
Headers: { Authorization: "Bearer <admin-token>" }
{
  "name": "Main Arena",
  "description": "Large concert venue",
  "location": {
    "longitude": 30.11562,
    "latitude": -1.95318
  }
}

// Success Response:
{
  "success": true,
  "message": "Venue created successfully",
  "venue": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "name": "Main Arena",
    "description": "Large concert venue",
    "location": "30.11562,-1.95318",
    "createdAt": "2024-12-25T18:00:00.000Z",
    "updatedAt": "2024-12-25T18:00:00.000Z"
  }
}
```

### Get All Venues
```typescript
// tRPC Query - Requires Dev Authentication
venue.getAllVenues
Headers: { Authorization: "Bearer <dev-token>" }

// Success Response:
{
  "success": true,
  "message": "Venues retrieved successfully",
  "venues": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "name": "Main Arena",
      "description": "Large concert venue",
      "location": "30.11562,-1.95318",
      "createdAt": "2024-12-25T18:00:00.000Z",
      "updatedAt": "2024-12-25T18:00:00.000Z",
      "sections": [
        {
          "id": "bb0e8400-e29b-41d4-a716-446655440006",
          "name": "Section A",
          "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2263.285838 1719.948741 L 2496.659442 1719.948741 L 2496.659442 1874.00509 L 2262.798335 1874.00509 Z M 2263.285838 1719.948741 ' transform='matrix(3.749972,0,0,3.749972,-4524.1184,-12.939689)'"
        },
        {
          "id": "ff0e8400-e29b-41d4-a716-44665544000a",
          "name": "Section B",
          "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2263.285113 1719.949244 L 2496.658717 1719.949244 L 2496.658717 1874.004552 L 2262.798651 1874.004552 Z M 2263.285113 1719.949244 ' transform='matrix(3.749972,0,0,3.749972,-4524.400838,663.64436)'"
        }
      ]
    }
  ]
}

// Empty Response:
{
  "success": true,
  "message": "No venues found",
  "venues": []
}
```

### Get Venue Details
```typescript
// tRPC Mutation - Requires Dev Authentication
venue.getVenue
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "venue-uuid"
}

// Returns single venue details with sections or null if not found
```

### Update Venue
```typescript
// tRPC Mutation - Requires Admin Authentication
venue.updateVenue
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "venue-uuid",
  "name": "Updated Arena Name", // optional
  "description": "Updated venue description", // optional
  "location": { // optional
    "longitude": 30.11562,
    "latitude": -1.95318
  }
}
```

### Delete Venue
```typescript
// tRPC Mutation - Requires Admin Authentication
venue.deleteVenue
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "venue-uuid"
}

// Permanently removes venue from system
// Note: Ensure no active events are associated with venue
```

### Create Seat Section
```typescript
// tRPC Mutation - Requires Admin Authentication
venue.createSeatSection
Headers: { Authorization: "Bearer <admin-token>" }
{
  "venueId": "venue-uuid",
  "name": "Section A",
  "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 918.081291 2050.296024 L 967.967077 2050.296024 L 967.967077 2033.760485 L 1064.566751 2033.760485 L 1064.566751 1910.012693 L 967.967077 1910.012693 L 967.967077 1893.613614 L 917.94379 1893.613614 Z M 918.081291 2050.296024 ' transform='matrix(3.749972,0,0,3.749972,-67.818402,11.692955)'"
}

// Response:
{
  "success": true,
  "message": "Seat section created successfully",
  "section": {
    "id": "section-uuid",
    "venueId": "venue-uuid",
    "name": "Section A",
    "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 918.081291 2276.776868 L 1064.774044 2276.776868 L 1064.774044 2090.191111 L 968.035828 2090.191111 L 968.035828 2073.515988 L 918.081291 2073.515988 Z M 918.081291 2276.776868 ' transform='matrix(3.749972,0,0,3.749972,-67.818402,11.692955)'",
    "createdAt": "2024-12-25T19:00:00Z",
    "updatedAt": "2024-12-25T19:00:00Z"
  }
}
```

### Get Venue Sections
```typescript
// tRPC Mutation - Requires Dev Authentication
venue.getVenueSections
Headers: { Authorization: "Bearer <dev-token>" }
{
  "venueId": "venue-uuid"
}

// Response:
{
  "success": true,
  "message": "Sections retrieved successfully",
  "sections": [
    {
      "id": "section-uuid",
      "venueId": "venue-uuid",
      "name": "Section A",
      "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 1363.213223 2163.309774 L 1363.213223 2339.874624 L 1346.84331 2339.874624 L 1346.84331 2399.509441 L 1306.40551 2399.509441 L 1306.40551 2413.346002 L 1238.58105 2413.346002 L 1150.87415 2325.640144 L 1221.229879 2255.284414 L 1234.102891 2268.157426 L 1302.897151 2199.363166 L 1311.763883 2208.23094 L 1356.672549 2163.322274 Z M 1363.213223 2163.309774 ' transform='matrix(3.749972,0,0,3.749972,0,0)'",
      "createdAt": "2024-12-25T19:00:00Z",
      "updatedAt": "2024-12-25T19:00:00Z"
    }
  ]
}
```

### Update Seat Section
```typescript
// tRPC Mutation - Requires Admin Authentication
venue.updateSeatSection
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "section-uuid",
  "name": "Updated Section A", // optional
  "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2163.381943 2429.963317 L 2163.381943 2456.490596 L 2146.57036 2456.490596 L 2146.57036 2549.783996 L 2163.381943 2549.783996 L 2163.381943 2563.701807 L 2022.822568 2563.701807 L 2022.822568 2550.06004 L 2040.322698 2550.06004 L 2040.322698 2456.215594 L 2023.188196 2456.215594 L 2023.188196 2429.960192 Z M 2163.381943 2429.963317 ' transform='matrix(3.749972,0,0,3.749972,-610.837036,0.177717)'" // optional
}

// Response:
{
  "success": true,
  "message": "Seat section updated successfully",
  "section": {
    "id": "section-uuid",
    "venueId": "venue-uuid",
    "name": "Updated Section A",
    "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2163.38165 2429.963833 L 2163.38165 2456.491113 L 2146.570067 2456.491113 L 2146.570067 2549.784512 L 2163.38165 2549.784512 L 2163.38165 2563.702324 L 2022.822275 2563.702324 L 2022.822275 2550.059514 L 2040.323447 2550.059514 L 2040.323447 2456.215069 L 2023.188945 2456.215069 L 2023.188945 2429.959666 Z M 2163.38165 2429.963833 ' transform='matrix(3.749972,0,0,3.749972,0,0)'",
    "createdAt": "2024-12-25T19:00:00Z",
    "updatedAt": "2024-12-25T20:00:00Z"
  }
}
```

### Delete Seat Section
```typescript
// tRPC Mutation - Requires Admin Authentication
venue.deleteSeatSection
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "section-uuid"
}

// Response:
{
  "success": true,
  "message": "Seat section deleted successfully",
  "section": {
    "id": "section-uuid",
    "venueId": "venue-uuid",
    "name": "Section A",
    "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 1843.017819 2429.619039 L 1843.017819 2453.200463 L 1826.727073 2453.200463 L 1826.727073 2496.729952 L 1723.374224 2496.729952 L 1723.374224 2453.390048 L 1706.562641 2453.390048 L 1706.562641 2429.424246 Z M 1843.017819 2429.619039 ' transform='matrix(3.749972,0,0,3.749972,0,0)'",
    "createdAt": "2024-12-25T19:00:00Z",
    "updatedAt": "2024-12-25T19:00:00Z"
  }
}
```

### Get All Seats (Admin)
```typescript
// tRPC Query - Requires Admin Authentication
seat.getAllSeats
Headers: { Authorization: "Bearer <admin-token>" }

// Response:
{
  "success": true,
  "message": "Seats retrieved successfully",
  "seats": [
    {
      "id": "seat-uuid",
      "venueId": "venue-uuid",
      "label": "A1-1",
      "sectionId": "section-uuid",
      "row": 1,
      "number": 1
    }
  ]
}
```

### Get Seats by Venue
```typescript
// tRPC Mutation - Requires Dev Authentication
seat.getSeatsByVenue
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
      "sectionId": "section-uuid",
      "row": 1,
      "number": 1,
      "section": {
        "id": "section-uuid",
        "name": "Section A",
        "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 1359.986399 1346.618575 L 1359.986399 1610.030943 L 1353.233224 1610.030943 L 1309.845403 1566.643121 L 1301.630759 1574.857765 L 1227.477085 1500.704091 L 1217.398885 1510.782291 L 1146.941071 1440.325519 L 1240.61364 1346.65295 Z M 1359.986399 1346.618575 ' transform='matrix(-3.749972,0.000000000000000459,-0.000000000000000459,-3.749972,13303.524502,14111.540062)'"
      }
    }
  ]
}
```

### Create Seats for Venue
```typescript
// tRPC Mutation - Requires Admin Authentication
seat.createSeats
Headers: { Authorization: "Bearer <admin-token>" }
{
  "venueId": "venue-uuid",
  "seats": [
    {
      "sectionId": "section-uuid",
      "row": 1,
      "number": 1
    },
    {
      "sectionId": "section-uuid",
      "row": 1,
      "number": 2
    }
  ]
}

// Creates seats with labels like "A1-1", "A1-2" based on section name
// Note: sectionId is required and must reference an existing seat section
```

### Create Event Seats (Pricing)
```typescript
// tRPC Mutation - Requires Admin Authentication
seat.createEventSeats
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
// tRPC Mutation - Requires Dev Authentication
seat.getEventSeats
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
      "eventId": "event-uuid",
      "seatId": "seat-uuid",
      "category": "VIP",
      "price": 50.00,
      "isAvailable": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "seat": {
        "label": "A1-1",
        "row": 1,
        "number": 1,
        "section": {
          "id": "section-uuid",
          "name": "A",
        }
      }
    }
  ]
}
```

### Get Event Seat Details
```typescript
// tRPC Mutation - Requires Dev Authentication
seat.getEventSeat
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "event-uuid",
  "seatId": "seat-uuid"
}

// Response:
{
  "success": true,
  "message": "Event seat retrieved successfully",
  "eventSeat": {
    "id": "event-seat-uuid",
    "eventId": "event-uuid",
    "seatId": "seat-uuid",
    "price": 50.00,
    "category": "VIP",
    "isAvailable": true,
    "available": true
  }
}
```

### Get Event Seat Statistics
```typescript
// tRPC Mutation - Requires Dev Authentication
seat.getEventSeatsStats
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

### Overview
The system supports four ticket types: SINGLE, GROUP (3-5 people), FAMILY (3-7 people), and GIFT. All tickets have a 15-minute expiration period and users are limited to 14 tickets maximum.

**Prerequisites**: [Event Creation](#event-management-1), [Seat Availability](#venue--seat-management-1), [Dev Authentication](#api-key-management)  
**Related**: [QR Code Operations](#qr-code-operations-1), [Real-time Updates](#real-time-seat-updates-sse), [User Management](#user-management-1)

### Ticket Creation

#### Create Single Ticket
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
    "expiresAt": "2024-12-25T19:15:00.000Z", // 15 minutes from creation
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}

// Bearer info is automatically extracted from user record
// Ticket expires in 15 minutes
// User limited to 14 tickets total
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
  "seatId": "440e8400-e29b-41d4-a716-44665544000e",
  "bearer": "jane.smith@example.com"
}

// Success Response:
{
  "success": true,
  "message": "Ticket created successfully",
  "ticket": {
    "id": "550e8400-e29b-41d4-a716-44665544000f",
    "userId": "110e8400-e29b-41d4-a716-44665544000b", // purchaser
    "bearer": {
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "phone": "+250788654321"
    },
    "orderId": null,
    "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
    "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
    "seatId": "440e8400-e29b-41d4-a716-44665544000e",
    "type": "GIFT",
    "state": "PENDING",
    "expiresAt": "2024-12-25T19:15:00.000Z",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}

// Bearer info extracted from recipient user record
```

### Create Group Ticket (3-5 people total)
```typescript
// tRPC Mutation - Requires Dev Authentication
ticket.createGroupTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "userId": "110e8400-e29b-41d4-a716-44665544000b", // main user (purchaser)
  "seatId": "660e8400-e29b-41d4-a716-446655440010", // main user's seat
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007", // main user's team
  "group": [ // 2-4 additional people (min 2, max 4)
    {
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "seatId": "770e8400-e29b-41d4-a716-446655440011",
      "bearer": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+250788888889"
      }
    },
    {
      "teamId": "dd0e8400-e29b-41d4-a716-446655440008",
      "seatId": "880e8400-e29b-41d4-a716-446655440012",
      "bearer": {
        "name": "Bob Smith",
        "email": "bob@example.com",
        "phone": "+250788888890"
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
      "id": "990e8400-e29b-41d4-a716-446655440013",
      "userId": "110e8400-e29b-41d4-a716-44665544000b",
      "bearer": {
        "name": "John Doe", // main user
        "email": "john.doe@example.com",
        "phone": "+250788123456"
      },
      "orderId": null,
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "660e8400-e29b-41d4-a716-446655440010",
      "type": "GROUP",
      "state": "PENDING",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    },
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440014",
      "userId": "110e8400-e29b-41d4-a716-44665544000b", // same purchaser
      "bearer": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+250788888889"
      },
      "orderId": null,
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "770e8400-e29b-41d4-a716-446655440011",
      "type": "GROUP",
      "state": "PENDING",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    },
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440015",
      "userId": "110e8400-e29b-41d4-a716-44665544000b", // same purchaser
      "bearer": {
        "name": "Bob Smith",
        "email": "bob@example.com",
        "phone": "+250788888890"
      },
      "orderId": null,
      "teamId": "dd0e8400-e29b-41d4-a716-446655440008",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "880e8400-e29b-41d4-a716-446655440012",
      "type": "GROUP",
      "state": "PENDING",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    }
  ]
}

// Creates tickets for main user + 2-4 additional people (total 3-5 people)
// All tickets have same userId (purchaser) but different bearer information
// Bearer info for main user is extracted from user record, others provided manually
```

### Create Family Ticket (3-7 people total)
```typescript
// tRPC Mutation - Requires Dev Authentication
ticket.createFamilyTicket
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "userId": "110e8400-e29b-41d4-a716-44665544000b", // main user (purchaser)
  "seatId": "cc0e8400-e29b-41d4-a716-446655440016", // main user's seat
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007", // main user's team
  "family": [ // 2-6 additional family members (min 2, max 6)
    {
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "seatId": "dd0e8400-e29b-41d4-a716-446655440017",
      "bearer": {
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "phone": "+250788888892"
      }
    },
    {
      "teamId": "dd0e8400-e29b-41d4-a716-446655440008",
      "seatId": "ee0e8400-e29b-41d4-a716-446655440018",
      "bearer": {
        "name": "Bob Doe",
        "email": "bob.doe@example.com",
        "phone": "+250788888893"
      }
    },
    {
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "seatId": "ff0e8400-e29b-41d4-a716-446655440019",
      "bearer": {
        "name": "Alice Doe",
        "email": "alice.doe@example.com",
        "phone": "+250788888894"
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
      "id": "110e8400-e29b-41d4-a716-44665544001a",
      "userId": "110e8400-e29b-41d4-a716-44665544000b",
      "bearer": {
        "name": "John Doe", // main user
        "email": "john.doe@example.com",
        "phone": "+250788123456"
      },
      "orderId": null,
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "cc0e8400-e29b-41d4-a716-446655440016",
      "type": "FAMILY",
      "state": "PENDING",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    },
    {
      "id": "220e8400-e29b-41d4-a716-44665544001b",
      "userId": "110e8400-e29b-41d4-a716-44665544000b", // same purchaser
      "bearer": {
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "phone": "+250788888892"
      },
      "orderId": null,
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "dd0e8400-e29b-41d4-a716-446655440017",
      "type": "FAMILY",
      "state": "PENDING",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    },
    {
      "id": "330e8400-e29b-41d4-a716-44665544001c",
      "userId": "110e8400-e29b-41d4-a716-44665544000b", // same purchaser
      "bearer": {
        "name": "Bob Doe",
        "email": "bob.doe@example.com",
        "phone": "+250788888893"
      },
      "orderId": null,
      "teamId": "dd0e8400-e29b-41d4-a716-446655440008",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "ee0e8400-e29b-41d4-a716-446655440018",
      "type": "FAMILY",
      "state": "PENDING",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    },
    {
      "id": "440e8400-e29b-41d4-a716-44665544001d",
      "userId": "110e8400-e29b-41d4-a716-44665544000b", // same purchaser
      "bearer": {
        "name": "Alice Doe",
        "email": "alice.doe@example.com",
        "phone": "+250788888894"
      },
      "orderId": null,
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "ff0e8400-e29b-41d4-a716-446655440019",
      "type": "FAMILY",
      "state": "PENDING",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    }
  ]
}

// Creates tickets for main user + 2-6 additional family members (total 3-7 people)
// All tickets have same userId (purchaser) but different bearer information
// Bearer info for main user is extracted from user record, others provided manually
```

#### Bearer Information Handling for Group/Family Tickets

**Key Points:**
- All tickets in a group/family purchase share the same `userId` (the purchaser)
- Each ticket has individual `bearer` information for the actual attendee
- Main user's bearer info is automatically extracted from their user record
- Additional members' bearer info must be provided manually in the request
- Bearer information includes: `name`, `email`, and `phone` for each attendee
- Each ticket can have different `teamId` values (supporters of different teams)
- All tickets in the group/family expire together (15 minutes from creation)
- Payment must be made for all tickets together as a single order

### Get Tickets

#### All Tickets (Admin only)
```typescript
// tRPC Query - Requires Admin Authentication
ticket.getTickets
Headers: { Authorization: "Bearer <admin-token>" }

// Success Response:
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "tickets": [
    {
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
  ]
}
```

#### Single Ticket (Admin only)
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

#### Tickets by Event (Admin only)
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.getTicketsByEvent
Headers: { Authorization: "Bearer <admin-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005"
}

// Success Response:
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "tickets": [
    {
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
      "state": "PAID",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:05:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-44665544000f",
      "userId": "110e8400-e29b-41d4-a716-44665544000b",
      "bearer": {
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "phone": "+250788654321"
      },
      "orderId": null,
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "440e8400-e29b-41d4-a716-44665544000e",
      "type": "GIFT",
      "state": "PENDING",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    }
  ]
}
```

#### Tickets by Team (Admin only)
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.getTicketsByTeam
Headers: { Authorization: "Bearer <admin-token>" }
{
  "teamId": "cc0e8400-e29b-41d4-a716-446655440007"
}

// Success Response:
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "tickets": [
    {
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
      "state": "PAID",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:05:00.000Z"
    }
  ]
}
```

#### Tickets by State (Admin only)
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.getTicketByState
Headers: { Authorization: "Bearer <admin-token>" }
{
  "state": "PENDING" // PENDING | PAID | CANCELLED | USED
}

// Success Response:
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "tickets": [
    {
      "id": "550e8400-e29b-41d4-a716-44665544000f",
      "userId": "110e8400-e29b-41d4-a716-44665544000b",
      "bearer": {
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "phone": "+250788654321"
      },
      "orderId": null,
      "teamId": "cc0e8400-e29b-41d4-a716-446655440007",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "440e8400-e29b-41d4-a716-44665544000e",
      "type": "GIFT",
      "state": "PENDING",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:00:00.000Z"
    }
  ]
}
```

#### User's Tickets (Dev access)
```typescript
// tRPC Mutation - Requires Dev Authentication
ticket.getUserTickets
Headers: { Authorization: "Bearer <dev-token>" }
{
  "userId": "110e8400-e29b-41d4-a716-44665544000b"
}

// Success Response:
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "tickets": [
    {
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
      "state": "PAID",
      "expiresAt": "2024-12-25T19:15:00.000Z",
      "createdAt": "2024-12-25T19:00:00.000Z",
      "updatedAt": "2024-12-25T19:05:00.000Z"
    }
  ]
}

// Returns tickets where user is owner OR bearer (gift tickets)
// Only returns PAID and PENDING tickets
```

### Ticket State Management

#### Place Payment Order
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

// Success Response (Payment Success - 90% probability):
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

// Insufficient Funds Response (10% probability):
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
// - 90% success rate: tickets automatically marked as PAID, order status updated
// - 10% insufficient funds: order remains PENDING, tickets stay PENDING
// - Links tickets to order via connect relationship
```

#### Cancel Ticket (Admin only)
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
    "state": "CANCELLED",
    "expiresAt": "2024-12-25T19:15:00.000Z",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:10:00.000Z"
  }
}

// Releases seat and broadcasts SSE update
```

## QR Code Operations

### Overview
QR codes are cryptographically signed with HMAC-SHA256 for security. They contain ticket, event, and seat information and support one-time validation (PAID → USED state transition).

**Prerequisites**: [Paid Tickets](#ticket-state-management), [Dev/Admin Authentication](#authentication--authorization)  
**Related**: [Ticket Operations](#ticket-operations-1), [Security Features](#security-features)

### QR Code Management

#### Generate QR Code
```typescript
// tRPC Mutation - Requires Dev Authentication
// Note: Only works for PAID tickets
ticket.getTicketQRCode
Headers: { Authorization: "Bearer <dev-token>" }
{
  "ticketId": "330e8400-e29b-41d4-a716-44665544000d"
}

// Success Response:
{
  "success": true,
  "message": "Ticket QR code retrieved successfully",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAYAAAAxWXB3AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAACAASURBVHic7N0HmBRF+wfw...",
  "ticketInfo": {
    "event": "Concert 2024",
    "seat": "220e8400-e29b-41d4-a716-44665544000c",
    "date": "2024-12-25T19:00:00.000Z",
    "client": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+250788123456"
    }
  }
}

// Error Response (Ticket not found or not PAID):
{
  "success": false,
  "message": "Failed to retrieve ticket QR code",
  "error": "Ticket not found"
}

// QR code contains HMAC-signed payload with ticket ID, event ID, seat ID, and timestamp
// Base64 PNG format for easy integration
// Only generates QR codes for tickets in PAID state
```

### Validate QR Code
```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.validateQRCode
Headers: { Authorization: "Bearer <admin-token>" }
{
  "qrData": "eyJ0IjoiMzMwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDBkIiwiZSI6ImFhMGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwNSIsInMiOiIyMjBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMGMiLCJ0cyI6MTcwMzUzOTIwMDAwMH0.a1b2c3d4e5f6g7h8"
}

// Success Response:
{
  "success": true,
  "message": "Ticket QR code validated successfully",
  "ticket": {
    "id": "330e8400-e29b-41d4-a716-44665544000d",
    "event": "Concert 2024",
    "seat": "A1-1",
    "client": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+250788123456"
    },
    "startsAt": "2024-12-25T19:00:00.000Z"
  }
}

// Validates HMAC signature and marks PAID ticket as USED
// Returns ticket details with event and seat information
// One-time use validation (PAID → USED state transition)
```

## User Management

### Create User
```typescript
// tRPC Mutation - Requires Dev Authentication
user.createUser
Headers: { Authorization: "Bearer <dev-token>" }
{
  "username": "john_doe",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+250788123456"
}

// Success Response:
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+250788123456",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}

// Note: Phone number must be valid Rwanda format
```

### Get User (Multi-lookup)
```typescript
// tRPC Mutation - Requires Dev Authentication (Recommended for mock sign-in)
user.getUser
Headers: { Authorization: "Bearer <dev-token>" }
{
  "usernameOrEmailOrPhone": {
    "type": "email", // "username" | "email" | "phone"
    "value": "john@example.com"
  }
}

// Success Response:
{
  "success": true,
  "message": "User retrieved successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+250788123456",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}

// User Not Found Response:
{
  "success": true,
  "message": "User not found",
  "user": null
}

// Examples:
// Username lookup: { "type": "username", "value": "john_doe" }
// Email lookup: { "type": "email", "value": "john@example.com" }
// Phone lookup: { "type": "phone", "value": "+250788123456" }
```

### Get User by ID
```typescript
// tRPC Mutation - Requires Dev Authentication
user.getUserById
Headers: { Authorization: "Bearer <dev-token>" }
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}

// Success Response:
{
  "success": true,
  "message": "User retrieved successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+250788123456",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T19:00:00.000Z"
  }
}

// User Not Found Response:
{
  "success": true,
  "message": "User not found",
  "user": null
}
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

### Overview
Server-Sent Events provide real-time seat availability updates. Connections require dev role authentication and support automatic reconnection with keepalive messages.

**Prerequisites**: [Dev Authentication](#api-key-management), [Active Events](#event-management-1)  
**Related**: [Ticket Operations](#ticket-operations-1), [System Monitoring](#system-monitoring-1)

### SSE Connection Management

#### Connect to Live Seat Updates
```javascript
// Establish SSE connection for live seat availability
GET /events/{eventId}/seats/stream
Headers: { Authorization: "Bearer <dev-token>" }

// IMPORTANT: EventSource doesn't support custom headers in all browsers
// Use server-side proxy or alternative method for authentication
// Alternative: Pass token as query parameter (less secure)
// GET /events/{eventId}/seats/stream?token=<dev-token>

// JavaScript client example (requires server-side proxy for headers):
const eventSource = new EventSource(
  `/events/aa0e8400-e29b-41d4-a716-446655440005/seats/stream`
);

eventSource.onopen = (event) => {
  console.log('SSE connection established');
};

eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  switch (update.type) {
    case 'seatingPlan':
      // Full seating plan update (initial connection or bulk changes)
      console.log('Full seating plan received:', Object.keys(update.data).length, 'seats');
      setSeatingPlan(update.data);
      break;
      
    case 'seatUpdate':
      // Individual seat change (real-time updates)
      console.log(`Seat ${update.data.label} availability changed to:`, update.data.isAvailable);
      updateSeat(update.data.seatId, update.data.isAvailable, update.data.price);
      break;
      
    case 'keepalive':
      // Connection keepalive (every 5 minutes)
      console.log('SSE keepalive received');
      break;
      
    default:
      console.warn('Unknown SSE message type:', update.type);
  }
};

eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
  // EventSource automatically attempts to reconnect
  // You can implement custom reconnection logic here if needed
};

// Cleanup when done
// eventSource.close();
```

### SSE Utility Helper

For easier integration in modern applications, here's a reusable utility that handles SSE connections with proper error handling and cleanup:

```typescript
export const createSeatsStream = async (
  baseUrl: string,
  eventId: string,
  apiKey: string,
) => {
  let abortController = new AbortController();

  const connect = (
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
  ) => {
    const start = async () => {
      try {
        const ES = await fetch(`${baseUrl}/events/${eventId}/seats/stream`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: abortController.signal,
        });

        if (!ES.ok || !ES.body) {
          throw new Error(`Failed to create seats stream: ${ES.statusText}`);
        }

        const reader = ES.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data:")) {
              const data = line.slice(5).trim();
              try {
                const parsedData = JSON.parse(data);
                // Filter out keepalive messages
                if (parsedData.type !== "keepalive") {
                  onMessage(parsedData);
                }
              } catch (error) {
                onError?.(error);
              }
            }
          }
        }
      } catch (error) {
        onError?.(error);
      }
    };

    start();
    return () => abortController.abort();
  };

  return connect;
};
```

#### Usage with React Hooks

This utility works seamlessly with React hooks for real-time seat updates:

```typescript
import { useState, useEffect } from 'react';

function SeatMap({ eventId }: { eventId: string }) {
  const [seats, setSeats] = useState<Record<string, any>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const initializeStream = async () => {
      try {
        const createStream = await createSeatsStream(
          'https://your-api-url.com',
          eventId,
          'your-dev-api-key'
        );

        cleanup = createStream(
          (data) => {
            setIsConnected(true);
            
            switch (data.type) {
              case 'seatingPlan':
                // Initial seating plan received
                setSeats(data.data);
                break;
                
              case 'seatUpdate':
                // Individual seat update
                setSeats(prev => ({
                  ...prev,
                  [data.data.seatId]: {
                    ...prev[data.data.seatId],
                    isAvailable: data.data.isAvailable,
                    price: data.data.price
                  }
                }));
                break;
            }
          },
          (error) => {
            console.error('SSE Error:', error);
            setIsConnected(false);
          }
        );
      } catch (error) {
        console.error('Failed to initialize stream:', error);
        setIsConnected(false);
      }
    };

    initializeStream();

    return () => {
      cleanup?.();
      setIsConnected(false);
    };
  }, [eventId]);

  return (
    <div>
      <div>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {Object.entries(seats).map(([seatId, seat]) => (
        <div key={seatId} className={seat.isAvailable ? 'available' : 'taken'}>
          {seat.label} - ${seat.price}
        </div>
      ))}
    </div>
  );
}
```

This utility provides:
- **Automatic reconnection** via AbortController
- **Error handling** with optional error callbacks
- **Message filtering** (excludes keepalive messages)
- **Clean cleanup** when component unmounts
- **TypeScript support** for better development experience

### SSE Connection Establishment Examples

#### Successful Connection Response
When connecting to an active event, the server immediately sends the current seating plan:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Cache-Control, Authorization

data: {"type":"seatingPlan","eventId":"aa0e8400-e29b-41d4-a716-446655440005","data":{"220e8400-e29b-41d4-a716-44665544000c":{"isAvailable":true,"price":50.00,"label":"A1-1","category":"VIP","section":{"id":"bb0e8400-e29b-41d4-a716-446655440006","name":"Section A","svgPathData":"path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2163.213083 2163.407551 L 2163.213083 2339.908858 L 2023.382881 2339.908858 L 2023.382881 2163.602344 Z M 2163.213083 2163.407551 ' transform='matrix(3.749972,0,0,3.749972,-2399.141317,-0.839315)'"}}},"timestamp":1703539200000}

: keepalive 1703539230000

data: {"type":"seatUpdate","eventId":"aa0e8400-e29b-41d4-a716-446655440005","data":{"seatId":"220e8400-e29b-41d4-a716-44665544000c","isAvailable":false,"price":50.00,"label":"A1-1"},"timestamp":1703539260000}

```

#### Error Responses

**Event Not Found (404)**
```json
{
  "success": false,
  "message": "Event not found or inactive"
}
```

**Authentication Failed (401)**
```json
{
  "success": false,
  "message": "Unauthorized - Invalid token"
}
```

**Invalid Role (401)**
```json
{
  "success": false,
  "message": "Unauthorized - Invalid role for SSE access"
}
```

**Note**: SSE endpoints require dev role authentication. Only dev API keys or dev tokens are authorized for SSE access. Admin and alpha tokens will be rejected with a 401 error.

**Server Error (500)**
```json
{
  "success": false,
  "message": "Failed to establish stream",
  "error": "Database connection failed"
}
```

### SSE Message Types

#### Full Seating Plan Update
Sent when client first connects or when multiple seats change simultaneously.

```json
{
  "type": "seatingPlan",
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "data": {
    "220e8400-e29b-41d4-a716-44665544000c": {
      "isAvailable": false,
      "price": 50.00,
      "label": "A1-1",
      "category": "VIP",
      "section": {
        "id": "bb0e8400-e29b-41d4-a716-446655440006",
        "name": "Section A",
        "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2370.081842 2429.814044 L 2370.081842 2563.504617 L 2183.285666 2563.504617 L 2183.285666 2550.057643 L 2199.997248 2550.057643 L 2199.997248 2456.490283 L 2183.363792 2456.490283 L 2183.363792 2429.756752 Z M 2370.081842 2429.814044 ' transform='matrix(-3.749972,0,0,3.749972,13301.330915,-10.739076)'"
      }
    },
    "330e8400-e29b-41d4-a716-44665544000d": {
      "isAvailable": true,
      "price": 50.00,
      "label": "A1-2",
      "category": "VIP",
      "section": {
        "id": "bb0e8400-e29b-41d4-a716-446655440006",
        "name": "Section A",
        "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2163.382529 2429.96377 L 2163.382529 2456.49105 L 2146.569905 2456.49105 L 2146.569905 2549.784449 L 2163.382529 2549.784449 L 2163.382529 2563.702261 L 2022.822113 2563.702261 L 2022.822113 2550.059451 L 2040.323285 2550.059451 L 2040.323285 2456.215006 L 2023.188783 2456.215006 L 2023.188783 2429.959604 Z M 2163.382529 2429.96377 ' transform='matrix(3.749972,0,0,3.749972,-2401.577517,-11.831796)'"
      }
    },
    "440e8400-e29b-41d4-a716-44665544000e": {
      "isAvailable": true,
      "price": 30.00,
      "label": "B2-1",
      "category": "Regular",
      "section": {
        "id": "ff0e8400-e29b-41d4-a716-44665544000a",
        "name": "Section B",
        "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2163.381736 2429.963056 L 2163.381736 2456.490335 L 2146.570153 2456.490335 L 2146.570153 2549.783735 L 2163.381736 2549.783735 L 2163.381736 2563.702588 L 2022.822362 2563.702588 L 2022.822362 2550.059779 L 2040.323533 2550.059779 L 2040.323533 2456.215333 L 2023.18799 2456.215333 L 2023.18799 2429.959931 Z M 2163.381736 2429.963056 ' transform='matrix(3.749972,0,0,3.749972,-1800.926105,-10.973648)'"
      }
    }
  },
  "timestamp": 1703539200000
}
```

#### Individual Seat Update
Sent when a single seat's availability changes (more efficient for single seat changes).

```json
{
  "type": "seatUpdate",
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "data": {
    "seatId": "220e8400-e29b-41d4-a716-44665544000c",
    "isAvailable": false,
    "price": 50.00,
    "label": "A1-1"
  },
  "timestamp": 1703539260000
}
```

**Note**: The seatUpdate message includes basic seat information but does not include section data. For complete seat information including section details, refer to the initial seatingPlan message or maintain section data on the client side.

#### Keepalive Messages
The server sends two types of keepalive messages:

**1. Keepalive Comments (every 30 seconds)**
```
: keepalive 1703539320000
```
These are SSE comments that prevent proxy timeouts and maintain the connection.

**2. Keepalive JSON Messages (every 5 minutes)**
```json
{
  "type": "keepalive",
  "timestamp": 1703539320000
}
```
These are structured messages for connection health monitoring and dead connection detection.

### SSE Connection Management

#### Connection Lifecycle
```javascript
// 1. Client establishes connection with dev token authentication (Bearer token in Authorization header)
// 2. Server validates event exists and is active
// 3. Server sends initial seatingPlan message with current state
// 4. Server adds connection to event-specific connection pool
// 5. Server sends keepalive comments every 30 seconds (: keepalive timestamp)
// 6. Server sends keepalive JSON messages every 5 minutes for connection health
// 7. Server broadcasts seat updates to all connected clients
// 8. Connection automatically cleaned up on client disconnect or error

// Connection Features:
// - Requires dev role authentication (dev API key or dev token)
// - Automatic reconnection on network failure (built into EventSource)
// - Keepalive comments every 30 seconds to prevent proxy timeouts
// - Keepalive JSON messages every 5 minutes to detect dead connections
// - Stale connections cleaned up after 1 hour of inactivity
// - Multiple clients can connect to same event stream
// - Efficient broadcasting to all connected clients per event
// - Graceful error handling and automatic connection cleanup
// - Connection statistics tracking for monitoring
```

#### Connection Statistics and Monitoring
The SSE manager tracks detailed connection statistics and performs automatic maintenance:

```javascript
// Connection tracking includes:
// - Total active connections across all events
// - Number of events with active connections
// - Per-event connection counts with event IDs
// - Connection establishment timestamps for each client
// - User identification (keyId) for each connection
// - Automatic cleanup of stale connections every 10 minutes
// - Dead connection detection through keepalive message failures
// - Connection duration tracking for monitoring purposes

// Automatic maintenance:
// - Stale connections (>1 hour old) are automatically cleaned up
// - Dead connections are detected and removed during broadcast attempts
// - Keepalive intervals are managed per connection (5 minutes for JSON messages)
// - Connection statistics are updated in real-time
```

#### Error Handling and Recovery
```javascript
// Client-side error handling:
eventSource.addEventListener('error', (event) => {
  if (eventSource.readyState === EventSource.CONNECTING) {
    console.log('SSE reconnecting...');
  } else if (eventSource.readyState === EventSource.CLOSED) {
    console.log('SSE connection closed');
    // Implement custom reconnection logic if needed
  }
});

// Server-side error scenarios:
// - Invalid or expired authentication token → 401 response
// - Event not found or inactive → 404 response  
// - Database connection failure → 500 response
// - Network errors → automatic client reconnection
// - Stale connections → automatic server cleanup
```

### SSE Statistics (Monitoring)
```typescript
// REST Endpoint - Requires Dev Authentication
GET /sse/stats
Headers: { Authorization: "Bearer <dev-token>" }

// Returns real-time connection statistics for monitoring and debugging
// Success Response (200 OK):
{
  "success": true,
  "message": "SSE statistics retrieved",
  "stats": {
    "totalConnections": 15,
    "eventsWithConnections": 3,
    "connectionsByEvent": [
      { 
        "eventId": "aa0e8400-e29b-41d4-a716-446655440005", 
        "connections": 8 
      },
      { 
        "eventId": "bb0e8400-e29b-41d4-a716-446655440006", 
        "connections": 5 
      },
      { 
        "eventId": "cc0e8400-e29b-41d4-a716-446655440007", 
        "connections": 2 
      }
    ]
  }
}

// Error Response (401 Unauthorized):
{
  "success": false,
  "message": "Unauthorized - Invalid role for SSE access"
}
```

**Usage**: This endpoint is useful for monitoring SSE connection health, debugging connection issues, and understanding system load. It shows the total number of active connections and breaks them down by event.

## System Monitoring

### Health Check
```typescript
// REST Endpoint - No Authentication Required
GET /health

// Returns system health status

// Success Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2024-12-25T19:00:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "used": "45MB",
    "total": "128MB"
  },
  "database": "connected",
  "version": "1.0.0"
}

// Error Response (503 Service Unavailable):
{
  "status": "unhealthy",
  "timestamp": "2024-12-25T19:00:00.000Z",
  "error": "Database connection failed"
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
PAY_KEY="your-payment-api-key"           # Payment gateway authentication
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

All endpoints return standardized responses with consistent error formats:

### Success Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Authentication Errors (401 Unauthorized)

#### Missing Token
```json
{
  "error": {
    "message": "Unauthorized - No token provided",
    "code": "UNAUTHORIZED"
  }
}
```

#### Invalid Token
```json
{
  "error": {
    "message": "Unauthorized - Invalid token",
    "code": "UNAUTHORIZED"
  }
}
```

#### Invalid Role
```json
{
  "error": {
    "message": "Unauthorized - Invalid role",
    "code": "UNAUTHORIZED"
  }
}
```

#### Expired Token
```json
{
  "error": {
    "message": "Unauthorized - Invalid token",
    "code": "UNAUTHORIZED"
  }
}
```

### Authentication Failures (403 Forbidden)

#### Incorrect Password
```json
{
  "success": false,
  "message": "Incorrect password",
  "user": null
}
```

#### Incorrect Phrase
```json
{
  "success": false,
  "message": "Incorrect phrase",
  "user": null
}
```

#### User Not Found
```json
{
  "success": false,
  "message": "User not found",
  "user": null
}
```

### Validation Errors (400 Bad Request)

#### Missing Required Fields
```json
{
  "error": {
    "message": "Input validation failed",
    "code": "BAD_REQUEST",
    "issues": [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": ["name"],
        "message": "Required"
      }
    ]
  }
}
```

#### Invalid Data Types
```json
{
  "error": {
    "message": "Input validation failed",
    "code": "BAD_REQUEST",
    "issues": [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "number",
        "path": ["eventId"],
        "message": "Expected string, received number"
      }
    ]
  }
}
```

#### Invalid Date Format
```json
{
  "error": {
    "message": "Input validation failed",
    "code": "BAD_REQUEST",
    "issues": [
      {
        "code": "custom",
        "path": ["startsAt"],
        "message": "Event start time must be in the future"
      }
    ]
  }
}
```

#### Invalid Email Format
```json
{
  "error": {
    "message": "Input validation failed",
    "code": "BAD_REQUEST",
    "issues": [
      {
        "code": "invalid_string",
        "validation": "email",
        "path": ["nameOrEmail"],
        "message": "Invalid email"
      }
    ]
  }
}
```

### Business Logic Errors (400 Bad Request)

#### Ticket Limit Exceeded
```json
{
  "success": false,
  "message": "Failed to create ticket",
  "error": "User has reached the limit of 14 tickets"
}
```

#### Seat Already Booked
```json
{
  "success": false,
  "message": "Failed to create ticket",
  "error": "Seat is already booked"
}
```

#### Event Not Found
```json
{
  "success": false,
  "message": "Event not found",
  "event": null
}
```

#### Venue Not Found
```json
{
  "success": false,
  "message": "Venue not found",
  "venue": null
}
```

#### Ticket Not Found
```json
{
  "success": false,
  "message": "Ticket not found",
  "order": null
}
```

#### Invalid Team Count
```json
{
  "success": false,
  "message": "Failed to create event",
  "error": "Event must have exactly 2 teams"
}
```

#### Invalid Group Size
```json
{
  "success": false,
  "message": "Failed to create ticket",
  "error": "Group tickets require 2-4 additional members (3-5 total)"
}
```

#### Invalid Family Size
```json
{
  "success": false,
  "message": "Failed to create ticket",
  "error": "Family tickets require 2-6 additional members (3-7 total)"
}
```

#### Seat Section Not Found
```json
{
  "success": false,
  "message": "One or more sections not found",
  "seats": null
}
```

### Rate Limiting Errors (429 Too Many Requests)

#### Rate Limit Exceeded
```json
{
  "error": {
    "message": "Rate limit exceeded. Reset at 2024-12-25T20:00:00.000Z",
    "code": "TOO_MANY_REQUESTS"
  }
}
```

Response Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1703548800
```

### Server Errors (500 Internal Server Error)

#### Database Connection Error
```json
{
  "success": false,
  "message": "Failed to create event",
  "error": "Database connection failed"
}
```

#### Payment Gateway Error
```json
{
  "success": false,
  "message": "Failed to place payment order",
  "error": "Payment gateway temporarily unavailable"
}
```

#### QR Code Generation Error
```json
{
  "success": false,
  "message": "Failed to retrieve ticket QR code",
  "error": "QR code generation failed"
}
```

#### JWT Secret Missing
```json
{
  "error": {
    "message": "Internal server error",
    "code": "INTERNAL_SERVER_ERROR"
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors, business logic errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (incorrect credentials)
- `404` - Not Found (resource not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server/database errors)
- `503` - Service Unavailable (health check failures)

---

## Workflow Examples & Practices

### Complete Event Setup Workflow

This example demonstrates the complete process of setting up an event from scratch:

```typescript
// 1. Authenticate as Admin
const adminLogin = await fetch('/trpc/admin.login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nameOrEmail: "admin@example.com",
    password: "secure_password",
    phrase: "security_phrase"
  })
});
const { token: adminToken } = await adminLogin.json();

// 2. Create Venue with Sections
const venue = await fetch('/trpc/venue.createVenue', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    name: "Main Arena",
    description: "Large concert venue",
    location: { longitude: -1.9441, latitude: 30.0619 }
  })
});
const { venue: venueData } = await venue.json();

// 3. Create Seat Sections
const section = await fetch('/trpc/venue.createSeatSection', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    venueId: venueData.id,
    name: "Section A",
    svgPathData: "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2370.082139 2429.813832 L 2370.082139 2563.504405 L 2183.285964 2563.504405 L 2183.285964 2550.057431 L 2199.996504 2550.057431 L 2199.996504 2456.491113 L 2183.36409 2456.491113 L 2183.36409 2429.75654 Z M 2370.082139 2429.813832 ' transform='matrix(3.749972,0,0,3.749972,0,0)'"
  })
});
const { section: sectionData } = await section.json();

// 4. Create Seats for the Section
const seats = await fetch('/trpc/seat.createSeats', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    venueId: venueData.id,
    seats: [
      { sectionId: sectionData.id, row: 1, number: 1 },
      { sectionId: sectionData.id, row: 1, number: 2 },
      { sectionId: sectionData.id, row: 1, number: 3 }
    ]
  })
});

// 5. Create Event
const event = await fetch('/trpc/event.createEvent', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    name: "Concert 2024",
    description: "Amazing live performance",
    venueId: venueData.id,
    startsAt: "2024-12-25T19:00:00Z",
    teams: [
      { name: "Team Alpha", description: "First team", logoUrl: "https://example.com/logo1.png" },
      { name: "Team Beta", description: "Second team", logoUrl: "https://example.com/logo2.png" }
    ]
  })
});
const { event: eventData } = await event.json();

// 6. Create Event Seats with Pricing
const eventSeats = await fetch('/trpc/seat.createEventSeats', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    eventId: eventData.id,
    seats: [
      { seatId: "seat-id-1", price: 50.00, category: "VIP" },
      { seatId: "seat-id-2", price: 30.00, category: "Regular" }
    ]
  })
});

console.log("Event setup complete! Event ID:", eventData.id);
```

### Ticket Purchase Workflow

This example shows the complete ticket purchase process:

```typescript
// 1. Get Dev API Key (created by Alpha user)
const devToken = "your-dev-api-key";

// 2. Check Event Seat Availability
const eventSeats = await fetch('/trpc/seat.getEventSeats', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${devToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ eventId: "event-id" })
});
const { eventSeats: availableSeats } = await eventSeats.json();

// 3. Create Ticket (Single)
const ticket = await fetch('/trpc/ticket.createTicket', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${devToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    eventId: "event-id",
    teamId: "team-id",
    userId: "user-id",
    seatId: "seat-id"
  })
});
const { ticket: ticketData } = await ticket.json();

// 4. Place Payment Order
const order = await fetch('/trpc/ticket.placePaymentOrder', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${devToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    userId: "user-id",
    tickets: [{ id: ticketData.id }]
  })
});

// 5. After Payment Success - Generate QR Code
const qrCode = await fetch('/trpc/ticket.getTicketQRCode', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${devToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ ticketId: ticketData.id })
});
const { qrCode: qrCodeData } = await qrCode.json();

console.log("Ticket purchased successfully! QR Code:", qrCodeData);
```

### Group Ticket Purchase Workflow

This example demonstrates creating group tickets for multiple people:

```typescript
// Create Group Ticket (3-5 people total)
const groupTicket = await fetch('/trpc/ticket.createGroupTicket', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${devToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    eventId: "event-id",
    userId: "main-user-id", // purchaser
    seatId: "main-user-seat-id",
    teamId: "main-user-team-id",
    group: [
      {
        teamId: "team-id-1",
        seatId: "seat-id-1",
        bearer: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "+250788888889"
        }
      },
      {
        teamId: "team-id-2",
        seatId: "seat-id-2",
        bearer: {
          name: "Bob Smith",
          email: "bob@example.com",
          phone: "+250788888890"
        }
      }
    ]
  })
});

const { tickets: groupTickets } = await groupTicket.json();

// All tickets share the same userId (purchaser) but have different bearer info
// Payment must be made for all tickets together
const groupOrder = await fetch('/trpc/ticket.placePaymentOrder', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${devToken}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    userId: "main-user-id",
    tickets: groupTickets.map(ticket => ({ id: ticket.id }))
  })
});
```

## License

MIT License - See package.json for details.
