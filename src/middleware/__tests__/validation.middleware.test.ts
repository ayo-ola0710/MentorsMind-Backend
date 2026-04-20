import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateBody } from '../validation.middleware';
import { ResponseUtil } from '../../utils/response.utils';

// Mock ResponseUtil
jest.mock('../../utils/response.utils', () => ({
    ResponseUtil: {
        validationError: jest.fn(),
    },
}));

// Mock logger to avoid console spam during tests
jest.mock('../../utils/logger.utils', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

describe('Validation Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            body: {},
            query: {},
            params: {},
            originalUrl: '/test',
            method: 'POST',
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    const testSchema = z.object({
        body: z.object({
            name: z.string().min(3, 'Name must be at least 3 characters'),
            age: z.number().min(18, 'Must be 18 or older'),
        }),
    });

    describe('validate (full request)', () => {
        it('calls next() when validation passes', async () => {
            req.body = { name: 'John', age: 25 };
            const middleware = validate(testSchema);

            await middleware(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith();
            expect(ResponseUtil.validationError).not.toHaveBeenCalled();
        });

        it('returns validation error when validation fails', async () => {
            req.body = { name: 'Jo', age: 15 };
            const middleware = validate(testSchema);

            await middleware(req as Request, res as Response, next);

            expect(next).not.toHaveBeenCalled();
            expect(ResponseUtil.validationError).toHaveBeenCalled();

            const errorArgs = (ResponseUtil.validationError as jest.Mock).mock.calls[0];
            expect(errorArgs[0]).toBe(res);
            expect(errorArgs[1]).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ field: 'body.name', message: 'Name must be at least 3 characters' }),
                    expect.objectContaining({ field: 'body.age', message: 'Must be 18 or older' }),
                ])
            );
        });
    });

    describe('validateBody', () => {
        const bodySchema = z.object({
            email: z.string().email(),
        });

        it('validates body successfully and transforms data', async () => {
            req.body = { email: ' test@example.com  ' };
            const schema = z.object({
                email: z.string().trim().email(),
            });
            const middleware = validateBody(schema);

            await middleware(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith();
            expect(req.body).toEqual({ email: 'test@example.com' });
        });

        it('fails upon invalid body', async () => {
            req.body = { email: 'not-an-email' };
            const middleware = validateBody(bodySchema);

            await middleware(req as Request, res as Response, next);

            expect(next).not.toHaveBeenCalled();
            expect(ResponseUtil.validationError).toHaveBeenCalled();
        });
    });
});
