import bcrypt from 'bcryptjs';
import { testPool } from '../setup';

export interface UserFactoryOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: 'user' | 'mentor' | 'admin';
  bio?: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface UserRecord {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Generate a unique email for testing
 */
export function generateUniqueEmail(prefix = 'user'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}.${timestamp}.${random}@test.com`;
}

/**
 * Create a user in the test database
 */
export async function createUser(options: UserFactoryOptions = {}): Promise<UserRecord> {
  const {
    email = generateUniqueEmail('user'),
    password = 'TestPassword123!',
    firstName = 'Test',
    lastName = 'User',
    role = 'user',
    bio = null,
    avatarUrl = null,
    isActive = true,
  } = options;

  // Hash password with low rounds for faster tests
  const passwordHash = await bcrypt.hash(password, 4);

  const query = `
    INSERT INTO users (
      email,
      password_hash,
      role,
      first_name,
      last_name,
      bio,
      avatar_url,
      is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    email,
    passwordHash,
    role,
    firstName,
    lastName,
    bio,
    avatarUrl,
    isActive,
  ];

  const { rows } = await testPool.query<UserRecord>(query, values);
  return rows[0];
}

/**
 * Create multiple users at once
 */
export async function createUsers(count: number, options: UserFactoryOptions = {}): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  
  for (let i = 0; i < count; i++) {
    const user = await createUser({
      ...options,
      email: options.email || generateUniqueEmail(`user${i}`),
    });
    users.push(user);
  }
  
  return users;
}

/**
 * Create a test admin user
 */
export async function createAdminUser(options: UserFactoryOptions = {}): Promise<UserRecord> {
  return createUser({
    ...options,
    role: 'admin',
  });
}

/**
 * Create a test mentor user
 */
export async function createMentorUser(options: UserFactoryOptions = {}): Promise<UserRecord> {
  return createUser({
    ...options,
    role: 'mentor',
  });
}

/**
 * Delete a user by ID (cleanup helper)
 */
export async function deleteUser(id: string): Promise<void> {
  await testPool.query('DELETE FROM users WHERE id = $1', [id]);
}
