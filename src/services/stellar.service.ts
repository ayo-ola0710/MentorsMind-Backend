import { Horizon, TransactionBuilder } from '@stellar/stellar-sdk';
import { server, backupServer, networkPassphrase } from '../config/stellar';
import { logger } from '../utils/logger.utils';
import { parseAccountInfo, withRetry, TtlCache } from '../utils/stellar.utils';
import type {
  StellarAccountInfo,
  StellarTransactionResult,
  StellarPaymentRecord,
  PaymentHandler,
  HorizonPaymentRecord,
} from '../types/stellar.types';

const ACCOUNT_CACHE_TTL_MS = 5_000;
const MAX_RETRIES = 3;

class StellarService {
  private accountCache = new TtlCache<StellarAccountInfo>(ACCOUNT_CACHE_TTL_MS);

  // ---------------------------------------------------------------------------
  // getAccount
  // ---------------------------------------------------------------------------

  async getAccount(publicKey: string): Promise<StellarAccountInfo> {
    const cached = this.accountCache.get(publicKey);
    if (cached) {
      logger.debug('stellar.getAccount cache hit', { publicKey });
      return cached;
    }

    const info = await this.callWithFailover(
      'getAccount',
      (srv) => srv.accounts().accountId(publicKey).call(),
    ).then(parseAccountInfo);

    this.accountCache.set(publicKey, info);
    return info;
  }

  // ---------------------------------------------------------------------------
  // submitTransaction
  // ---------------------------------------------------------------------------

  async submitTransaction(txEnvelopeXdr: string): Promise<StellarTransactionResult> {
    const tx = TransactionBuilder.fromXDR(txEnvelopeXdr, networkPassphrase);

    const result = await this.callWithFailover(
      'submitTransaction',
      (srv) => srv.submitTransaction(tx),
    );

    return {
      hash: result.hash,
      ledger: result.ledger,
      successful: result.successful,
      resultXdr: result.result_xdr,
      envelopeXdr: result.envelope_xdr,
    };
  }

  // ---------------------------------------------------------------------------
  // streamPayments
  // ---------------------------------------------------------------------------

  streamPayments(
    publicKey: string,
    onPayment: PaymentHandler,
    cursor: string = 'now',
  ): () => void {
    logger.info('stellar.streamPayments started', { publicKey, cursor });

    const close = server
      .payments()
      .forAccount(publicKey)
      .cursor(cursor)
      .stream({
        onmessage: (record: HorizonPaymentRecord) => {
          if (record.type !== 'payment') return;
          const payment: StellarPaymentRecord = {
            id: record.id,
            type: record.type,
            createdAt: record.created_at,
            transactionHash: record.transaction_hash,
            from: record.from,
            to: record.to,
            assetType: record.asset_type,
            assetCode: (record as any).asset_code,
            assetIssuer: (record as any).asset_issuer,
            amount: record.amount,
          };
          onPayment(payment);
        },
        onerror: (error: unknown) => {
          logger.error('stellar.streamPayments error', {
            publicKey,
            error: error instanceof Error ? error.message : error,
          });
        },
      } as any);

    return typeof close === 'function' ? close : () => {};
  }

  // ---------------------------------------------------------------------------
  // Internal: call with retry + failover + logging
  // ---------------------------------------------------------------------------

  private async callWithFailover<T>(
    label: string,
    fn: (srv: Horizon.Server) => Promise<T>,
  ): Promise<T> {
    const start = Date.now();

    try {
      const result = await withRetry(() => fn(server), `${label}[primary]`, MAX_RETRIES);
      this.logLatency(label, 'primary', start);
      return result;
    } catch (primaryErr) {
      logger.warn(`${label} primary failed, trying backup`, {
        error: primaryErr instanceof Error ? primaryErr.message : primaryErr,
      });
    }

    try {
      const result = await withRetry(() => fn(backupServer), `${label}[backup]`, MAX_RETRIES);
      this.logLatency(label, 'backup', start);
      return result;
    } catch (backupErr) {
      logger.error(`${label} all servers failed`, {
        error: backupErr instanceof Error ? backupErr.message : backupErr,
      });
      throw backupErr;
    }
  }

  private logLatency(label: string, server: string, start: number): void {
    logger.info(`stellar.${label}`, { server, latencyMs: Date.now() - start });
  }
}

export const stellarService = new StellarService();
