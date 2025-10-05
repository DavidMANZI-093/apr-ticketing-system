# Authentication & Authorization

## Overview

The APR Ticketing System uses JWT-based authentication with three distinct roles and comprehensive rate limiting. All API endpoints require Bearer token authentication.

## Base URLs

```
tRPC API: http://localhost:3000/trpc
SSE Streams: http://localhost:3000/events
System Endpoints: http://localhost:3000
```

## Authentication

All endpoints require Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

## User Roles

- **ALPHA**: Super admin access (DEV role) - can create API keys and manage system
- **ADMIN**: Full system access - event and ticket management with 1-hour tokens
- **DEV**: API access with rate limiting (300 requests/hour) - 15-day tokens

## Authentication Endpoints

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

## API Key Management

### Create API Key
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

### Get Metrics (Prometheus)
```typescript
// tRPC Query - Requires Alpha Authentication
alpha.getMetrics
Headers: { Authorization: "Bearer <alpha-token>" }

// Success Response:
{
  "success": true,
  "message": "Metrics retrieved successfully",
  "metrics": "# HELP trpc_request_duration_seconds Duration of tRPC requests in seconds\n# TYPE trpc_request_duration_seconds histogram\ntrpc_request_duration_seconds_bucket{procedure=\"ticket.createTicket\",status=\"success\",role=\"dev\",le=\"0.005\"} 145\n...",
  "contentType": "text/plain; version=0.0.4; charset=utf-8"
}

// Error Response:
{
  "success": false,
  "message": "Failed to retrieve metrics",
  "error": "Detailed error message"
}
```

## Admin Token Management

### Refresh Admin Token
```typescript
// tRPC Mutation - Requires Admin Authentication
admin.refreshAdminToken
Headers: { Authorization: "Bearer <admin-token>" }
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlJZCI6IjY2MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTU0NDAwMSIsIm5hbWUiOiJhZG1pbiIsImlhdCI6MTcwMzUzOTIwMCwiZXhwIjoxNzAzNTQyODAwfQ.old_signature"
}

// Success Response:
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlJZCI6IjY2MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTU0NDAwMSIsIm5hbWUiOiJhZG1pbiIsImlhdCI6MTcwMzU0MjgwMCwiZXhwIjoxNzAzNTQ2NDAwfQ.new_signature"
}
```

### Admin Logout
```typescript
// tRPC Mutation - Requires Admin Authentication
admin.logout
Headers: { Authorization: "Bearer <admin-token>" }
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlJZCI6IjY2MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTU0NDAwMSIsIm5hbWUiOiJhZG1pbiIsImlhdCI6MTcwMzUzOTIwMCwiZXhwIjoxNzAzNTQyODAwfQ.signature"
}

// Success Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Rate Limiting

### Limits by Role
- **Alpha**: No rate limiting
- **Admin**: 100 requests per hour
- **Dev**: 300 requests per hour

### Rate Limit Headers
Response headers include rate limit information:
```
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1703542800
```

### Rate Limit Exceeded Response
```json
{
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate limit exceeded. Reset at 2024-12-25T20:00:00.000Z"
  }
}
```

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Authentication Error
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized - Invalid token"
  }
}
```

## Security Best Practices

### Token Management
- Store tokens securely (not in localStorage for sensitive apps)
- Implement token refresh for admin tokens
- Handle token expiration gracefully
- Use different tokens for different environments

### API Usage
- Always use HTTPS in production
- Implement proper error handling
- Respect rate limits
- Log authentication events for audit trails

### Environment Variables
Required for authentication:
```bash
ALPHA_JWT_SECRET=your-alpha-secret-key
ADMIN_JWT_SECRET=your-admin-secret-key
JWT_SECRET=your-dev-secret-key
```