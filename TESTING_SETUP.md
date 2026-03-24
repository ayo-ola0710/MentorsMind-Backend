# MentorMinds Backend - Testing Setup Guide

This guide will help you set up and run the complete testing infrastructure.

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js 18+ and npm installed
- Dependencies installed (`npm install`)

## Step 1: Create Test Database

Open your terminal and run:

```bash
# Using createdb (PostgreSQL utility)
createdb mentorminds_test

# OR using psql
psql -U postgres
CREATE DATABASE mentorminds_test;
\q
```

## Step 2: Configure Test Environment

The `.env.test` file is already created with default values. Update it with your credentials:

```bash
# Open .env.test and update these values:
DATABASE_URL_TEST=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mentorminds_test
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mentorminds_test
DB_PASSWORD=YOUR_PASSWORD
```

**Important**: Never commit real passwords to version control. The `.env.test` file is in `.gitignore`.

## Step 3: Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Expected Output

When you run `npm test`, you should see:

```
PASS src/__tests__/health.test.ts
  Health Check API
    GET /api/v1/health
      ✓ should return health status (XX ms)
    GET /
      ✓ should return API information (XX ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        X.XXX s
```

## Troubleshooting

### Error: Database Connection Failed

If you see database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   # Windows
   services.msc
   # Look for "postgresql-x64-XX" service
   
   # Linux/Mac
   sudo systemctl status postgresql
   ```

2. Check database exists:
   ```bash
   psql -U postgres -l | grep mentorminds_test
   ```

3. Verify credentials in `.env.test` match your PostgreSQL setup

### Error: Cannot Find Module

If you see module import errors:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Error: TypeScript Compilation Issues

```bash
# Check TypeScript configuration
npx tsc --noEmit

# If errors appear, fix them before running tests
```

## Writing Your First Test

Here's a simple example to get you started:

```typescript
// src/__tests__/users.test.ts
import request from 'supertest';
import app from '../app';
import { createUser } from './factories/user.factory';
import { generateTestToken } from './helpers/request.helper';

describe('Users API', () => {
  it('should get user profile', async () => {
    // Create a test user
    const user = await createUser({ 
      email: 'test@example.com',
      role: 'user' 
    });
    
    // Generate auth token
    const token = generateTestToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    
    // Make authenticated request
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    
    // Assertions
    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(user.email);
  });
});
```

## Using Factories

Factories make it easy to create test data:

```typescript
import { 
  createUser, 
  createMentor, 
  createAdminUser 
} from './factories/user.factory';
import { createSession } from './factories/session.factory';
import { createPayment } from './factories/payment.factory';

// Create a basic user
const user = await createUser();

// Create a mentor with custom bio
const mentor = await createMentor({
  bio: 'Expert in TypeScript and Node.js',
  firstName: 'John',
  lastName: 'Doe',
});

// Create an admin user
const admin = await createAdminUser({
  email: 'admin@test.com',
});

// Create a session (requires existing users)
const session = await createSession({
  mentorId: mentor.id,
  menteeId: user.id,
  scheduledAt: new Date(),
});

// Create a payment
const payment = await createPayment({
  userId: user.id,
  amount: 100,
  type: 'deposit',
});
```

## Coverage Reports

After running `npm run test:coverage`, open the HTML report:

```bash
# Windows
start coverage/lcov-report/index.html

# Mac
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html
```

## CI/CD Integration

The test suite is configured to fail if:
- Any test fails
- Code coverage drops below 70%
- Database connection fails

Add this to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Setup test database
  run: createdb mentorminds_test
  
- name: Run tests
  run: npm test
  env:
    DATABASE_URL_TEST: ${{ secrets.TEST_DATABASE_URL }}
```

## Best Practices

1. **Use factories**: Always use factories to create test data
2. **Clean state**: Each test starts with a clean database
3. **Descriptive names**: Use descriptive test names
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Test one thing**: Each test should verify one behavior

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/testingandquality/testing-best-practices.md)

## Support

If you encounter issues:
1. Check this guide thoroughly
2. Review error messages carefully
3. Check existing issues on GitHub
4. Ask in the team chat

---

Happy Testing! 🧪✅
