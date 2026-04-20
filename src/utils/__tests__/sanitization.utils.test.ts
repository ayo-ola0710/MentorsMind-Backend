import {
    escapeHtml,
    stripXss,
    sanitizeString,
    containsSqlInjection,
    sanitizeObject,
    sanitizeStellarAddress,
} from '../sanitization.utils';

describe('Sanitization Utilities', () => {
    describe('escapeHtml', () => {
        it('escapes standard HTML entities', () => {
            const input = '<script>alert("xss")</script> & it is 1=1';
            const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt; &amp; it is 1&#x3D;1';
            expect(escapeHtml(input)).toBe(expected);
        });
    });

    describe('stripXss', () => {
        it('removes script tags and inline events', () => {
            const input = 'hello <script>alert(1)</script> <a href="javascript:void(0)" onclick="steal()">click</a>';
            const output = stripXss(input);
            expect(output).not.toContain('<script>');
            expect(output).not.toContain('javascript:');
            expect(output).not.toContain('onclick=');
        });
    });

    describe('sanitizeString', () => {
        it('trims and removes XSS payloads', () => {
            const input = '   hello world <script>alert(1)</script>   ';
            expect(sanitizeString(input)).toBe('hello world');
        });
    });

    describe('containsSqlInjection', () => {
        it('detects common SQL injection patterns', () => {
            expect(containsSqlInjection('SELECT * FROM users')).toBe(true);
            expect(containsSqlInjection('admin\' --')).toBe(true);
            expect(containsSqlInjection('1=1 OR a=a')).toBe(true);
            expect(containsSqlInjection('DROP TABLE students;')).toBe(true);
        });

        it('allows normal text', () => {
            expect(containsSqlInjection('I am a normal user dropping by')).toBe(false);
            expect(containsSqlInjection('This is a selection of items')).toBe(false);
            expect(containsSqlInjection('OR is a conjunction')).toBe(false);
        });
    });

    describe('sanitizeObject', () => {
        it('recursively sanitizes strings in an object', () => {
            const input = {
                name: '   John Doe   ',
                bio: '<script>alert(1)</script> I am a dev',
                nested: {
                    url: 'javascript:alert(1)',
                    age: 25,
                    active: true,
                },
                tags: [' react ', ' <script>alert("xss")</script> ', 'node'],
            };

            const expected = {
                name: 'John Doe',
                bio: 'I am a dev',
                nested: {
                    url: 'alert(1)',
                    age: 25,
                    active: true,
                },
                tags: ['react', '', 'node'],
            };

            expect(sanitizeObject(input)).toEqual(expected);
        });

        it('handles null and primitive values', () => {
            expect(sanitizeObject(null)).toBeNull();
            expect(sanitizeObject(42)).toBe(42);
            expect(sanitizeObject(true)).toBe(true);
        });

        it('stops at maxDepth', () => {
            const input = { a: { b: { c: { d: '   test   ' } } } };
            // By default maxDepth is 10, let's pass custom options
            const output = sanitizeObject(input, { maxDepth: 2 }) as any;
            // Object at depth 3 should remain unmodified
            expect(output.a.b.c.d).toBe('   test   ');
        });
    });

    describe('sanitizeStellarAddress', () => {
        it('trims and capitalizes address', () => {
            const input = '   gcbcq...   ';
            expect(sanitizeStellarAddress(input)).toBe('GCBCQ...');
        });
    });
});
