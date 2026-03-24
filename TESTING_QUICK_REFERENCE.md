# Testing Quick Reference

## Common Patterns & Examples

### Table of Contents
- [Basic API Test](#basic-api-test)
- [Authenticated Request](#authenticated-request)
- [Creating Test Data](#creating-test-data)
- [Testing Error Cases](#testing-error-cases)
- [Testing with Files](#testing-with-files)
- [Mocking External Services](#mocking-external-services)

---

## Basic API Test

```typescript
import request from 'supertest';
import app from '../app';

describe('Users API', () => {
  describe('GET /api/v1/users/:id', () => {
    it('should return user profile', async () => {
      const response = await request(app).get('/api/v1/users/123');
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/api/v1/users/999');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});
```

---

## Authenticated Request

```typescript
import { createUser } from './factories/user.factory';
import { generateTestToken, authenticatedGet } from './helpers/request.helper';

describe('Protected Endpoints', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await createUser({ role: 'user' });
    token = generateTestToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  });

  it('should access protected endpoint', async () => {
    const response = await authenticatedGet('/users/me', token);
    
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(user.id);
  });

  it('should reject without token', async () => {
    const response = await request(app).get('/api/v1/users/me');
    
    expect(response.status).toBe(401);
  });
});
```

---

## Creating Test Data

### Single User
```typescript
const user = await createUser({
  email: 'custom@test.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'admin',
});
```

### Multiple Users
```typescript
const users = await createUsers(5, {
  role: 'user',
});
```

### Mentor
```typescript
const mentor = await createMentor({
  bio: 'Expert developer',
  firstName: 'Jane',
  lastName: 'Smith',
});
```

### Session
```typescript
const session = await createSession({
  mentorId: mentor.id,
  menteeId: user.id,
  scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
  status: 'scheduled',
});
```

### Payment
```typescript
const payment = await createPayment({
  userId: user.id,
  amount: 100,
  currency: 'XLM',
  type: 'deposit',
  status: 'completed',
});
```

---

## Testing Error Cases

### Validation Errors
```typescript
it('should reject invalid email', async () => {
  const response = await authenticatedPost('/users', {
    email: 'invalid-email',
    password: 'Password123!',
  }, token);
  
  expect(response.status).toBe(400);
  expect(response.body.errors).toHaveLength(1);
  expect(response.body.errors[0].field).toBe('email');
});
```

### Authorization Errors
```typescript
it('should reject unauthorized access', async () => {
  const regularUser = await createUser({ role: 'user' });
  const adminToken = generateTestToken({
    userId: regularUser.id,
    email: regularUser.email,
    role: 'user', // Not an admin
  });

  const response = await authenticatedGet('/admin/users', adminToken);
  
  expect(response.status).toBe(403);
  expect(response.body.error).toContain('admin');
});
```

### Not Found Errors
```typescript
it('should return 404 for non-existent resource', async () => {
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const response = await authenticatedGet(`/sessions/${fakeId}`, token);
  
  expect(response.status).toBe(404);
  expect(response.body.error).toBe('Session not found');
});
```

---

## Testing Complete Flows

### Registration Flow
```typescript
describe('User Registration', () => {
  it('should complete registration and login flow', async () => {
    // Register
    const registerResponse = await publicPost('/auth/register', {
      email: 'newuser@test.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    });
    
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data).toHaveProperty('token');
    
    // Login
    const loginResponse = await publicPost('/auth/login', {
      email: 'newuser@test.com',
      password: 'Password123!',
    });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.token).toBeDefined();
  });
});
```

### Booking Flow
```typescript
describe('Session Booking', () => {
  it('should complete booking and payment flow', async () => {
    const mentor = await createMentor();
    const mentee = await createUser();
    
    const menteeToken = generateTestToken({
      userId: mentee.id,
      email: mentee.email,
      role: mentee.role,
    });

    // Book session
    const bookingResponse = await authenticatedPost('/sessions', {
      mentorId: mentor.id,
      scheduledAt: new Date().toISOString(),
      duration: 60,
    }, menteeToken);
    
    expect(bookingResponse.status).toBe(201);
    const sessionId = bookingResponse.body.data.id;
    
    // Make payment
    const paymentResponse = await authenticatedPost('/payments', {
      sessionId,
      amount: 100,
      type: 'payment',
    }, menteeToken);
    
    expect(paymentResponse.status).toBe(201);
    expect(paymentResponse.body.data.sessionId).toBe(sessionId);
  });
});
```

---

## Testing with Database Queries

```typescript
import { testPool } from './setup';
import { createUser } from './factories/user.factory';

describe('Database Operations', () => {
  it('should save user to database', async () => {
    const user = await createUser({
      email: 'db-test@test.com',
      role: 'user',
    });
    
    // Verify in database
    const result = await testPool.query(
      'SELECT * FROM users WHERE id = $1',
      [user.id]
    );
    
    expect(result.rows[0]).toBeDefined();
    expect(result.rows[0].email).toBe('db-test@test.com');
  });

  it('should update user data', async () => {
    const user = await createUser();
    
    await testPool.query(
      'UPDATE users SET first_name = $1 WHERE id = $2',
      ['Updated', user.id]
    );
    
    const updated = await testPool.query(
      'SELECT first_name FROM users WHERE id = $1',
      [user.id]
    );
    
    expect(updated.rows[0].first_name).toBe('Updated');
  });
});
```

---

## Parameterized Tests

```typescript
describe('Rate Limiting', () => {
  const endpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
  ];

  endpoints.forEach((endpoint) => {
    it(`should rate limit ${endpoint}`, async () => {
      // Make multiple requests
      const promises = Array(11).fill(null).map(() => 
        request(app).post(`/api/v1${endpoint}`)
      );
      
      const responses = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
```

---

## Async Operations

```typescript
describe('Background Jobs', () => {
  it('should process async operation', async () => {
    // Trigger async operation
    await publicPost('/emails/send', { to: 'test@test.com' });
    
    // Wait for processing
    await sleep(1000);
    
    // Verify result
    const emails = await testPool.query('SELECT * FROM emails');
    expect(emails.rows.length).toBeGreaterThan(0);
  });
});
```

---

## Cleanup Patterns

```typescript
describe('Resource Management', () => {
  afterEach(async () => {
    // Clean up after each test if needed
    await testPool.query('DELETE FROM temp_data');
  });

  it('should create temporary data', async () => {
    // Test logic
  });
});
```

---

## Matchers Cheat Sheet

```typescript
// Status codes
expect(response.status).toBe(200);
expect(response.status).toBe(201);
expect(response.status).toBe(400);
expect(response.status).toBe(401);
expect(response.status).toBe(403);
expect(response.status).toBe(404);

// Object properties
expect(response.body).toHaveProperty('data');
expect(response.body.data).toHaveProperty('id', '123');
expect(response.body.data).toMatchObject({ id: '123', name: 'Test' });

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain('item');
expect(array).toEqual(expect.arrayContaining(['item']));

// Booleans
expect(value).toBe(true);
expect(value).toBeFalsy();
expect(value).toBeTruthy();

// Null/Undefined
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(count).toBeGreaterThan(10);
expect(count).toBeLessThan(100);
expect(count).toBeCloseTo(3.14, 2);

// Strings
expect(text).toContain('substring');
expect(text).toMatch(/regex/i);

// Errors
expect(fn).toThrow();
expect(fn).toThrowError('message');

// Async
await expect(promise).resolves.toBeDefined();
await expect(promise).rejects.toThrow();
```

---

## Tips & Best Practices

### ✅ DO:
- Use factories for all test data
- Keep tests isolated and independent
- Use descriptive test names
- Test one thing per test
- Clean up resources after tests
- Use async/await consistently
- Mock external services

### ❌ DON'T:
- Share state between tests
- Test multiple things in one test
- Use hardcoded IDs or timestamps
- Skip cleanup steps
- Mix test concerns
- Use `setTimeout` (use `sleep()` helper)
- Test implementation details

---

## Debugging Tips

```typescript
// Log response for debugging
console.log(JSON.stringify(response.body, null, 2));

// Pause execution
debugger;

// Check database state
const users = await testPool.query('SELECT * FROM users');
console.log('Users in DB:', users.rows.length);

// Time your tests
const start = Date.now();
// ... test code
console.log('Test took:', Date.now() - start, 'ms');
```

---

## Performance Tips

1. **Reuse factories** - Don't recreate data unnecessarily
2. **Batch operations** - Create multiple records at once
3. **Minimal setup** - Only create data you need
4. **Fast crypto** - Use low bcrypt rounds (already configured)
5. **Clean efficiently** - TRUNCATE is faster than DELETE

---

Happy Testing! 🧪
