import { emailSchema, passwordSchema, stellarAddressSchema, idParamSchema } from '../common.schemas';

describe('Common Validation Schemas', () => {
    describe('emailSchema', () => {
        it('validates correct email addresses', () => {
            expect(() => emailSchema.parse('test@example.com')).not.toThrow();
            const trimmed = emailSchema.parse(' TEST@example.com ');
            expect(trimmed).toBe('test@example.com'); // should lowercase and trim
        });

        it('rejects invalid inputs', () => {
            expect(() => emailSchema.parse('not-an-email')).toThrow();
            expect(() => emailSchema.parse('')).toThrow('Invalid email address');
            expect(() => emailSchema.parse(null)).toThrow();
        });
    });

    describe('passwordSchema', () => {
        it('validates strong passwords', () => {
            expect(() => passwordSchema.parse('Valid1Password')).not.toThrow();
        });

        it('rejects weak passwords', () => {
            expect(() => passwordSchema.parse('short1A')).toThrow('Password must be at least 8 characters');
            expect(() => passwordSchema.parse('alllowercase1')).toThrow('uppercase letter');
            expect(() => passwordSchema.parse('ALLUPPERCASE1')).toThrow('lowercase letter');
            expect(() => passwordSchema.parse('NoNumbersHere')).toThrow('number');
        });
    });

    describe('stellarAddressSchema', () => {
        it('validates correct Stellar public keys', () => {
            const validGAddress = 'GDQJUTQYK2MQX2VGDRYFYZ7E5K3XZF7VQX2M2O6K5X5R3S3N4L5K6J7A'; // Length 56
            expect(() => stellarAddressSchema.parse(validGAddress)).not.toThrow();
        });

        it('rejects passwords without G prefix or invalid length', () => {
            expect(() => stellarAddressSchema.parse('SDQJUTQY...')).toThrow('start with \\"G\\"');
            expect(() => stellarAddressSchema.parse('GDQJUTQY')).toThrow('exactly 56 characters');
            expect(() => stellarAddressSchema.parse('G1234567890123456789012345678901234567890123456789012345')).toThrow('base32 characters'); // 1, 8, 9, 0 are not valid base32 characters typical of stellar keys
        });
    });

    describe('idParamSchema', () => {
        it('validates UUID v4', () => {
            expect(() => idParamSchema.parse({ params: { id: 'b2ecc961-dafa-4b8c-8f4b-32ba15f911ed' } })).not.toThrow();
        });

        it('rejects non-UUID', () => {
            expect(() => idParamSchema.parse({ params: { id: '123' } })).toThrow('ID must be a valid UUID v4');
        });
    });
});
