import { Request, Response, NextFunction } from 'express';
import { auditLogMiddleware, globalModificationAuditMiddleware } from '../audit-log.middleware';
import { AuditLoggerService } from '../../services/audit-logger.service';
import { AuditAction, LogLevel } from '../../utils/log-formatter.utils';

// Mock the AuditLoggerService
jest.mock('../../services/audit-logger.service', () => ({
    AuditLoggerService: {
        logEvent: jest.fn().mockResolvedValue({ id: 'mock-log' }),
    },
}));

describe('Audit Log Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequest = {
            method: 'POST',
            originalUrl: '/api/v1/resource',
            headers: { 'user-agent': 'jest-test-agent' },
            ip: '127.0.0.1',
            params: {},
            query: {},
        };

        const listeners: Record<string, Function> = {};

        mockResponse = {
            statusCode: 200,
            on: jest.fn((event: string, callback: Function) => {
                listeners[event] = callback;
                return mockResponse as Response;
            }),
            // Helper to trigger events
            emit: (event: string) => {
                if (listeners[event]) listeners[event]();
                return true;
            }
        } as any;

        nextFunction = jest.fn();
    });

    describe('auditLogMiddleware', () => {
        it('extracts metadata and triggers logEvent on response finish', () => {
            const middleware = auditLogMiddleware({
                action: AuditAction.LOGIN_SUCCESS,
                getMetadata: (_req) => ({ userEmail: 'test@example.com' }),
                getEntityDetails: () => ({ type: 'auth', id: null }),
            });

            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect(AuditLoggerService.logEvent).not.toHaveBeenCalled();

            // Trigger the 'finish' event
            (mockResponse as any).emit('finish');

            expect(AuditLoggerService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: AuditAction.LOGIN_SUCCESS,
                    level: LogLevel.INFO,
                    entityType: 'auth',
                    metadata: expect.objectContaining({
                        userEmail: 'test@example.com',
                        statusCode: 200,
                        method: 'POST',
                    }),
                    ipAddress: '127.0.0.1',
                    userAgent: 'jest-test-agent',
                })
            );
        });

        it('infers WARN level on 400+ status codes', () => {
            mockResponse.statusCode = 403;

            const middleware = auditLogMiddleware({
                action: AuditAction.SECURITY_EVENT,
            });

            middleware(mockRequest as Request, mockResponse as Response, nextFunction);
            (mockResponse as any).emit('finish');

            expect(AuditLoggerService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: AuditAction.SECURITY_EVENT,
                    level: LogLevel.WARN,
                })
            );
        });
    });

    describe('globalModificationAuditMiddleware', () => {
        it('skips GET requests', () => {
            mockRequest.method = 'GET';

            globalModificationAuditMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
            (mockResponse as any).emit('finish'); // Should do nothing

            expect(nextFunction).toHaveBeenCalled();
            expect(AuditLoggerService.logEvent).not.toHaveBeenCalled();
        });

        it('logs PUT requests as DATA_MODIFIED', () => {
            mockRequest.method = 'PUT';
            mockRequest.originalUrl = '/api/v1/users/123';
            (mockRequest as any).user = { id: 'admin-uuid' };

            globalModificationAuditMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
            (mockResponse as any).emit('finish');

            expect(nextFunction).toHaveBeenCalled();
            expect(AuditLoggerService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: AuditAction.DATA_MODIFIED,
                    level: LogLevel.INFO,
                    userId: 'admin-uuid',
                    entityType: 'auto-intercept',
                    entityId: '/api/v1/users/123',
                })
            );
        });

        it('logs DELETE requests as DATA_DELETED', () => {
            mockRequest.method = 'DELETE';

            globalModificationAuditMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
            (mockResponse as any).emit('finish');

            expect(AuditLoggerService.logEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: AuditAction.DATA_DELETED,
                })
            );
        });
    });
});
