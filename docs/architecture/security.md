# Security Architecture

## Authentication System

### User Roles
- **ALPHA**: Super admin access via DEV role, can create API keys and manage system
- **ADMIN**: Full system access with dedicated admin router, event and ticket management
- **DEV**: API access with rate limiting (300 requests/hour)

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
2. Rate limiting: 300 requests/hour for dev API keys
3. Long-lived tokens (15 days expiration)
4. Uses JWT_SECRET for token signing

#### General
- JWT token usage with Bearer authentication
- Automatic rate limiting and token validation for API keys
- Different JWT secrets for different token types

## Security Features

### Password Security
- Bcrypt password hashing with salt
- Secure password storage with no plaintext exposure
- Triple authentication for admin access (username + password + phrase)

### Token Security
- JWT token expiration (1 day for alpha, 1 hour for admin, 15 days for API keys)
- Separate JWT secrets for different authentication types:
  - ALPHA_JWT_SECRET for alpha login tokens
  - ADMIN_JWT_SECRET for admin API keys
  - JWT_SECRET for dev API keys

### QR Code Security
- HMAC-SHA256 signed QR codes
- Anti-tampering protection with payload signing
- Cryptographically secure QR generation
- One-time use validation

### Rate Limiting
- Rate limiting with automatic cleanup (100 requests/hour for admin, 300 for dev API keys)
- Role-based endpoint protection
- In-memory rate limiting with efficient cleanup
- Prometheus metrics for rate limit violations

### API Security
- Role-based access control for all endpoints
- Bearer token authentication required
- Input validation with Zod schemas
- Comprehensive error handling without information leakage

### Database Security
- Prisma ORM with parameterized queries (SQL injection protection)
- Transaction-based operations for data consistency
- Structured logging without sensitive data exposure

## Environment Variables

Required security-related environment variables:

```bash
# JWT Secrets (must be different for each)
ALPHA_JWT_SECRET=your-alpha-secret-key
ADMIN_JWT_SECRET=your-admin-secret-key
JWT_SECRET=your-dev-secret-key

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database

# QR Code Security
QR_SECRET=your-qr-signing-secret
```

## Best Practices

### Token Management
- Use different JWT secrets for different token types
- Implement proper token expiration
- Provide token refresh mechanisms for short-lived tokens
- Log authentication events for audit trails

### Rate Limiting
- Implement role-based rate limiting
- Monitor rate limit violations
- Use efficient in-memory rate limiting
- Provide clear error messages for rate limit exceeded

### Data Protection
- Hash all passwords with bcrypt
- Sign QR codes with HMAC
- Validate all inputs with Zod schemas
- Use transactions for data consistency

### Monitoring
- Track authentication failures
- Monitor rate limit violations
- Log security events
- Set up alerts for suspicious activity