# Validation and Security Guide

## Overview
MentorMinds uses a comprehensive validation and sanitization system designed to prevent injection attacks and ensure data integrity. The system consists of three main layers:
1. **Security Middleware & Sanitization**: Strips dangerous XSS payloads and logs SQL injection attempts.
2. **Schema Validation**: Uses Zod to strictly type and validate all incoming request parameters, query strings, and body data.
3. **Response Standardization**: Formats validation errors consistently and logs validation failures for monitoring.

## 1. Security & Sanitization (`src/utils/sanitization.utils.ts`)

The application automatically sanitizes the `req.body` of all incoming requests before validation occurs.

- **XSS Prevention**: `sanitizeObject` deeply traverses incoming JSON. Any string is stripped of `<script>`, `javascript:`, and inline event handler payloads.
- **SQL Injection Detection**: Patterns common to SQLi (like `1=1 OR a=a`, `DROP TABLE`, etc.) are detected via regex (`containsSqlInjection`). Since we use parameterized queries, these patterns do not pose a direct threat, but we log (`detectAndLogSqlInjection`) the attempt with the request's ID to monitor for malicious scanning activity.
- **Stellar Address Sanitization**: Public keys are automatically trimmed and capitalized before storage/processing.

## 2. Validation Config (`src/config/validation.config.ts`)

Centralized configuration controls lengths, limits, and rules. Modify here to change system-wide behaviors.
- **Strings**: Defined lengths for short strings (names), medium (titles), long (bios).
- **Passwords**: Enforces 8+ chars and includes [A-Z], [a-z], [0-9].
- **File Uploads**: Controls accepted MIME types and maximum base64 payload strings (approx. 5MB for avatars).
- **Pagination**: Default limit is 10, max limit is 100.

## 3. Zod Schemas (`src/validators/schemas/`)

All API payloads must be parsed through a Zod schema defined in `validators/schemas/`. 
- **`common.schemas.ts`**: Contains base primitives like `emailSchema`, `passwordSchema`, `stellarAddressSchema`, and reusable fragments like `idParamSchema`.
- **Domain-Specific Schemas**: Endpoints are grouped (e.g. `auth.schemas.ts`, `users.schemas.ts`, `stellar.schemas.ts`).

### Schema Best Practices:
- Always use `.strict()` on object schemas intended for `req.body` to automatically reject unexpected fields.
- Use `.trim()` on strings.
- Reuse `common.schemas.ts` primitives for consistency rather than redefining `z.string().email()`.

## 4. Validation Middleware (`src/middleware/validation.middleware.ts`)

To use a schema in a route:

```typescript
import { validate, validateBody } from '../middleware/validation.middleware';
import { updateUserSchema } from '../validators/schemas/users.schemas';

// Validates req.body, req.query, and req.params against the schema
router.put('/:id', validate(updateUserSchema), controller.updateUser);

// Explicitly validates and transforms only req.body
router.post('/login', validateBody(loginSchema), controller.login);
```

### How Errors Are Handled
When validation fails, the middleware catches the `ZodError` and utilizes `ResponseUtil.validationError` to return a 400 Bad Request:
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "body.email",
      "message": "Invalid email address",
      "code": "invalid_string"
    }
  ],
  "timestamp": "2026-03-24T00:00:00.000Z"
}
```

## Security Best Practices for Developers
1. **Never Trust Input**: Never pull data straight from `req.body` without putting it through a Zod schema or explicitly sanitizing it if it's dynamic.
2. **Limit Execution Time**: Complex regex in Zod validations can lead to ReDoS. Keep character limits strict via `validationConfig.ts`.
3. **Use the Barrel File**: Always import schemas via `import { ... } from '../validators/schemas'`.
4. **Log Security Anomalies**: If writing custom security logic, always use `logger.warn` to record context (IP, User ID, malicious payload sample) when an anomaly is detected.
