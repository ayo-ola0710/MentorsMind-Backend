# Audit Logging & Compliance System

## Overview
The MentorsMind-Backend implements a comprehensive, structured JSON audit logging system designed to track all security, financial, and data modification events. This ensures SOC-2/GDPR compliance and enables robust tracking of system usage.

## Architecture
The system consists of three main components:
1. **AuditLogModel:** The direct interface to the PostgreSQL DB `audit_logs` table.
2. **AuditLoggerService:** A service class handling asynchronous JSON stream logging (to stdout) and persistent DB insertion, along with log searching, reporting, and retention cleanup.
3. **AuditLogMiddleware:** Express middleware (both specific endpoint interceptors and a global POST/PUT/PATCH/DELETE interceptor) that automates the collection of `userId`, `ipAddress`, `userAgent`, and `metadata`.

## Log Levels & Actions

### Standard Log Levels
- `INFO`: Normal system operation (Logins, data creation, processed payments)
- `WARN`: Failed logins, unexpected API behavior, invalid auth states
- `ERROR`: System faults, database errors
- `DEBUG`: Verbose tracing (disabled in production)

### Core Audit Actions
- `LOGIN_SUCCESS` / `LOGIN_FAILED` / `LOGOUT`
- `PAYMENT_PROCESSED` / `PAYMENT_FAILED` / `REFUND_ISSUED`
- `DATA_CREATED` / `DATA_MODIFIED` / `DATA_DELETED`
- `ADMIN_ACTION` / `SECURITY_EVENT`

## Structured Log Format
All logs output to the console follow this structured JSON schema to allow seamless ingestion into Datadog, ELK, or AWS CloudWatch:
```json
{
  "timestamp": "2023-10-15T12:00:00.000Z",
  "level": "INFO",
  "action": "LOGIN_SUCCESS",
  "message": "User logged in via WebAuth",
  "user_id": "uuid-v4",
  "entity_type": "auth",
  "entity_id": null,
  "metadata": {
    "method": "POST",
    "path": "/api/v1/auth/login",
    "statusCode": 200
  },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

## Adding Audit Logging to New Endpoints

### 1. Global Interception
If your route deals with resource mutations (`POST`, `PUT`, `DELETE`), it is automatically captured by `globalModificationAuditMiddleware`. Simply ensure the route is under an Express router that uses this middleware.

### 2. Manual/Specific Actions (e.g., Financials)
For critical ops like payments, use the `auditLogMiddleware` factory:
```typescript
import { auditLogMiddleware } from '../middleware/audit-log.middleware';
import { AuditAction } from '../utils/log-formatter.utils';

router.post('/checkout', 
  auditLogMiddleware({
    action: AuditAction.PAYMENT_PROCESSED,
    getMetadata: (req) => ({ cartTotal: req.body.amount })
  }),
  checkoutHandler
);
```

## Retention & Audits
Logs are automatically cleared based on the configured retention policy (default 90 days). To generate an exportable report for an auditor:
```typescript
const complianceReport = await AuditLoggerService.generateReport({ startDate: new Date('2023-01-01') });
```
