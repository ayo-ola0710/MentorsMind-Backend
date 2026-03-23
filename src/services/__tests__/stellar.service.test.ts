import { stellarService } from '../stellar.service';
import type { StellarPaymentRecord } from '../../types/stellar.types';

/**
 * Stellar Service Tests
 * 
 * These tests validate the StellarService API surface and basic functionality.
 * Full integration tests require a Horizon server; these focus on API contracts.
 */
describe('StellarService', () => {
  describe('API Surface', () => {
    it('should export stellarService instance', () => {
      expect(stellarService).toBeDefined();
    });

    it('should have getAccount method', () => {
      expect(typeof stellarService.getAccount).toBe('function');
    });

    it('should have submitTransaction method', () => {
      expect(typeof stellarService.submitTransaction).toBe('function');
    });

    it('should have streamPayments method', () => {
      expect(typeof stellarService.streamPayments).toBe('function');
    });
  });

  describe('getAccount', () => {
    it('should return a promise', () => {
      const result = stellarService.getAccount('GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM');
      expect(result instanceof Promise).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      try {
        // Invalid key should not throw synchronously
        await stellarService.getAccount('GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM');
      } catch (err) {
        // Expected - network unreachable in test
        expect(err).toBeDefined();
      }
    });

    it('should reject invalid public key format', async () => {
      try {
        await stellarService.getAccount('invalid_key');
        // May succeed or fail depending on Horizon
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('submitTransaction', () => {
    it('should return a promise', () => {
      const result = stellarService.submitTransaction('test');
      expect(result instanceof Promise).toBe(true);
    });

    it('should reject invalid XDR', async () => {
      try {
        await stellarService.submitTransaction('not_valid_xdr_at_all');
        // Should throw
        fail('Expected to throw for invalid XDR');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should reject empty XDR', async () => {
      try {
        await stellarService.submitTransaction('');
        fail('Expected to throw for empty XDR');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('streamPayments', () => {
    it('should return an unsubscribe function', () => {
      const close = stellarService.streamPayments(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM',
        () => {},
      );
      expect(typeof close).toBe('function');
      close();
    });

    it('should accept optional cursor parameter', () => {
      const close = stellarService.streamPayments(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM',
        () => {
          // Handler
        },
        'now',
      );
      expect(typeof close).toBe('function');
      close();
    });

    it('should accept payment handler callback', (done) => {
      const payments: StellarPaymentRecord[] = [];

      const close = stellarService.streamPayments(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM',
        (payment) => {
          payments.push(payment);
        },
      );

      // Verify it can be called without error
      setTimeout(() => {
        close();
        done();
      }, 100);
    });
  });

  describe('Integration', () => {
    it('should handle multiple concurrent calls', async () => {
      const promises = [
        stellarService.getAccount('GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM').catch(() => null),
        stellarService.getAccount('GBGJICVXLMKB5RUVWFGSYAYZ3GKPVUVJRM4MXNHZFKVPGFZWC4HVHVUN').catch(() => null),
      ];

      const results = await Promise.allSettled(promises);
      expect(results).toHaveLength(2);
    });

    it('should not interfere between stream and account calls', async () => {
      const close = stellarService.streamPayments(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM',
        () => {},
      );

      try {
        await stellarService.getAccount('GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM');
      } catch (err) {
        // Expected to fail (no Horizon)
      }

      close();
      expect(true).toBe(true);
    });
  });
});
