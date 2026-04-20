import { MeetingService } from '../../src/services/meeting.service';
import { calculateMeetingExpiry, isMeetingExpired, generateJitsiRoomName } from '../../src/utils/meeting.utils';

describe('Meeting Utils', () => {
  describe('calculateMeetingExpiry', () => {
    it('should calculate expiry time correctly', () => {
      const scheduledAt = new Date('2026-03-24T10:00:00Z');
      const durationMinutes = 60;
      
      const expiresAt = calculateMeetingExpiry(scheduledAt, durationMinutes);
      
      // Session ends at 11:00, plus 30 minutes buffer = 11:30
      expect(expiresAt).toEqual(new Date('2026-03-24T11:30:00Z'));
    });

    it('should use custom buffer if provided', () => {
      const scheduledAt = new Date('2026-03-24T10:00:00Z');
      const durationMinutes = 60;
      const bufferMinutes = 60;
      
      const expiresAt = calculateMeetingExpiry(scheduledAt, durationMinutes, bufferMinutes);
      
      // Session ends at 11:00, plus 60 minutes buffer = 12:00
      expect(expiresAt).toEqual(new Date('2026-03-24T12:00:00Z'));
    });
  });

  describe('isMeetingExpired', () => {
    it('should return true for expired meetings', () => {
      const expiresAt = new Date('2026-03-24T10:00:00Z'); // Past date
      expect(isMeetingExpired(expiresAt)).toBe(true);
    });

    it('should return false for future meetings', () => {
      const expiresAt = new Date('2099-03-24T10:00:00Z'); // Future date
      expect(isMeetingExpired(expiresAt)).toBe(false);
    });
  });

  describe('generateJitsiRoomName', () => {
    it('should generate room name from session ID', () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      const roomName = generateJitsiRoomName(sessionId);
      
      expect(roomName).toBe('MentorMinds-123e4567e89b12d3a456426614174000');
    });

    it('should remove hyphens from UUID', () => {
      const sessionId = 'abc-def-ghi';
      const roomName = generateJitsiRoomName(sessionId);
      
      expect(roomName).toBe('MentorMinds-abcdefghi');
    });
  });
});

describe('Meeting Service', () => {
  describe('validateConfig', () => {
    it('should validate configuration', () => {
      const isValid = MeetingService.validateConfig();
      expect(isValid).toBeDefined();
    });
  });

  describe('getProviderInfo', () => {
    it('should return provider information', () => {
      const info = MeetingService.getProviderInfo();
      expect(info).toHaveProperty('provider');
      expect(info).toHaveProperty('baseUrl');
    });
  });

  describe('createMeetingRoom - Jitsi', () => {
    it('should create Jitsi meeting room', async () => {
      // Mock environment to use Jitsi (no API key required)
      process.env.MEETING_PROVIDER = 'jitsi';
      
      const options = {
        sessionId: 'test-session-123',
        scheduledAt: new Date('2026-03-24T10:00:00Z'),
        durationMinutes: 60,
        mentorName: 'John Mentor',
        menteeName: 'Jane Mentee',
      };

      const result = await MeetingService.createMeetingRoom(options);

      expect(result).toHaveProperty('meetingUrl');
      expect(result).toHaveProperty('roomId');
      expect(result).toHaveProperty('expiresAt');
      expect(result.roomId).toContain('MentorMinds');
    });
  });
});
