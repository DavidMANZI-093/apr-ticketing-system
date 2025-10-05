# Getting Started

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn package manager
- Git

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd apr-ticketing-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/apr_ticketing"

# JWT Secrets (generate unique secrets for each)
ALPHA_JWT_SECRET="your-alpha-secret-key"
ADMIN_JWT_SECRET="your-admin-secret-key"
JWT_SECRET="your-dev-secret-key"

# QR Code Security
QR_SECRET="your-qr-signing-secret"

# Optional: Email configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 4. Database Setup

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
npm run db:generate

# Reset database and run migrations
npm run db:reset

# Optional: Seed database with sample data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

## Verification

### Check Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-25T19:00:00.000Z",
  "uptime": 5.123,
  "memory": {
    "used": "25MB",
    "total": "50MB"
  },
  "database": "connected",
  "version": "1.0.0"
}
```

### Check Metrics Endpoint

Metrics are now protected by Alpha authentication:

```bash
# Login to get Alpha token
curl -X POST http://localhost:3000/trpc/alpha.login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-alpha-username","password":"your-password","phrase":"your-phrase"}'

# Use token to access metrics
curl -H "Authorization: Bearer <your-alpha-token>" http://localhost:3000/metrics
```

Should return Prometheus-formatted metrics in text format.

## Development Workflow

### Database Changes

When making database schema changes:

1. Update `prisma/schema.prisma`
2. Generate migration:
   ```bash
   npx prisma migrate dev --name your-migration-name
   ```
3. Generate client:
   ```bash
   npm run db:generate
   ```

### Code Formatting

Format code before committing:

```bash
npm run format
```

### Testing

Run tests:

```bash
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Project Structure

```
src/
├── controllers/          # Database and tRPC setup
├── middleware/          # Authentication and metrics
├── routes/              # API endpoint definitions
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── server.ts           # Main application entry point

docs/                   # Documentation
├── api/                # API documentation
├── architecture/       # System architecture docs
├── deployment/         # Deployment guides
├── monitoring/         # Monitoring setup
└── development/        # Development guides

prisma/
├── migrations/         # Database migrations
└── schema.prisma      # Database schema
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run format` - Format code with Biome
- `npm run db:generate` - Generate Prisma client
- `npm run db:reset` - Reset database and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## Common Issues

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Check DATABASE_URL in `.env`
3. Verify database exists and user has permissions

### Port Already in Use

If port 3000 is in use, you can change it by setting the PORT environment variable:

```bash
PORT=3001 npm run dev
```

### Prisma Client Issues

If you encounter Prisma client issues:

```bash
# Regenerate client
npm run db:generate

# Reset database if needed
npm run db:reset
```

### Environment Variables

Ensure all required environment variables are set in `.env`. Missing JWT secrets will cause authentication to fail.

## Next Steps

1. Read the [API Authentication Guide](../api/authentication.md) to understand the authentication system
2. Explore the [API Documentation](../api/) to understand available endpoints
3. Check out the [Architecture Overview](../architecture/overview.md) to understand the system design
4. Set up [Monitoring](../monitoring/prometheus.md) for production-ready observability

## Getting Help

- Check the documentation in the `docs/` folder
- Review error logs in the console
- Ensure all prerequisites are installed and configured
- Verify environment variables are set correctly