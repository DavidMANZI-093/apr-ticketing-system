# APR Ticketing System

A comprehensive event ticketing system built with TypeScript, tRPC, and Prisma. Features secure authentication, QR code generation, real-time seat updates, and comprehensive event management with payment processing integration and production-ready monitoring.

## Quick Start

- [Getting Started](docs/development/getting-started.md) - Local setup and development
- [Environment Setup](docs/deployment/environment.md) - Configuration and variables
- [API Authentication](docs/api/authentication.md) - Get your API keys

## Documentation

### API Reference
- [Authentication & Authorization](docs/api/authentication.md) - JWT tokens, roles, and rate limiting
- [Event Management](docs/api/events.md) - Create, update, and manage events
- [Ticket Operations](docs/api/tickets.md) - All ticket types and lifecycle management
- [Venue & Seat Management](docs/api/venues-seats.md) - Venue, sections, and seat operations
- [User Management](docs/api/users.md) - User lookup and management
- [QR Code Operations](docs/api/qr-codes.md) - Generation and validation
- [Team Management](docs/api/teams.md) - Team CRUD operations
- [Analytics](docs/api/analytics.md) - Revenue and statistics

### Architecture
- [System Overview](docs/architecture/overview.md) - Core technologies and project structure
- [Database Schema](docs/architecture/database.md) - Prisma models and relationships
- [Real-time Features](docs/architecture/real-time.md) - SSE implementation and usage
- [Security](docs/architecture/security.md) - Authentication, authorization, and best practices

### Monitoring & Operations
- [Metrics & Monitoring](docs/monitoring/metrics.md) - Prometheus metrics collection
- [Prometheus Setup](docs/monitoring/prometheus.md) - Configuration and alerting
- [Health Checks](docs/monitoring/health-checks.md) - System health endpoints
- [Logging](docs/monitoring/logging.md) - Structured logging implementation

### Deployment
- [Production Deployment](docs/deployment/production.md) - Production setup and considerations
- [Environment Configuration](docs/deployment/environment.md) - Required environment variables

### Development
- [Getting Started](docs/development/getting-started.md) - Local development setup
- [Testing](docs/development/testing.md) - Testing guidelines and setup
- [Contributing](docs/development/contributing.md) - Development guidelines

## Architecture Overview

The system is built with a modern, scalable architecture:

**Core Technologies:**
- Backend: Node.js + Express + tRPC
- Database: PostgreSQL with Prisma ORM
- Authentication: JWT with role-based access control
- Real-time: Server-Sent Events (SSE) for live updates
- Monitoring: Comprehensive Prometheus metrics
- Security: HMAC-signed QR codes, bcrypt hashing, rate limiting

**Key Features:**
- Real-time seat availability updates via SSE
- Secure QR code generation with anti-tampering protection
- Role-based authentication (Alpha, Admin, Dev)
- Comprehensive Prometheus monitoring and alerting
- Automatic ticket expiration and cleanup
- Mock payment processing with configurable success rates

## Core Features

### Ticket System
Multiple ticket types with comprehensive lifecycle management:
- **SINGLE**: Individual tickets
- **GROUP**: 3-5 people (main user + 2-4 additional)
- **FAMILY**: 3-7 people (main user + 2-6 additional)
- **GIFT**: Tickets purchased for other users

All tickets follow the lifecycle: PENDING (15min expiry) → PAID → USED, with automatic cleanup via cron jobs.

### Real-time Updates
Server-Sent Events provide live seat availability updates to connected clients, ensuring users see real-time changes as tickets are purchased or released.

### Security & Authentication
Three-tier authentication system with JWT tokens:
- **Alpha**: Super admin access with API key creation
- **Admin**: Full system access with 1-hour tokens
- **Dev**: API access with rate limiting (300 req/hour)

### Payment Processing
Mock payment simulation with configurable success rates, automatic state transitions, and comprehensive order management.

### Monitoring
Production-ready observability with Prometheus metrics covering:
- Request performance and error rates
- Business metrics (tickets, payments, seats)
- System health and resource usage
- Real-time connection monitoring

## Base URLs

```
tRPC API: http://localhost:3000/trpc
SSE Streams: http://localhost:3000/events
Metrics: http://localhost:3000/metrics (Alpha auth required)
Health: http://localhost:3000/health
```

## Authentication

All API endpoints require Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

See [Authentication Guide](docs/api/authentication.md) for detailed information on obtaining and using tokens.

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL
- npm or yarn

### Quick Setup
```bash
# Clone repository
git clone <repository-url>
cd apr-ticketing-system

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:generate
npm run db:reset

# Start development server
npm run dev
```

For detailed setup instructions, see [Getting Started](docs/development/getting-started.md).

## Production Deployment

The system includes comprehensive monitoring and is production-ready with:
- Prometheus metrics collection
- Health check endpoints
- Structured logging
- Rate limiting and security features
- Automatic resource cleanup

See [Production Deployment](docs/deployment/production.md) for detailed deployment instructions.

## Contributing

We welcome contributions! Please see our [Contributing Guide](docs/development/contributing.md) for development guidelines and best practices.

## License

MIT License - see LICENSE file for details.