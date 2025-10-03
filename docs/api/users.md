# User Management

## Overview

The user management system provides comprehensive user operations including creation, lookup by multiple identifiers, and ID-based retrieval. Phone number validation is integrated for Rwanda format numbers.

## User Operations

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

// Error Response (Validation failure):
{
  "success": false,
  "message": "Failed to create user",
  "error": "Invalid phone number"
}
```

**Validation Rules:**
- Username: Required, string
- Name: Required, string
- Email: Required, valid email format
- Phone: Required, valid Rwanda phone number format (+250...)

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
```

**Lookup Examples:**

Username lookup:
```json
{
  "usernameOrEmailOrPhone": {
    "type": "username",
    "value": "john_doe"
  }
}
```

Email lookup:
```json
{
  "usernameOrEmailOrPhone": {
    "type": "email", 
    "value": "john@example.com"
  }
}
```

Phone lookup:
```json
{
  "usernameOrEmailOrPhone": {
    "type": "phone",
    "value": "+250788123456"
  }
}
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

## Phone Number Validation

### Rwanda Phone Format

The system validates phone numbers specifically for Rwanda using `libphonenumber-js`:

**Valid formats:**
- `+250788123456` (international format)
- `0788123456` (national format, converted to international)

**Invalid formats:**
- `788123456` (missing country code/prefix)
- `+1234567890` (non-Rwanda number)
- `250788123456` (missing + for international)

### Validation Implementation

```typescript
import { isValidNumber } from "libphonenumber-js";

// Validation in Zod schema
z.string().refine(
  (value) => isValidNumber(value, "RW"), 
  "Invalid phone number"
)
```

## Use Cases

### User Registration Flow

```typescript
// 1. Create new user
const createResponse = await fetch('/trpc/user.createUser', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <dev-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'john_doe',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+250788123456'
  })
});

const userData = await createResponse.json();
if (userData.success) {
  console.log('User created:', userData.user.id);
}
```

### User Login/Authentication Flow

```typescript
// 1. Look up user by email (or username/phone)
const loginResponse = await fetch('/trpc/user.getUser', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <dev-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    usernameOrEmailOrPhone: {
      type: 'email',
      value: 'john@example.com'
    }
  })
});

const loginData = await loginResponse.json();
if (loginData.success && loginData.user) {
  // User found, proceed with authentication
  console.log('User found:', loginData.user.id);
} else {
  // User not found
  console.log('Invalid credentials');
}
```

### User Profile Retrieval

```typescript
// Get user details by ID
const profileResponse = await fetch('/trpc/user.getUserById', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <dev-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 'user-uuid'
  })
});

const profileData = await profileResponse.json();
if (profileData.success && profileData.user) {
  // Display user profile
  console.log('User profile:', profileData.user);
}
```

## Integration with Ticket System

### User-Ticket Relationship

Users are linked to tickets in multiple ways:

**As Ticket Owner:**
- User who purchases the ticket
- `ticket.userId` field references user ID
- Can purchase up to 14 tickets per user

**As Ticket Bearer:**
- Person who will use the ticket (for gift tickets)
- `ticket.bearer` object contains user information
- May be different from ticket owner

### Example: Gift Ticket Flow

```typescript
// 1. Find gift recipient by email
const recipientResponse = await fetch('/trpc/user.getUser', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <dev-token>' },
  body: JSON.stringify({
    usernameOrEmailOrPhone: {
      type: 'email',
      value: 'recipient@example.com'
    }
  })
});

// 2. Create gift ticket if recipient exists
if (recipientResponse.user) {
  const giftTicketResponse = await fetch('/trpc/ticket.createGiftTicket', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer <dev-token>' },
    body: JSON.stringify({
      eventId: 'event-uuid',
      teamId: 'team-uuid',
      userId: 'purchaser-uuid', // Gift purchaser
      seatId: 'seat-uuid',
      bearer: 'recipient@example.com' // Gift recipient
    })
  });
}
```

## Error Handling

### Validation Errors

**Phone Number Validation:**
```json
{
  "success": false,
  "message": "Failed to create user",
  "error": "Invalid phone number"
}
```

**Email Validation:**
```json
{
  "success": false,
  "message": "Failed to create user", 
  "error": "Invalid email format"
}
```

**Duplicate User:**
```json
{
  "success": false,
  "message": "Failed to create user",
  "error": "User with this email already exists"
}
```

### Common Error Scenarios

1. **Invalid phone format**: Phone number doesn't match Rwanda format
2. **Duplicate email/username**: User already exists with same identifier
3. **Missing required fields**: Required fields not provided
4. **Invalid authentication**: Token invalid or expired
5. **User not found**: No user matches the provided identifier

## Best Practices

### User Creation

- Validate all input fields before submission
- Handle duplicate user scenarios gracefully
- Provide clear error messages for validation failures
- Consider email verification for production use

### User Lookup

- Use appropriate lookup method based on available information
- Handle "user not found" scenarios appropriately
- Cache user data when appropriate to reduce API calls
- Implement proper error handling for network failures

### Phone Number Handling

- Always store phone numbers in international format
- Validate phone numbers on both client and server side
- Provide clear formatting examples to users
- Consider supporting multiple country formats if expanding beyond Rwanda

### Security Considerations

- Never expose sensitive user information in API responses
- Implement proper authentication for all user operations
- Log user operations for audit trails
- Consider rate limiting for user creation endpoints
- Validate all input to prevent injection attacks