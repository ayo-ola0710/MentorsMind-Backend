import { testPool } from '../setup';

export interface SessionFactoryOptions {
  mentorId?: string;
  menteeId?: string;
  title?: string;
  description?: string;
  scheduledAt?: Date;
  duration?: number; // in minutes
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  meetingLink?: string;
  notes?: string;
}

export interface SessionRecord {
  id: string;
  mentor_id: string;
  mentee_id: string;
  title: string;
  description: string;
  scheduled_at: Date;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a mentorship session in the test database
 */
export async function createSession(options: SessionFactoryOptions = {}): Promise<SessionRecord> {
  const {
    mentorId,
    menteeId,
    title = 'Mentorship Session',
    description = 'Regular mentorship meeting to discuss progress and goals.',
    scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    duration = 60,
    status = 'scheduled',
    meetingLink = 'https://meet.example.com/session-' + Date.now(),
    notes = null,
  } = options;

  // If no IDs provided, we'll throw an error - sessions require existing users
  if (!mentorId || !menteeId) {
    throw new Error('mentorId and menteeId are required for creating a session');
  }

  const query = `
    INSERT INTO sessions (
      mentor_id,
      mentee_id,
      title,
      description,
      scheduled_at,
      duration_minutes,
      status,
      meeting_link,
      notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    mentorId,
    menteeId,
    title,
    description,
    scheduledAt,
    duration,
    status,
    meetingLink,
    notes,
  ];

  const { rows } = await testPool.query<SessionRecord>(query, values);
  return rows[0];
}

/**
 * Create multiple sessions at once
 */
export async function createSessions(count: number, options: SessionFactoryOptions = {}): Promise<SessionRecord[]> {
  const sessions: SessionRecord[] = [];
  
  for (let i = 0; i < count; i++) {
    const session = await createSession({
      ...options,
      title: options.title || `Session ${i + 1}`,
    });
    sessions.push(session);
  }
  
  return sessions;
}

/**
 * Delete a session by ID (cleanup helper)
 */
export async function deleteSession(id: string): Promise<void> {
  await testPool.query('DELETE FROM sessions WHERE id = $1', [id]);
}
