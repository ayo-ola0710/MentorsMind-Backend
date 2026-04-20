import { parseAccountInfo, withRetry, TtlCache } from '../stellar.utils';
import * as LoggerUtils from '../../utils/logger.utils';

jest.mock('../../utils/logger.utils');

describe('stellar.utils', () => {
  describe('parseAccountInfo', () => {
    it('should parse Horizon account response correctly', () => {
      const horizonResponse = {
        id: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM',
        sequence: '1000',
        subentry_count: 2,
        last_modified_ledger: 50000,
        balances: [
          {
            balance: '1500.0000000',
            asset_type: 'native',
          },
          {
            balance: '500.0000000',
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQSTBE3ZCJL7DYMA5',
            limit: '1000.0000000',
          },
        ],
      } as any;

      const result = parseAccountInfo(horizonResponse);

      expect(result.id).toBe('GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM');
      expect(result.sequence).toBe('1000');
      expect(result.subentryCount).toBe(2);
      expect(result.lastModifiedLedger).toBe(50000);
      expect(result.balances).toHaveLength(2);
    });

    it('should parse native balance without asset code', () => {
      const horizonResponse = {
        id: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM',
        sequence: '1000',
        subentry_count: 0,
        last_modified_ledger: 50000,
        balances: [
          {
            balance: '2000.5000000',
            asset_type: 'native',
          },
        ],
      } as any;

      const result = parseAccountInfo(horizonResponse);

      expect(result.balances[0].assetType).toBe('native');
      expect(result.balances[0].balance).toBe('2000.5000000');
      expect(result.balances[0].assetCode).toBeUndefined();
      expect(result.balances[0].assetIssuer).toBeUndefined();
    });

    it('should parse credit balance with all fields', () => {
      const horizonResponse = {
        id: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRXG5C5BTLW3I2FB2YKJAJRMJHDTM',
        sequence: '1000',
        subentry_count: 1,
        last_modified_ledger: 50000,
        balances: [
          {
            balance: '500.0000000',
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQSTBE3ZCJL7DYMA5',
            limit: '1000.0000000',
          },
        ],
      } as any;

      const result = parseAccountInfo(horizonResponse);

      expect(result.balances[0].assetCode).toBe('USDC');
      expect(result.balances[0].assetIssuer).toBe('GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQSTBE3ZCJL7DYMA5');
      expect(result.balances[0].limit).toBe('1000.0000000');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(fn, 'test', 3);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, 'test', 3, 10); // short delay for tests

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const fn = jest
        .fn()
        .mockRejectedValue(new Error('Persistent failure'));

      await expect(withRetry(fn, 'test', 2, 10)).rejects.toThrow('Persistent failure');

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should log warnings on retry attempts', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockResolvedValueOnce('success');

      await withRetry(fn, 'testOp', 3, 10);

      expect(LoggerUtils.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('testOp attempt'),
        expect.any(Object),
      );
    });

    it('should use exponential backoff between retries', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('success');

      const start = Date.now();
      const result = await withRetry(fn, 'test', 2, 100);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      // Verify delay was applied (should be around 100ms minimum)
      expect(Date.now() - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe('TtlCache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should store and retrieve values', () => {
      const cache = new TtlCache<string>(5000);

      cache.set('key1', 'value1');
      const result = cache.get('key1');

      expect(result).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new TtlCache<string>(5000);

      const result = cache.get('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should expire values after TTL', () => {
      const cache = new TtlCache<string>(5000);

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      jest.advanceTimersByTime(5001);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should keep values within TTL', () => {
      const cache = new TtlCache<string>(5000);

      cache.set('key1', 'value1');
      jest.advanceTimersByTime(2500);
      expect(cache.get('key1')).toBe('value1');

      jest.advanceTimersByTime(2000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should support invalidate operation', () => {
      const cache = new TtlCache<string>(5000);

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      cache.invalidate('key1');
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should handle multiple keys independently', () => {
      const cache = new TtlCache<string>(5000);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');

      jest.advanceTimersByTime(5001);

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should support generic types', () => {
      interface TestType {
        id: number;
        name: string;
      }

      const cache = new TtlCache<TestType>(5000);
      const obj: TestType = { id: 1, name: 'test' };

      cache.set('key1', obj);
      const result = cache.get('key1');

      expect(result).toEqual(obj);
      expect(result?.id).toBe(1);
    });
  });
});
