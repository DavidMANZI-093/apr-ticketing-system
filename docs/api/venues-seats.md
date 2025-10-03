# Venue & Seat Management

## Overview

Venues contain seat sections and individual seats. Event seats link venue seats to specific events with pricing. The system supports SVG-based seat section visualization for interactive seating charts.

**Prerequisites**: [Admin Authentication](authentication.md)  
**Related**: [Event Management](events.md), [Ticket Operations](tickets.md)

## Venue Operations

### Create Venue

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
  "id": "990e8400-e29b-41d4-a716-446655440004"
}

// Success Response:
{
  "success": true,
  "message": "Venue retrieved successfully",
  "venue": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "name": "Main Arena",
    "description": "Large concert venue",
    "location": "30.11562,-1.95318",
    "sections": [
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440006",
        "name": "Section A",
        "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2263.285838 1719.948741 L 2496.659442 1719.948741 L 2496.659442 1874.00509 L 2262.798335 1874.00509 Z M 2263.285838 1719.948741 ' transform='matrix(3.749972,0,0,3.749972,-4524.1184,-12.939689)'"
      }
    ]
  }
}

// Venue Not Found Response:
{
  "success": true,
  "message": "Venue not found",
  "venue": null
}
```

### Update Venue

```typescript
// tRPC Mutation - Requires Admin Authentication
venue.updateVenue
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "name": "Updated Arena Name", // optional
  "description": "Updated venue description", // optional
  "location": { // optional
    "longitude": 30.11562,
    "latitude": -1.95318
  }
}

// Success Response:
{
  "success": true,
  "message": "Venue updated successfully",
  "venue": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "name": "Updated Arena Name",
    "description": "Updated venue description",
    "location": "30.11562,-1.95318",
    "updatedAt": "2024-12-25T20:00:00.000Z"
  }
}
```

### Delete Venue

```typescript
// tRPC Mutation - Requires Admin Authentication
venue.deleteVenue
Headers: { Authorization: "Bearer <admin-token>" }
{
  "id": "990e8400-e29b-41d4-a716-446655440004"
}

// Success Response:
{
  "success": true,
  "message": "Venue deleted successfully"
}

// Note: Ensure no active events are associated with venue
```

## Seat Section Management

### Create Seat Section

```typescript
// tRPC Mutation - Requires Admin Authentication
venue.createSeatSection
Headers: { Authorization: "Bearer <admin-token>" }
{
  "venueId": "990e8400-e29b-41d4-a716-446655440004",
  "name": "Section A",
  "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 918.081291 2050.296024 L 967.967077 2050.296024 L 967.967077 2033.760485 L 1064.566751 2033.760485 L 1064.566751 1910.012693 L 967.967077 1910.012693 L 967.967077 1893.613614 L 917.94379 1893.613614 Z M 918.081291 2050.296024 ' transform='matrix(3.749972,0,0,3.749972,-67.818402,11.692955)'"
}

// Success Response:
{
  "success": true,
  "message": "Seat section created successfully",
  "section": {
    "id": "bb0e8400-e29b-41d4-a716-446655440006",
    "venueId": "990e8400-e29b-41d4-a716-446655440004",
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
  "venueId": "990e8400-e29b-41d4-a716-446655440004"
}

// Success Response:
{
  "success": true,
  "message": "Sections retrieved successfully",
  "sections": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440006",
      "venueId": "990e8400-e29b-41d4-a716-446655440004",
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
  "id": "bb0e8400-e29b-41d4-a716-446655440006",
  "name": "Updated Section A", // optional
  "svgPathData": "path style='fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;' d='M 2163.381943 2429.963317 L 2163.381943 2456.490596 L 2146.57036 2456.490596 L 2146.57036 2549.783996 L 2163.381943 2549.783996 L 2163.381943 2563.701807 L 2022.822568 2563.701807 L 2022.822568 2550.06004 L 2040.322698 2550.06004 L 2040.322698 2456.215594 L 2023.188196 2456.215594 L 2023.188196 2429.960192 Z M 2163.381943 2429.963317 ' transform='matrix(3.749972,0,0,3.749972,-610.837036,0.177717)'" // optional
}

// Success Response:
{
  "success": true,
  "message": "Seat section updated successfully",
  "section": {
    "id": "bb0e8400-e29b-41d4-a716-446655440006",
    "name": "Updated Section A",
    "svgPathData": "updated-svg-path-data",
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
  "id": "bb0e8400-e29b-41d4-a716-446655440006"
}

// Success Response:
{
  "success": true,
  "message": "Seat section deleted successfully"
}
```

## Seat Management

### Create Seats

```typescript
// tRPC Mutation - Requires Admin Authentication
seat.createSeats
Headers: { Authorization: "Bearer <admin-token>" }
{
  "venueId": "990e8400-e29b-41d4-a716-446655440004",
  "seats": [
    {
      "sectionId": "bb0e8400-e29b-41d4-a716-446655440006",
      "row": 1,
      "number": 1
    },
    {
      "sectionId": "bb0e8400-e29b-41d4-a716-446655440006",
      "row": 1,
      "number": 2
    }
  ]
}

// Success Response:
{
  "success": true,
  "message": "Seats created successfully",
  "seats": [
    {
      "id": "220e8400-e29b-41d4-a716-44665544000c",
      "venueId": "990e8400-e29b-41d4-a716-446655440004",
      "sectionId": "bb0e8400-e29b-41d4-a716-446655440006",
      "label": "A1-1",
      "row": 1,
      "number": 1,
      "createdAt": "2024-12-25T19:00:00Z"
    },
    {
      "id": "330e8400-e29b-41d4-a716-44665544000d",
      "venueId": "990e8400-e29b-41d4-a716-446655440004",
      "sectionId": "bb0e8400-e29b-41d4-a716-446655440006",
      "label": "A1-2",
      "row": 1,
      "number": 2,
      "createdAt": "2024-12-25T19:00:00Z"
    }
  ]
}

// Seat labels are auto-generated as: {SectionName}{Row}-{Number}
```

### Get All Seats (Admin)

```typescript
// tRPC Query - Requires Admin Authentication
seat.getAllSeats
Headers: { Authorization: "Bearer <admin-token>" }

// Success Response:
{
  "success": true,
  "message": "Seats retrieved successfully",
  "seats": [
    {
      "id": "220e8400-e29b-41d4-a716-44665544000c",
      "venueId": "990e8400-e29b-41d4-a716-446655440004",
      "sectionId": "bb0e8400-e29b-41d4-a716-446655440006",
      "label": "A1-1",
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
  "venueId": "990e8400-e29b-41d4-a716-446655440004"
}

// Success Response:
{
  "success": true,
  "message": "Seats retrieved successfully",
  "seats": [
    {
      "id": "220e8400-e29b-41d4-a716-44665544000c",
      "venueId": "990e8400-e29b-41d4-a716-446655440004",
      "sectionId": "bb0e8400-e29b-41d4-a716-446655440006",
      "label": "A1-1",
      "row": 1,
      "number": 1,
      "section": {
        "id": "bb0e8400-e29b-41d4-a716-446655440006",
        "name": "Section A",
        "svgPathData": "path-data..."
      }
    }
  ]
}
```

## Event Seat Management

### Create Event Seats

```typescript
// tRPC Mutation - Requires Admin Authentication
seat.createEventSeats
Headers: { Authorization: "Bearer <admin-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "seats": [
    {
      "seatId": "220e8400-e29b-41d4-a716-44665544000c",
      "price": 50000,
      "category": "VIP"
    },
    {
      "seatId": "330e8400-e29b-41d4-a716-44665544000d",
      "price": 30000,
      "category": "Regular"
    }
  ]
}

// Success Response:
{
  "success": true,
  "message": "Event seats created successfully",
  "eventSeats": [
    {
      "id": "440e8400-e29b-41d4-a716-44665544000e",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "220e8400-e29b-41d4-a716-44665544000c",
      "price": 50000,
      "category": "VIP",
      "isAvailable": true,
      "createdAt": "2024-12-25T19:00:00Z"
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
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005"
}

// Success Response:
{
  "success": true,
  "message": "Event seats retrieved successfully",
  "eventSeats": [
    {
      "id": "440e8400-e29b-41d4-a716-44665544000e",
      "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
      "seatId": "220e8400-e29b-41d4-a716-44665544000c",
      "category": "VIP",
      "price": 50000,
      "isAvailable": true,
      "createdAt": "2024-12-25T19:00:00Z",
      "updatedAt": "2024-12-25T19:00:00Z",
      "seat": {
        "label": "A1-1",
        "row": 1,
        "number": 1,
        "section": {
          "id": "bb0e8400-e29b-41d4-a716-446655440006",
          "name": "Section A"
        }
      }
    }
  ]
}

// Empty Response:
{
  "success": true,
  "message": "No event seats found",
  "eventSeats": []
}
```

### Get Event Seat Details

```typescript
// tRPC Mutation - Requires Dev Authentication
seat.getEventSeat
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
  "seatId": "220e8400-e29b-41d4-a716-44665544000c"
}

// Success Response:
{
  "success": true,
  "message": "Event seat retrieved successfully",
  "eventSeat": {
    "id": "440e8400-e29b-41d4-a716-44665544000e",
    "eventId": "aa0e8400-e29b-41d4-a716-446655440005",
    "seatId": "220e8400-e29b-41d4-a716-44665544000c",
    "category": "VIP",
    "price": 50000,
    "isAvailable": true,
    "seat": {
      "label": "A1-1",
      "row": 1,
      "number": 1,
      "section": {
        "id": "bb0e8400-e29b-41d4-a716-446655440006",
        "name": "Section A",
        "svgPathData": "path-data..."
      }
    }
  }
}
```

### Get Event Seats Statistics

```typescript
// tRPC Mutation - Requires Dev Authentication
seat.getEventSeatsStats
Headers: { Authorization: "Bearer <dev-token>" }
{
  "eventId": "aa0e8400-e29b-41d4-a716-446655440005"
}

// Success Response:
{
  "success": true,
  "message": "Event seats stats retrieved successfully",
  "status": {
    "availableSeats": 125,
    "totalSeats": 300
  }
}

// No Seats Found Response:
{
  "success": true,
  "message": "No event seats found",
  "status": null
}
```

## SVG Integration

### SVG Path Data Format

Seat sections use SVG path data for visual representation:

```svg
<path 
  style="fill-rule:nonzero;fill:rgb(78.039217%,78.039217%,78.039217%);fill-opacity:1;stroke-width:1.00903;stroke-linecap:butt;stroke-linejoin:round;stroke:rgb(100%,100%,100%);stroke-opacity:1;stroke-miterlimit:4;" 
  d="M 2263.285838 1719.948741 L 2496.659442 1719.948741 L 2496.659442 1874.00509 L 2262.798335 1874.00509 Z M 2263.285838 1719.948741" 
  transform="matrix(3.749972,0,0,3.749972,-4524.1184,-12.939689)"
/>
```

### Interactive Seating Chart Implementation

```javascript
// React component example
function SeatingChart({ eventId }) {
  const [seatingPlan, setSeatingPlan] = useState({});

  useEffect(() => {
    // Fetch initial seating plan
    fetchSeatingPlan(eventId).then(setSeatingPlan);

    // Connect to SSE for real-time updates
    const eventSource = new EventSource(`/events/${eventId}/seats/stream`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'seatingPlan') {
        setSeatingPlan(data.data);
      }
    };

    return () => eventSource.close();
  }, [eventId]);

  return (
    <svg viewBox="0 0 1000 1000">
      {Object.entries(seatingPlan).map(([seatId, seat]) => (
        <path
          key={seatId}
          d={seat.section.svgPathData}
          fill={seat.isAvailable ? '#green' : '#red'}
          onClick={() => selectSeat(seatId)}
        />
      ))}
    </svg>
  );
}
```

## Business Rules

### Venue Hierarchy

```
Venue
├── Seat Sections (SVG-based visual areas)
│   └── Seats (individual seats with row/number)
└── Event Seats (seats linked to specific events with pricing)
```

### Seat Labeling

- Auto-generated format: `{SectionName}{Row}-{Number}`
- Example: Section A, Row 1, Number 1 → "A1-1"
- Labels must be unique within a venue
- Cannot be manually overridden

### Pricing and Categories

- Event seats can have different prices for the same physical seat
- Categories are free-form strings (VIP, Regular, Premium, etc.)
- Pricing is per event, not per venue
- Same seat can have different prices for different events

### Availability Management

- Seats start as available when event seats are created
- Availability changes when tickets are created/cancelled/expired
- Real-time updates via SSE for live availability changes
- Automatic seat release when tickets expire

## Error Handling

### Common Errors

**Venue Operations:**
- Venue not found
- Invalid location coordinates
- Duplicate venue names

**Seat Section Operations:**
- Invalid SVG path data
- Section not found
- Venue not found

**Seat Operations:**
- Invalid section reference
- Duplicate seat positions (same row/number in section)
- Venue/section mismatch

**Event Seat Operations:**
- Event not found
- Seat not found
- Duplicate event seat assignments

### Error Response Format

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Detailed error description"
}
```