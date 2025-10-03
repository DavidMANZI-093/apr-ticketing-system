# QR Code Operations

## Overview

QR codes are cryptographically signed with HMAC-SHA256 for security. They contain ticket, event, and seat information and support one-time validation (PAID → USED state transition).

**Prerequisites**: Paid tickets, Dev/Admin authentication  
**Related**: [Ticket Operations](tickets.md), [Security Features](../architecture/security.md)

## Security Features

- **HMAC-SHA256 Signing**: All QR codes are cryptographically signed
- **Anti-tampering Protection**: Payload signing prevents modification
- **One-time Use**: QR codes can only be validated once (PAID → USED)
- **Expiration**: QR codes are only valid for PAID tickets

## QR Code Generation

### Generate QR Code

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
```

**Requirements:**
- Ticket must be in PAID state
- Valid authentication token required
- Ticket must exist and be accessible

**QR Code Format:**
- Base64 PNG format for easy integration
- 256x256 pixels with 2-pixel margin
- Error correction level M for reliability
- Contains HMAC-signed payload with ticket ID, event ID, seat ID, and timestamp

## QR Code Validation

### Validate QR Code

```typescript
// tRPC Mutation - Requires Admin Authentication
ticket.validateQRCode
Headers: { Authorization: "Bearer <admin-token>" }
{
  "qrData": "eyJ0aWNrZXRJZCI6IjMzMGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwZCIsImV2ZW50SWQiOiJhYTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDUiLCJzZWF0SWQiOiIyMjBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMGMiLCJ0aW1lc3RhbXAiOjE3MDM1MzkyMDB9.signature"
}

// Success Response:
{
  "success": true,
  "message": "Ticket validated successfully",
  "ticket": {
    "id": "330e8400-e29b-41d4-a716-44665544000d",
    "userId": "110e8400-e29b-41d4-a716-44665544000b",
    "bearer": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+250788123456"
    },
    "event": {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "name": "Concert 2024",
      "startsAt": "2024-12-25T19:00:00.000Z"
    },
    "seat": {
      "id": "220e8400-e29b-41d4-a716-44665544000c",
      "label": "A1-1",
      "section": {
        "name": "Section A"
      }
    },
    "team": {
      "id": "cc0e8400-e29b-41d4-a716-446655440007",
      "name": "Team Alpha"
    },
    "type": "SINGLE",
    "state": "USED",
    "validatedAt": "2024-12-25T20:00:00.000Z",
    "createdAt": "2024-12-25T19:00:00.000Z",
    "updatedAt": "2024-12-25T20:00:00.000Z"
  }
}

// Error Response (Invalid ticket):
{
  "success": false,
  "message": "Failed to validate ticket",
  "error": "Ticket not found or already used"
}

// Error Response (Already validated):
{
  "success": false,
  "message": "Failed to validate ticket",
  "error": "Ticket has already been validated"
}
```

**Validation Process:**
1. Verifies HMAC signature of QR code payload
2. Checks ticket exists and is in PAID state
3. Marks ticket as USED (one-time validation)
4. Returns complete ticket details with event and seat information
5. Logs validation event for audit trail

## QR Code Payload Structure

### Signed Payload

The QR code contains a JSON payload that is HMAC-signed:

```json
{
  "ticketId": "330e8400-e29b-41d4-a716-44665544000d",
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "seatId": "220e8400-e29b-41d4-a716-44665544000c",
  "timestamp": 1703539200000,
  "signature": "hmac-sha256-signature"
}
```

### Security Implementation

```typescript
// QR code generation (simplified)
const payload = {
  ticketId: ticket.id,
  eventId: ticket.eventId,
  seatId: ticket.seatId,
  timestamp: Date.now()
};

const signature = crypto
  .createHmac('sha256', process.env.QR_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

const qrData = JSON.stringify({ ...payload, signature });
```

## Integration Examples

### Frontend QR Code Display

```javascript
// React component example
function TicketQRCode({ ticketId }) {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQRCode() {
      try {
        const response = await fetch('/trpc/ticket.getTicketQRCode', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ticketId })
        });

        const data = await response.json();
        if (data.success) {
          setQrCode(data.qrCode);
        }
      } catch (error) {
        console.error('Failed to fetch QR code:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchQRCode();
  }, [ticketId]);

  if (loading) return <div>Loading QR code...</div>;
  if (!qrCode) return <div>QR code not available</div>;

  return (
    <div className="qr-code-container">
      <img src={qrCode} alt="Ticket QR Code" />
      <p>Show this QR code at the event entrance</p>
    </div>
  );
}
```

### Mobile QR Scanner

```javascript
// QR code scanning example
function QRScanner() {
  const [scanResult, setScanResult] = useState(null);

  const handleScan = async (qrData) => {
    try {
      const payload = JSON.parse(qrData);
      
      // Validate ticket via API
      const response = await fetch('/trpc/ticket.validateTicket', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ticketId: payload.ticketId })
      });

      const result = await response.json();
      setScanResult(result);
    } catch (error) {
      setScanResult({
        success: false,
        message: 'Invalid QR code format'
      });
    }
  };

  return (
    <div>
      <QRCodeScanner onScan={handleScan} />
      {scanResult && (
        <div className={scanResult.success ? 'success' : 'error'}>
          {scanResult.message}
          {scanResult.success && (
            <div>
              <p>Ticket holder: {scanResult.ticket.bearer.name}</p>
              <p>Seat: {scanResult.ticket.seat.label}</p>
              <p>Event: {scanResult.ticket.event.name}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Security Considerations

### QR Code Security

**Signature Verification:**
- All QR codes must be verified against HMAC signature
- Invalid signatures should be rejected immediately
- Use constant-time comparison for signature verification

**Timestamp Validation:**
- Consider implementing timestamp validation for additional security
- Reject QR codes that are too old (optional)
- Log suspicious validation attempts

### Best Practices

**QR Code Generation:**
- Only generate QR codes for PAID tickets
- Include sufficient error correction for reliable scanning
- Use appropriate image size for scanning distance

**QR Code Validation:**
- Always verify HMAC signature first
- Check ticket state before validation
- Implement proper error handling and logging
- Use admin-level authentication for validation

**Storage and Transmission:**
- QR codes can be safely stored and transmitted (they're signed)
- Don't expose QR_SECRET in client-side code
- Use HTTPS for all QR code operations

## Error Handling

### Common Errors

**QR Code Generation:**
- Ticket not found
- Ticket not in PAID state
- Invalid authentication
- QR generation failure

**QR Code Validation:**
- Invalid QR code format
- Invalid HMAC signature
- Ticket not found
- Ticket already validated
- Ticket not in PAID state

### Error Response Format

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Detailed error description"
}
```

## Monitoring

### Metrics Tracked

- QR code generation requests
- QR code validation attempts
- Validation success/failure rates
- Invalid signature attempts
- Performance metrics for QR operations

### Logging

All QR code operations are logged with:
- Operation type (generation/validation)
- Ticket ID and user information
- Success/failure status
- Error details (if applicable)
- Timestamp and request context

## Troubleshooting

### QR Code Not Generating

1. Check ticket is in PAID state
2. Verify authentication token is valid
3. Ensure QR_SECRET environment variable is set
4. Check server logs for detailed error messages

### QR Code Validation Failing

1. Verify QR code format is valid JSON
2. Check HMAC signature verification
3. Ensure ticket exists and is in PAID state
4. Verify QR_SECRET matches generation secret
5. Check admin authentication token

### Performance Issues

1. Monitor QR generation response times
2. Check image generation performance
3. Consider caching generated QR codes
4. Optimize database queries for validation