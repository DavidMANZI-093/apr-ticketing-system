# Environment Configuration

## Required Environment Variables

### Database Configuration

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

**Production considerations:**
- Use connection pooling for high-traffic deployments
- Enable SSL for production databases
- Consider read replicas for scaling

### JWT Authentication Secrets

```bash
# Alpha authentication (super admin)
ALPHA_JWT_SECRET="your-secure-alpha-secret-minimum-32-characters"

# Admin authentication (admin users)
ADMIN_JWT_SECRET="your-secure-admin-secret-minimum-32-characters"

# Developer API keys
JWT_SECRET="your-secure-dev-secret-minimum-32-characters"
```

**Security requirements:**
- Each secret must be unique and different
- Minimum 32 characters recommended
- Use cryptographically secure random strings
- Rotate secrets periodically in production

### QR Code Security

```bash
# HMAC signing secret for QR codes
QR_SECRET="your-secure-qr-signing-secret-minimum-32-characters"
```

**Important:**
- Used for HMAC-SHA256 signing of QR codes
- Changing this invalidates all existing QR codes
- Must be consistent across all application instances

## Optional Environment Variables

### Server Configuration

```bash
# Server port (default: 3000)
PORT=3000

# Node environment
NODE_ENV=production
```

### Email Configuration

```bash
# SMTP server settings
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="APR Ticketing <noreply@yourcompany.com>"
```

**Email providers:**
- Gmail: Use app passwords, not regular passwords
- SendGrid: Use API key as password
- AWS SES: Configure IAM credentials

### Monitoring Configuration

```bash
# Enable/disable Prometheus metrics (default: true)
PROMETHEUS_ENABLED=true

# Metrics collection port (default: same as main port)
METRICS_PORT=3000
```

### Rate Limiting Configuration

```bash
# Admin rate limit (requests per hour, default: 100)
ADMIN_RATE_LIMIT=100

# Dev rate limit (requests per hour, default: 300)
DEV_RATE_LIMIT=300
```

### Logging Configuration

```bash
# Log level (error, warn, info, debug, default: info)
LOG_LEVEL=info

# Log format (json, pretty, default: json for production)
LOG_FORMAT=json
```

## Environment Files

### Development (.env)

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/apr_ticketing_dev"

# JWT Secrets
ALPHA_JWT_SECRET="dev-alpha-secret-change-in-production"
ADMIN_JWT_SECRET="dev-admin-secret-change-in-production"
JWT_SECRET="dev-jwt-secret-change-in-production"

# QR Code Security
QR_SECRET="dev-qr-secret-change-in-production"

# Development settings
NODE_ENV=development
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Optional: Email (for testing)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-dev-email@gmail.com"
SMTP_PASS="your-app-password"
```

### Production (.env.production)

```bash
# Database with SSL
DATABASE_URL="postgresql://username:password@prod-db-host:5432/apr_ticketing?sslmode=require"

# Secure JWT secrets (generate with: openssl rand -base64 32)
ALPHA_JWT_SECRET="production-alpha-secret-32-chars-minimum"
ADMIN_JWT_SECRET="production-admin-secret-32-chars-minimum"
JWT_SECRET="production-dev-secret-32-chars-minimum"

# QR Code Security
QR_SECRET="production-qr-secret-32-chars-minimum"

# Production settings
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
LOG_FORMAT=json

# Production email
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
SMTP_FROM="APR Ticketing <noreply@yourcompany.com>"

# Monitoring
PROMETHEUS_ENABLED=true

# Rate limiting
ADMIN_RATE_LIMIT=100
DEV_RATE_LIMIT=300
```

## Security Best Practices

### Secret Generation

Generate secure secrets using:

```bash
# Generate 32-character base64 secret
openssl rand -base64 32

# Generate 64-character hex secret
openssl rand -hex 32

# Generate UUID-based secret
node -e "console.log(require('crypto').randomUUID())"
```

### Environment File Security

**Development:**
- Add `.env*` to `.gitignore`
- Never commit environment files to version control
- Use different secrets for each environment

**Production:**
- Use environment variable injection (Docker, Kubernetes)
- Consider secret management services (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Monitor for secret exposure

### Database Security

**Connection strings:**
- Use SSL in production (`sslmode=require`)
- Limit database user permissions
- Use connection pooling
- Enable database logging and monitoring

## Deployment Platforms

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - ALPHA_JWT_SECRET=${ALPHA_JWT_SECRET}
      - ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}
      - JWT_SECRET=${JWT_SECRET}
      - QR_SECRET=${QR_SECRET}
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=apr_ticketing
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Kubernetes

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: apr-ticketing-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  PROMETHEUS_ENABLED: "true"

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: apr-ticketing-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://username:password@postgres:5432/apr_ticketing"
  ALPHA_JWT_SECRET: "your-alpha-secret"
  ADMIN_JWT_SECRET: "your-admin-secret"
  JWT_SECRET: "your-dev-secret"
  QR_SECRET: "your-qr-secret"

---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: apr-ticketing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: apr-ticketing
  template:
    metadata:
      labels:
        app: apr-ticketing
    spec:
      containers:
      - name: apr-ticketing
        image: apr-ticketing:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: apr-ticketing-config
        - secretRef:
            name: apr-ticketing-secrets
```

### Cloud Platforms

**Render.com:**
```bash
# Set environment variables in Render dashboard
DATABASE_URL=postgresql://...
ALPHA_JWT_SECRET=...
ADMIN_JWT_SECRET=...
JWT_SECRET=...
QR_SECRET=...
```

**Heroku:**
```bash
# Set config vars
heroku config:set DATABASE_URL=postgresql://...
heroku config:set ALPHA_JWT_SECRET=...
heroku config:set ADMIN_JWT_SECRET=...
heroku config:set JWT_SECRET=...
heroku config:set QR_SECRET=...
```

**AWS/GCP/Azure:**
- Use managed secret services
- Configure environment variables in deployment configuration
- Use IAM roles for database access where possible

## Validation

### Environment Validation Script

Create `scripts/validate-env.js`:

```javascript
const requiredVars = [
  'DATABASE_URL',
  'ALPHA_JWT_SECRET',
  'ADMIN_JWT_SECRET',
  'JWT_SECRET',
  'QR_SECRET'
];

const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('Missing required environment variables:');
  missing.forEach(varName => console.error(`  - ${varName}`));
  process.exit(1);
}

// Validate secret lengths
const secrets = ['ALPHA_JWT_SECRET', 'ADMIN_JWT_SECRET', 'JWT_SECRET', 'QR_SECRET'];
const shortSecrets = secrets.filter(secret => 
  process.env[secret] && process.env[secret].length < 32
);

if (shortSecrets.length > 0) {
  console.warn('Warning: These secrets are shorter than 32 characters:');
  shortSecrets.forEach(secret => console.warn(`  - ${secret}`));
}

console.log('Environment validation passed');
```

Run validation:
```bash
node scripts/validate-env.js
```

## Troubleshooting

### Common Issues

**Database connection fails:**
- Check DATABASE_URL format
- Verify database server is running
- Check network connectivity and firewall rules
- Ensure SSL configuration matches database requirements

**Authentication errors:**
- Verify all JWT secrets are set and unique
- Check secret lengths (minimum 32 characters recommended)
- Ensure secrets are consistent across all application instances

**QR code validation fails:**
- Check QR_SECRET is set and consistent
- Verify QR_SECRET hasn't changed since QR codes were generated

**Email sending fails:**
- Verify SMTP credentials and configuration
- Check firewall rules for SMTP ports
- Test with email provider's authentication method