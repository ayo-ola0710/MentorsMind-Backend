import { CalendarService } from '../services/calendar.service';
import HealthService from '../services/health.service';
import { AdminService } from '../services/admin.service';
import { pool } from '../config/database';
import { EncryptionUtil } from '../utils/encryption.utils';
import { google } from 'googleapis';

jest.mock('../config/database');
jest.mock('../utils/encryption.utils');
jest.mock('googleapis');
jest.mock('../utils/logger');
jest.mock('../queues/email.queue', () => ({
  emailQueue: {
    getJobCounts: jest.fn().mockResolvedValue({ active: 5, waiting: 10 }),
  },
}));
jest.mock('../services/notification.service', () => ({
  NotificationService: {
    sendNotification: jest.fn().mockResolvedValue({ success: true, notificationIds: ['n1'], errors: [] }),
  },
}));

describe('Security and Reliability Improvements', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CalendarService Token Encryption', () => {
    it('should encrypt tokens before storing in connectGoogleCalendar', async () => {
      const mockTokens = {
        access_token: 'raw-access',
        refresh_token: 'raw-refresh',
        expiry_date: Date.now() + 3600000,
      };

      (google.auth.OAuth2.prototype.getToken as jest.Mock).mockResolvedValue({ tokens: mockTokens });
      (EncryptionUtil.encrypt as jest.Mock).mockImplementation((val) => Promise.resolve(`enc-${val}`));
      (EncryptionUtil.getCurrentKeyVersion as jest.Mock).mockResolvedValue('v1');

      await CalendarService.connectGoogleCalendar('user-123', 'auth-code');

      expect(EncryptionUtil.encrypt).toHaveBeenCalledWith('raw-access');
      expect(EncryptionUtil.encrypt).toHaveBeenCalledWith('raw-refresh');
      
      const lastCall = (pool.query as jest.Mock).mock.calls[0];
      expect(lastCall[0]).toContain('encrypted_access_token');
      expect(lastCall[0]).toContain('encrypted_refresh_token');
      expect(lastCall[0]).toContain('pii_encryption_version');
      expect(lastCall[1]).toContain('enc-raw-access');
      expect(lastCall[1]).toContain('enc-raw-refresh');
      expect(lastCall[1]).toContain('v1');
    });

    it('should decrypt tokens when building authed client', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          encrypted_access_token: 'enc-access',
          encrypted_refresh_token: 'enc-refresh',
          expiry_date: new Date(),
        }],
      });

      (EncryptionUtil.decrypt as jest.Mock).mockImplementation((val) => 
        Promise.resolve(val.replace('enc-', 'dec-'))
      );

      const client = await CalendarService._buildAuthedClient('user-123');

      expect(EncryptionUtil.decrypt).toHaveBeenCalledWith('enc-access');
      expect(EncryptionUtil.decrypt).toHaveBeenCalledWith('enc-refresh');
      expect(google.auth.OAuth2.prototype.setCredentials).toHaveBeenCalledWith(expect.objectContaining({
        access_token: 'dec-access',
        refresh_token: 'dec-refresh',
      }));
    });
  });

  describe('CalendarService SQL Injection Fix', () => {
    it('should use static column names in createGoogleCalendarEvent', async () => {
      const bookingId = 'booking-456';
      const mentorId = 'mentor-789';
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: bookingId,
            mentor_id: mentorId,
            learner_id: 'learner-101',
            start_time: new Date(),
            end_time: new Date(),
          }],
        })
        .mockResolvedValue({}); // for _buildAuthedClient queries

      // Mock google calendar response
      (google.calendar as jest.Mock).mockReturnValue({
        events: {
          insert: jest.fn().mockResolvedValue({ data: { id: 'event-1' } }),
        },
      });

      // Mock _buildAuthedClient to return a dummy client
      jest.spyOn(CalendarService, '_buildAuthedClient').mockResolvedValue({} as any);

      await CalendarService.createGoogleCalendarEvent(bookingId);

      // Check the update queries
      const queries = (pool.query as jest.Mock).mock.calls.map(c => c[0]);
      
      // Verify no dynamic column concatenation is used in the UPDATE query
      // The fix uses "UPDATE bookings SET google_event_id_mentor = $1 WHERE id = $2"
      const updateMentorQuery = queries.find(q => q.includes('UPDATE bookings SET google_event_id_mentor'));
      const updateLearnerQuery = queries.find(q => q.includes('UPDATE bookings SET google_event_id_learner'));

      expect(updateMentorQuery).toBeDefined();
      expect(updateLearnerQuery).toBeDefined();
      expect(updateMentorQuery).not.toContain('${'); // No string interpolation
      expect(updateLearnerQuery).not.toContain('${');
    });
  });

  describe('CalendarService Token Expiration Handling', () => {
    it('should proactively refresh an expired access token', async () => {
      const pastExpiry = new Date(Date.now() - 1000);
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          encrypted_access_token: 'enc-access',
          encrypted_refresh_token: 'enc-refresh',
          expiry_date: pastExpiry,
        }],
      });

      (EncryptionUtil.decrypt as jest.Mock).mockImplementation((val: string) =>
        Promise.resolve(val.replace('enc-', 'dec-'))
      );

      const refreshMock = jest.fn().mockResolvedValue({});
      (google.auth.OAuth2 as jest.Mock).mockImplementation(() => ({
        setCredentials: jest.fn(),
        on: jest.fn(),
        refreshAccessToken: refreshMock,
      }));

      const client = await CalendarService._buildAuthedClient('user-123');

      expect(refreshMock).toHaveBeenCalled();
      expect(client).not.toBeNull();
    });

    it('should disconnect and return null on invalid_grant during refresh', async () => {
      const pastExpiry = new Date(Date.now() - 1000);
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{
          encrypted_access_token: 'enc-access',
          encrypted_refresh_token: 'enc-refresh',
          expiry_date: pastExpiry,
        }],
      });

      (EncryptionUtil.decrypt as jest.Mock).mockImplementation((val: string) =>
        Promise.resolve(val.replace('enc-', 'dec-'))
      );

      const refreshMock = jest.fn().mockRejectedValue(new Error('invalid_grant'));
      (google.auth.OAuth2 as jest.Mock).mockImplementation(() => ({
        setCredentials: jest.fn(),
        on: jest.fn(),
        refreshAccessToken: refreshMock,
      }));

      const { NotificationService } = require('../services/notification.service');

      const client = await CalendarService._buildAuthedClient('user-123');

      expect(refreshMock).toHaveBeenCalled();
      expect(client).toBeNull();

      // Verify DB was updated to disconnect
      const disconnectQuery = (pool.query as jest.Mock).mock.calls.find(
        (call: any[]) => call[0].includes('google_calendar_connected = false')
      );
      expect(disconnectQuery).toBeDefined();

      // Verify notification was sent
      expect(NotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          title: 'Calendar Connection Expired',
        })
      );
    });

    it('should disconnect and notify on invalid_grant during event creation', async () => {
      const bookingId = 'booking-456';
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: bookingId,
            mentor_id: 'mentor-789',
            learner_id: 'learner-101',
            start_time: new Date(),
            end_time: new Date(),
          }],
        })
        .mockResolvedValue({}); // for disconnect query

      const authClient = {
        on: jest.fn(),
      };
      jest.spyOn(CalendarService, '_buildAuthedClient').mockResolvedValue(authClient as any);

      (google.calendar as jest.Mock).mockReturnValue({
        events: {
          insert: jest.fn().mockRejectedValue(new Error('invalid_grant')),
        },
      });

      const { NotificationService } = require('../services/notification.service');

      await CalendarService.createGoogleCalendarEvent(bookingId);

      // Verify disconnect was triggered for the participant
      const disconnectQuery = (pool.query as jest.Mock).mock.calls.find(
        (call: any[]) => call[0].includes('google_calendar_connected = false')
      );
      expect(disconnectQuery).toBeDefined();

      // Verify notification was sent
      expect(NotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Calendar Connection Expired',
        })
      );
    });
  });

  describe('Health Check Improvements', () => {
    it('should return simplified health status as requested', async () => {
      // Mock sub-checks
      jest.spyOn(HealthService as any, 'checkDatabase').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(HealthService as any, 'checkRedis').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(HealthService as any, 'checkHorizon').mockResolvedValue({ status: 'healthy' });
      jest.spyOn(HealthService as any, 'checkBullMQ').mockResolvedValue({ 
        status: 'healthy', 
        details: { active: 42 } 
      });

      const status = await HealthService.getSimplifiedStatus();

      expect(status).toEqual({
        stellar: 'OK',
        redis: 'OK',
        queues: {
          active: 42
        }
      });
    });

    it('should report DOWN when components are unhealthy', async () => {
        jest.spyOn(HealthService as any, 'checkHorizon').mockResolvedValue({ status: 'degraded' });
        jest.spyOn(HealthService as any, 'checkRedis').mockResolvedValue({ status: 'unhealthy' });
        jest.spyOn(HealthService as any, 'checkBullMQ').mockResolvedValue({ status: 'healthy', details: { active: 0 } });
  
        const status = await HealthService.getSimplifiedStatus();
  
        expect(status.stellar).toBe('DOWN');
        expect(status.redis).toBe('DOWN');
      });
  });

  describe('AdminService.listPayments SQL Parameter Fix', () => {
    it('should use proper $N placeholders in both data and count queries', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'tx-1', created_at: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      await AdminService.listPayments(10, 0, '2024-01-01', '2024-12-31');

      const calls = (pool.query as jest.Mock).mock.calls;
      expect(calls).toHaveLength(2);

      const dataQuery = calls[0][0] as string;
      const dataParams = calls[0][1] as unknown[];
      const countQuery = calls[1][0] as string;
      const countParams = calls[1][1] as unknown[];

      // Data query must use $N placeholders, not bare numbers
      expect(dataQuery).toMatch(/created_at >= \$\d+/);
      expect(dataQuery).toMatch(/created_at <= \$\d+/);
      expect(dataQuery).toMatch(/LIMIT \$\d+/);
      expect(dataQuery).toMatch(/OFFSET \$\d+/);

      // Count query must also use $N placeholders
      expect(countQuery).toMatch(/created_at >= \$\d+/);
      expect(countQuery).toMatch(/created_at <= \$\d+/);

      // Count query must NOT contain LIMIT or OFFSET
      expect(countQuery).not.toContain('LIMIT');
      expect(countQuery).not.toContain('OFFSET');

      // Verify parameter values are correct
      expect(dataParams).toEqual(['2024-01-01', '2024-12-31', 10, 0]);
      expect(countParams).toEqual(['2024-01-01', '2024-12-31']);
    });

    it('should work without date filters', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await AdminService.listPayments(50, 0);

      const calls = (pool.query as jest.Mock).mock.calls;
      const dataQuery = calls[0][0] as string;
      const countQuery = calls[1][0] as string;

      expect(dataQuery).toContain("type IN ('payment', 'mentor_payout')");
      expect(countQuery).toContain("type IN ('payment', 'mentor_payout')");
      expect(dataQuery).not.toContain('created_at >=');
      expect(countQuery).not.toContain('created_at >=');
    });
  });
});
