import * as StellarSdk from '@stellar/stellar-sdk';
import { env } from './env';
import config from './index';

// ---------------------------------------------------------------------------
// Network constants
// ---------------------------------------------------------------------------

const HORIZON_URLS: Record<string, { primary: string; backup: string }> = {
  testnet: {
    primary: 'https://horizon-testnet.stellar.org',
    backup: 'https://horizon-testnet.stellar.org', // only one public testnet
  },
  mainnet: {
    primary: 'https://horizon.stellar.org',
    backup: 'https://horizon.stellar.org',
  },
};

const networkKey = config.stellar.network === 'mainnet' ? 'mainnet' : 'testnet';

export const horizonUrls = {
  primary: config.stellar.horizonUrl || HORIZON_URLS[networkKey].primary,
  backup: HORIZON_URLS[networkKey].backup,
};

export const server = new StellarSdk.Horizon.Server(horizonUrls.primary);
export const backupServer = new StellarSdk.Horizon.Server(horizonUrls.backup);

export const networkPassphrase =
  config.stellar.network === 'testnet'
    ? StellarSdk.Networks.TESTNET
    : StellarSdk.Networks.PUBLIC;

// ---------------------------------------------------------------------------
// Platform keypair helper
// ---------------------------------------------------------------------------

// Secret key is read directly from env — never stored in the config object
export const getPlatformKeypair = (): StellarSdk.Keypair | null => {
  const secretKey = env.PLATFORM_SECRET_KEY;
  if (!secretKey) {
    console.warn('⚠️  Platform secret key not configured');
    return null;
  }
  return StellarSdk.Keypair.fromSecret(secretKey);
};

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

export const testStellarConnection = async (): Promise<boolean> => {
  try {
    await server.ledgers().limit(1).call();
    console.log(`✅ Stellar ${config.stellar.network} connected successfully`);
    return true;
  } catch (error) {
    console.error('❌ Stellar connection failed:', error instanceof Error ? error.message : error);
    return false;
  }
};

export { StellarSdk };
