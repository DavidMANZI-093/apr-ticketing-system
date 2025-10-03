# System Architecture

## Overview

The APR Ticketing System is a comprehensive event ticketing platform built with TypeScript, tRPC, and Prisma. The system provides secure authentication, real-time seat updates, QR code generation, and comprehensive event management with payment processing integration.

## Core Technologies

- **Backend**: Node.js + Express + tRPC
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control (Admin, Dev, Alpha)
- **Real-time**: Server-Sent Events (SSE) for live seat updates
- **Security**: Rate limiting, HMAC-signed QR codes, bcrypt password hashing
- **Scheduling**: Dynamic cron jobs with adaptive intervals (node-cron)
- **Payment**: External payment gateway integration
- **QR Codes**: QR code generation with qrcode library
- **Validation**: Zod for input validation and schema enforcement
- **Monitoring**: Prometheus metrics with comprehensive observability

## Project Structure

```
src/
├── controllers/          # Database and tRPC setup
│   ├── app.ts           # Application configuration
│   ├── prisma.ts        # Prisma client configuration
│   └── trpc.ts          # tRPC context and router setup
├── middleware/          # Authentication and authorization
│   ├── admin-procedure.ts   # Admin API key middleware (100 req/hour, ADMIN_JWT_SECRET)
│   ├── alpha-procedure.ts   # Alpha login middleware (no rate limit, ALPHA_JWT_SECRET)
│   ├── dev-procedure.ts     # Dev API key middleware (300 req/hour, JWT_SECRET)
│   ├── metrics-middleware.ts # Prometheus metrics collection
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
│   ├── metrics.ts          # Prometheus metrics definitions
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
- Mock payment simulation with 70% success rate
- Automatic ticket state updates upon payment confirmation
- Order creation and ticket linking
- Comprehensive error handling and logging

### Monitoring and Observability
- Comprehensive Prometheus metrics collection
- Request duration, volume, and error tracking
- Business metrics for tickets, payments, and seats
- SSE connection monitoring
- Cron job execution tracking
- Rate limiting metrics