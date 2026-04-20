import { AuditLoggerService } from '../audit-logger.service';
import pool from '../../config/database';
import { LogLevel, AuditAction } from '../../utils/log-formatter.utils';

// Mock the database pool
jest.mock('../../config/database', () => ({
    query: jest.fn(),
    on: jest.fn(),
}));

describe('AuditLoggerService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logEvent', () => {
        it('creates an audit log in the database and outputs json to console', async () => {
            // Suppress stdout for clean test output
            jest.spyOn(console, 'info').mockImplementation(() => { });

            const mockPayload = {
                level: LogLevel.INFO,
                action: AuditAction.LOGIN_SUCCESS,
                message: 'User logged in successfully',
                userId: '123e4567-e89b-12d3-a456-426614174000',
                metadata: { method: 'POST' },
            };

            (pool.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ id: 'mock-uuid', ...mockPayload, created_at: new Date() }],
            });

            const result = await AuditLoggerService.logEvent(mockPayload);

            expect(console.info).toHaveBeenCalled();
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO audit_logs'),
                expect.arrayContaining([
                    LogLevel.INFO,
                    AuditAction.LOGIN_SUCCESS,
                    'User logged in successfully',
                    '123e4567-e89b-12d3-a456-426614174000',
                    null, // entityType
                    null, // entityId
                    '{"method":"POST"}', // metadata JSON
                    null, // ipAddress
                    null, // userAgent
                ])
            );
            expect(result).toHaveProperty('id', 'mock-uuid');
        });

        it('handles database insertion failures gracefully', async () => {
            jest.spyOn(console, 'warn').mockImplementation(() => { });
            jest.spyOn(console, 'error').mockImplementation(() => { });

            (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const result = await AuditLoggerService.logEvent({
                level: LogLevel.WARN,
                action: AuditAction.SECURITY_EVENT,
                message: 'Suspicious payload detected',
            });

            expect(console.warn).toHaveBeenCalled(); // Should still log to stream
            expect(console.error).toHaveBeenCalledWith('Failed to insert audit log to DB:', expect.any(Error));
            expect(result).toBeNull();
        });
    });

    describe('search and report', () => {
        it('builds search queries based on parameters', async () => {
            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count query
                .mockResolvedValueOnce({ rows: [{ id: 'log-1' }, { id: 'log-2' }] }); // Fetch query

            const result = await AuditLoggerService.search({
                action: AuditAction.DATA_MODIFIED,
                limit: 5,
                offset: 10,
            });

            expect(pool.query).toHaveBeenCalledTimes(2);

            // Count query execution
            expect((pool.query as jest.Mock).mock.calls[0][0]).toContain('WHERE action = $1');
            expect((pool.query as jest.Mock).mock.calls[0][1]).toEqual([AuditAction.DATA_MODIFIED]);

            // Fetch query execution (limit and offset appended)
            expect((pool.query as jest.Mock).mock.calls[1][0]).toContain('LIMIT $2 OFFSET $3');
            expect((pool.query as jest.Mock).mock.calls[1][1]).toEqual([AuditAction.DATA_MODIFIED, 5, 10]);

            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(10);
        });

        it('generates reports by executing search with a high limit', async () => {
            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ count: '1' }] })
                .mockResolvedValueOnce({ rows: [{ id: 'report-1' }] });

            const logs = await AuditLoggerService.generateReport({
                level: LogLevel.ERROR,
            });

            expect(logs).toHaveLength(1);
            // It should force a limit of 1000 and offset of 0
            expect((pool.query as jest.Mock).mock.calls[1][1]).toContain(1000);
            expect((pool.query as jest.Mock).mock.calls[1][1]).toContain(0);
        });
    });

    describe('cleanupOldLogs', () => {
        it('executes a deletion query with the retention interval', async () => {
            (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 15 });

            const deletedCount = await AuditLoggerService.cleanupOldLogs(30);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM audit_logs'),
                [30]
            );
            expect(deletedCount).toBe(15);
        });
    });
});
