import pool from '../../config/database';
import { AnalyticsService } from '../analytics.service';

// Mock the database pool
jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

describe('AnalyticsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should aggregate platform KPIs correctly', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1000' }] }) // revenue
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })   // users
        .mockResolvedValueOnce({ rows: [{ total: '10' }] })   // sessions
        .mockResolvedValueOnce({ rows: [{ completed: '8', total: '10' }] }); // completion

      const result = await AnalyticsService.getOverview();

      expect(result).toEqual({
        totalRevenue: 1000,
        totalUsers: 50,
        activeSessions: 10,
        completionRate: 80,
      });
    });

    it('should return 0s if no data is found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{}] });

      const result = await AnalyticsService.getOverview();

      expect(result).toEqual({
        totalRevenue: 0,
        totalUsers: 0,
        activeSessions: 0,
        completionRate: 0,
      });
    });
  });

  describe('getRevenueBreakdown', () => {
    it('should fetch revenue breakdown for a period', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ total: '1000', fees: '100', payouts: '900' }],
      });

      const result = await AnalyticsService.getRevenueBreakdown('30d');

      expect(result).toEqual({
        total: 1000,
        fees: 100,
        payouts: 900,
      });
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('payments'), expect.any(Array));
    });
  });

  describe('getUserGrowth', () => {
    it('should fetch user growth data', async () => {
      const mockRows = [
        { date: new Date('2026-03-01'), count: '2' },
        { date: new Date('2026-03-02'), count: '5' },
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await AnalyticsService.getUserGrowth('7d');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: mockRows[0].date.toISOString(),
        count: 2,
      });
    });
  });

  describe('getSessionMetrics', () => {
    it('should calculate session metrics', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ total: '20', completed: '15', cancelled: '5' }],
      });

      const result = await AnalyticsService.getSessionMetrics('30d');

      expect(result).toEqual({
        total: 20,
        completed: 15,
        cancelled: 5,
        completionRate: 75,
      });
    });
  });

  describe('getPaymentMetrics', () => {
    it('should aggregate payment volume and methods', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total_volume: '5000', count: '50' }] })
        .mockResolvedValueOnce({ 
          rows: [
            { method: 'stellar', count: '40' },
            { method: 'stripe', count: '10' }
          ] 
        });

      const result = await AnalyticsService.getPaymentMetrics('30d');

      expect(result).toEqual({
        totalVolume: 5000,
        count: 50,
        methods: {
          stellar: 40,
          stripe: 10,
        },
      });
    });
  });
});
