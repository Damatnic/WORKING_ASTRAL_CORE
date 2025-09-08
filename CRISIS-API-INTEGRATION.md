# Crisis Management API Integration Guide

## Overview

This document provides comprehensive details about the newly implemented Crisis Management API system for the Astral Core mental health platform. The system provides enterprise-grade crisis management capabilities with real-time notifications, encrypted data storage, and comprehensive audit logging.

## API Routes Created

### 1. Crisis Alerts API
**Endpoint:** `/api/crisis/alerts`

#### GET /api/crisis/alerts
- **Purpose:** Retrieve crisis alerts with filtering and pagination
- **Authentication:** Crisis Counselor, Admin, or Super Admin role required
- **Rate Limit:** 60 requests per minute
- **Query Parameters:**
  - `page` (number): Page number for pagination
  - `limit` (number): Items per page (max 100)
  - `severity` (string): Comma-separated severity levels (1-5)
  - `status` (string): Filter by alert status
  - `userId` (string): Filter by user ID
  - `counselorId` (string): Filter by assigned counselor
  - `handled` (boolean): Filter by handled status
  - `dateFrom` (ISO date): Start date filter
  - `dateTo` (ISO date): End date filter

#### POST /api/crisis/alerts
- **Purpose:** Create a new crisis alert
- **Authentication:** Crisis Counselor role required
- **Rate Limit:** 10 requests per minute
- **Request Body:**
```json
{
  "type": "string",
  "severity": 1-5,
  "userId": "uuid",
  "context": "string",
  "indicators": ["string"],
  "metadata": {}
}
```

#### PUT /api/crisis/alerts?id={alertId}
- **Purpose:** Update an existing alert
- **Authentication:** Crisis Counselor role required
- **Rate Limit:** 30 requests per minute
- **Request Body:**
```json
{
  "status": "acknowledged|in_progress|resolved|escalated",
  "handledBy": "uuid",
  "notes": "string",
  "actions": ["string"]
}
```

#### DELETE /api/crisis/alerts?id={alertId}
- **Purpose:** Delete an alert (Admin only)
- **Authentication:** Admin or Super Admin role required
- **Rate Limit:** 10 requests per minute

### 2. Crisis Reports API
**Endpoint:** `/api/crisis/reports`

#### GET /api/crisis/reports
- **Purpose:** Retrieve crisis reports with filtering
- **Authentication:** Any authenticated user (filtered by permissions)
- **Rate Limit:** 60 requests per minute
- **Access Levels:**
  - Crisis Counselors/Admins: View all reports
  - Therapists/Helpers: View limited reports
  - Regular Users: View only their own reports

#### POST /api/crisis/reports
- **Purpose:** Create a new crisis report
- **Authentication:** Any authenticated user
- **Rate Limit:** 5 requests per minute
- **Request Body:**
```json
{
  "severityLevel": 1-5,
  "triggerType": "self_harm|suicidal_ideation|anxiety_attack|...",
  "interventionType": "self_help|peer_support|counselor_chat|...",
  "details": {
    "description": "string",
    "symptoms": ["string"],
    "duration": "string",
    "previousIncidents": boolean,
    "currentMedications": ["string"],
    "emergencyContacts": [{
      "name": "string",
      "relationship": "string",
      "phone": "string"
    }]
  },
  "isAnonymous": boolean
}
```

#### PUT /api/crisis/reports?id={reportId}
- **Purpose:** Update a crisis report
- **Authentication:** Crisis Counselor role required
- **Rate Limit:** 30 requests per minute

### 3. Safety Plans API
**Endpoint:** `/api/crisis/safety-plans`

#### GET /api/crisis/safety-plans
- **Purpose:** Retrieve safety plans
- **Authentication:** Any authenticated user (filtered by permissions)
- **Rate Limit:** 60 requests per minute
- **Query Parameters:**
  - `userId` (string): Filter by user ID
  - `isActive` (boolean): Filter by active status
  - `page` (number): Page number
  - `limit` (number): Items per page

#### POST /api/crisis/safety-plans
- **Purpose:** Create a new safety plan
- **Authentication:** Any authenticated user
- **Rate Limit:** 5 requests per minute
- **Request Body:**
```json
{
  "warningSignals": {
    "title": "string",
    "items": ["string"],
    "notes": "string"
  },
  "copingStrategies": {
    "title": "string",
    "items": ["string"],
    "notes": "string"
  },
  "supportContacts": [{
    "name": "string",
    "relationship": "string",
    "phone": "string",
    "available": "string"
  }],
  "safeEnvironment": {
    "title": "string",
    "items": ["string"],
    "notes": "string"
  },
  "reasonsToLive": {
    "title": "string",
    "items": ["string"],
    "notes": "string"
  }
}
```

#### PUT /api/crisis/safety-plans?id={planId}
- **Purpose:** Update a safety plan
- **Authentication:** Owner or Crisis Counselor
- **Rate Limit:** 30 requests per minute

#### DELETE /api/crisis/safety-plans?id={planId}
- **Purpose:** Delete a safety plan
- **Authentication:** Owner or Admin
- **Rate Limit:** 10 requests per minute

### 4. Interventions API
**Endpoint:** `/api/crisis/interventions`

#### GET /api/crisis/interventions
- **Purpose:** Get active interventions
- **Authentication:** Crisis Counselor role required
- **Rate Limit:** 60 requests per minute

#### POST /api/crisis/interventions
- **Purpose:** Create a new intervention
- **Authentication:** Crisis Counselor role required
- **Rate Limit:** 10 requests per minute
- **Request Body:**
```json
{
  "userId": "uuid",
  "sessionType": "crisis|emergency|wellness_check",
  "priority": 1-5,
  "notes": "string"
}
```

#### PUT /api/crisis/interventions?id={interventionId}
- **Purpose:** Update an intervention
- **Authentication:** Crisis Counselor role required
- **Rate Limit:** 30 requests per minute

### 5. Escalations API
**Endpoint:** `/api/crisis/escalations`

#### POST /api/crisis/escalations
- **Purpose:** Create an escalation
- **Authentication:** Helper role or higher required
- **Rate Limit:** 5 requests per minute
- **Request Body:**
```json
{
  "alertId": "uuid",
  "reportId": "uuid",
  "reason": "string",
  "urgency": 1-5,
  "requestedAction": "string",
  "additionalInfo": "string"
}
```

#### PUT /api/crisis/escalations?id={escalationId}
- **Purpose:** Update an escalation
- **Authentication:** Crisis Counselor role required
- **Rate Limit:** 30 requests per minute

### 6. Counselor Dashboard API
**Endpoint:** `/api/crisis/counselor-dashboard`

#### GET /api/crisis/counselor-dashboard
- **Purpose:** Get comprehensive dashboard data for crisis counselors
- **Authentication:** Crisis Counselor role required
- **Rate Limit:** 30 requests per minute
- **Response:** Includes statistics, recent alerts, active interventions, and system status

## Security Features Implemented

### 1. Field-Level Encryption
- **Library:** `H:\Astral Core\NEW CORE\AstralCoreV5\src\lib\encryption.ts`
- **Algorithm:** AES-256-GCM with PBKDF2 key derivation
- **Features:**
  - Encrypts sensitive crisis data (details, contacts, notes)
  - Supports authenticated additional data (AAD)
  - Automatic salt generation for each encryption
  - Secure key management via environment variables

### 2. Authentication & Authorization
- **Middleware:** Role-based access control (RBAC)
- **Roles:**
  - `USER`: Can create reports and safety plans
  - `HELPER`: Can view limited reports and escalate
  - `THERAPIST`: Can view reports and create interventions
  - `CRISIS_COUNSELOR`: Full crisis management access
  - `ADMIN/SUPER_ADMIN`: Complete system access

### 3. Audit Logging
- **Implementation:** Comprehensive audit trail for all crisis actions
- **Logged Actions:**
  - All CRUD operations on crisis resources
  - Access attempts and failures
  - WebSocket connections
  - Escalations and interventions
- **Storage:** `AuditLog` table with user, action, resource, and outcome

### 4. Rate Limiting
- **Implementation:** Per-endpoint rate limits
- **Configuration:**
  - Alert creation: 10/minute
  - Report creation: 5/minute
  - Dashboard access: 30/minute
  - General queries: 60/minute

## Real-Time Features

### WebSocket Integration
- **Library:** `H:\Astral Core\NEW CORE\AstralCoreV5\src\lib\websocket.ts`
- **Events:**
  - `crisis:alert:created` - New alert created
  - `crisis:alert:updated` - Alert status changed
  - `crisis:report:created` - New report submitted
  - `crisis:intervention:started` - Intervention initiated
  - `crisis:emergency:broadcast` - System-wide emergency alerts

### Room-Based Broadcasting
- **Rooms:**
  - `room:crisis-counselors` - All crisis counselors
  - `room:admins` - Admin users
  - `room:user:{id}` - Individual user notifications

## Frontend Integration Guide

### 1. Replace Mock Data in Components

Update the crisis components to use the new API endpoints:

```typescript
// Example: CrisisAlertSystem.tsx
import { useEffect, useState } from 'react';

const fetchAlerts = async () => {
  const response = await fetch('/api/crisis/alerts', {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch alerts');
  }
  
  return response.json();
};

// Use in component
const { data, pagination } = await fetchAlerts();
```

### 2. WebSocket Connection

```typescript
// Example: WebSocket connection for real-time updates
import { io, Socket } from 'socket.io-client';

const socket: Socket = io({
  path: '/socket.io',
  transports: ['websocket', 'polling'],
});

socket.on('crisis:alert:created', (data) => {
  // Handle new alert
  console.log('New alert:', data);
});

socket.on('crisis:emergency:broadcast', (data) => {
  // Handle emergency broadcast
  alert(`Emergency: ${data.message}`);
});
```

### 3. Error Handling

All API endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  error: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Handle errors
try {
  const response = await fetch('/api/crisis/reports', {
    method: 'POST',
    body: JSON.stringify(reportData),
  });
  
  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    // Handle validation errors
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`${err.field}: ${err.message}`);
      });
    }
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Environment Variables Required

Add these to your `.env` file:

```env
# Encryption key for crisis data (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your-base64-encoded-32-byte-key

# WebSocket configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (already configured)
DATABASE_URL=your-postgresql-connection-string
```

## Database Requirements

The API uses the existing Prisma schema models:
- `SafetyAlert` - Crisis alerts
- `CrisisReport` - Crisis reports  
- `SafetyPlan` - User safety plans
- `SupportSession` - Interventions
- `AuditLog` - Audit trail
- `Notification` - User notifications

## Testing the APIs

### Using cURL

```bash
# Get alerts (requires auth token)
curl -X GET "http://localhost:3000/api/crisis/alerts" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a report
curl -X POST "http://localhost:3000/api/crisis/reports" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "severityLevel": 3,
    "triggerType": "anxiety_attack",
    "interventionType": "counselor_chat",
    "details": {
      "description": "Experiencing severe anxiety",
      "symptoms": ["rapid heartbeat", "shortness of breath"],
      "duration": "30 minutes"
    }
  }'
```

### Using Postman

Import the API endpoints and set up:
1. Authentication headers
2. Environment variables for base URL
3. Request bodies from the examples above

## Performance Considerations

1. **Database Indexes:** All foreign keys and frequently queried fields are indexed
2. **Pagination:** All list endpoints support pagination to limit data transfer
3. **Caching:** Consider implementing Redis for frequently accessed data
4. **Connection Pooling:** Prisma handles connection pooling automatically

## Security Best Practices

1. **Never log sensitive data** - All sensitive fields are encrypted before storage
2. **Use HTTPS in production** - Ensure TLS encryption for all API traffic
3. **Regular key rotation** - Rotate encryption keys periodically
4. **Monitor audit logs** - Review audit logs for suspicious activity
5. **Rate limiting** - Prevents abuse and DDoS attacks

## Monitoring & Maintenance

### Health Checks
- Database connectivity: Check via Prisma connection
- WebSocket status: Monitor active connections
- Encryption service: Verify key availability

### Metrics to Track
- Average response time for crisis reports
- Number of active alerts
- Counselor response times
- Escalation frequency
- System error rates

## Support & Documentation

For additional support or questions about the Crisis Management API:
1. Review the TypeScript interfaces in `/src/types/crisis.ts`
2. Check the audit logs for debugging
3. Monitor WebSocket events for real-time updates
4. Review encryption utilities for data security

## Next Steps

1. **Frontend Integration:** Update all crisis components to use the new APIs
2. **Testing:** Implement comprehensive unit and integration tests
3. **Monitoring:** Set up application monitoring (e.g., Sentry, New Relic)
4. **Documentation:** Generate API documentation with Swagger/OpenAPI
5. **Performance:** Implement caching layer for frequently accessed data
6. **Backup:** Set up automated backups for crisis data

---

**Important:** This crisis management system handles sensitive mental health data. Ensure all security measures are properly configured and tested before deploying to production.