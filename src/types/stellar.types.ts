import type { Horizon } from '@stellar/stellar-sdk';

export interface StellarAccountInfo {
  id: string;
  sequence: string;
  balances: StellarBalance[];
  subentryCount: number;
  lastModifiedLedger: number;
}

export interface StellarBalance {
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  balance: string;
  limit?: string;
}

export interface StellarTransactionResult {
  hash: string;
  ledger: number;
  successful: boolean;
  resultXdr: string;
  envelopeXdr: string;
}

export interface StellarPaymentRecord {
  id: string;
  type: string;
  createdAt: string;
  transactionHash: string;
  from: string;
  to: string;
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  amount: string;
}

export type PaymentHandler = (payment: StellarPaymentRecord) => void;

export type HorizonPaymentRecord = Horizon.ServerApi.PaymentOperationRecord;
