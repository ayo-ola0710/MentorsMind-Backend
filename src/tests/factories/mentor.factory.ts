import { createUser, generateUniqueEmail, UserRecord } from './user.factory';

export interface MentorFactoryOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  isActive?: boolean;
  specialties?: string[];
}

/**
 * Create a mentor user with enhanced profile
 */
export async function createMentor(options: MentorFactoryOptions = {}): Promise<UserRecord> {
  const {
    email = generateUniqueEmail('mentor'),
    password = 'MentorPassword123!',
    firstName = 'Test',
    lastName = 'Mentor',
    bio = options.bio || 'Experienced mentor with expertise in various technologies and leadership.',
    avatarUrl = options.avatarUrl || 'https://example.com/mentor-avatar.png',
    isActive = true,
  } = options;

  return createUser({
    email,
    password,
    firstName,
    lastName,
    role: 'mentor',
    bio,
    avatarUrl,
    isActive,
  });
}

/**
 * Create multiple mentors at once
 */
export async function createMentors(count: number, options: MentorFactoryOptions = {}): Promise<UserRecord[]> {
  const mentors: UserRecord[] = [];
  
  for (let i = 0; i < count; i++) {
    const mentor = await createMentor({
      ...options,
      email: options.email || generateUniqueEmail(`mentor${i}`),
    });
    mentors.push(mentor);
  }
  
  return mentors;
}
