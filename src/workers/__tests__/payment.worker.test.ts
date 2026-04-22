import pool from "../../config/database";
import { Job } from "bullmq";
import { stellarService } from "../../services/stellar.service";
import { pollPaymentStatus } from "../payment.worker";
import { AuditLoggerService } from "../../services/audit-logger.service";

// Mock external dependencies
jest.mock("../../config/database", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
  query: jest.fn(),
}));

jest.mock("../../services/stellar.service", () => ({
  stellarService: {
    getAccount: jest.fn(),
  },
}));

jest.mock("../../services/audit-logger.service", () => ({
  AuditLoggerService: {
    logEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../utils/logger.utils", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Payment Worker Unit Tests", () => {
  const mockJob = (data: any) =>
    ({
      id: "test-job-id",
      data,
      attemptsMade: 0,
      opts: { attempts: 20 },
    }) as Job;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should query the transactions table and update it to completed", async () => {
    const paymentId = "tx-123";
    const userId = "user-456";
    const transactionHash = "hash-789";

    // Mock initial query to fetch transaction
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ status: "pending", stellar_tx_hash: transactionHash }],
    });

    // Mock StellarService to return a confirmed account
    (stellarService.getAccount as jest.Mock).mockResolvedValue({
      id: "stellar-acc",
    });

    // Mock update query
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const job = mockJob({ paymentId, userId, transactionHash });
    await pollPaymentStatus(job);

    // Verify correct table and column names in SELECT
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "SELECT status, stellar_tx_hash FROM transactions WHERE id = $1",
      ),
      [paymentId],
    );

    // Verify correct table name in UPDATE
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE transactions SET status = 'completed'"),
      [paymentId],
    );

    expect(stellarService.getAccount).toHaveBeenCalledWith(transactionHash);
  });

  it("should throw error if transaction is still pending", async () => {
    const paymentId = "tx-123";
    const userId = "user-456";
    const transactionHash = "hash-789";

    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ status: "pending", stellar_tx_hash: transactionHash }],
    });

    // Mock StellarService to simulate not found
    (stellarService.getAccount as jest.Mock).mockRejectedValue(
      new Error("Not found"),
    );

    const job = mockJob({ paymentId, userId, transactionHash });

    await expect(pollPaymentStatus(job)).rejects.toThrow(/still pending/);
  });
});
