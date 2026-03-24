import { testPool } from '../setup';

export interface PaymentFactoryOptions {
  userId?: string;
  amount?: number;
  currency?: string;
  type?: 'deposit' | 'withdrawal' | 'payment';
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  stellarTxHash?: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  amount: string;
  currency: string;
  status: string;
  stellar_tx_hash: string | null;
  type: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Generate a random Stellar transaction hash for testing
 */
export function generateStellarTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

/**
 * Create a payment/transaction in the test database
 */
export async function createPayment(options: PaymentFactoryOptions = {}): Promise<PaymentRecord> {
  const {
    userId,
    amount = 100.00,
    currency = 'XLM',
    type = 'payment',
    status = 'completed',
    stellarTxHash = generateStellarTxHash(),
  } = options;

  if (!userId) {
    throw new Error('userId is required for creating a payment');
  }

  const query = `
    INSERT INTO transactions (
      user_id,
      amount,
      currency,
      status,
      stellar_tx_hash,
      type
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    userId,
    amount.toFixed(7), // Stellar uses 7 decimal places
    currency,
    status,
    stellarTxHash,
    type,
  ];

  const { rows } = await testPool.query<PaymentRecord>(query, values);
  return rows[0];
}

/**
 * Create multiple payments at once
 */
export async function createPayments(count: number, options: PaymentFactoryOptions = {}): Promise<PaymentRecord[]> {
  const payments: PaymentRecord[] = [];
  
  for (let i = 0; i < count; i++) {
    const payment = await createPayment({
      ...options,
      stellarTxHash: options.stellarTxHash || generateStellarTxHash(),
    });
    payments.push(payment);
  }
  
  return payments;
}

/**
 * Create a deposit payment
 */
export async function createDeposit(userId: string, amount: number = 100): Promise<PaymentRecord> {
  return createPayment({
    userId,
    amount,
    type: 'deposit',
    status: 'completed',
  });
}

/**
 * Create a withdrawal payment
 */
export async function createWithdrawal(userId: string, amount: number = 50): Promise<PaymentRecord> {
  return createPayment({
    userId,
    amount,
    type: 'withdrawal',
    status: 'pending',
  });
}

/**
 * Create a payment for a session
 */
export async function createSessionPayment(userId: string, amount: number = 100): Promise<PaymentRecord> {
  return createPayment({
    userId,
    amount,
    type: 'payment',
    status: 'completed',
  });
}

/**
 * Delete a payment by ID (cleanup helper)
 */
export async function deletePayment(id: string): Promise<void> {
  await testPool.query('DELETE FROM transactions WHERE id = $1', [id]);
}
