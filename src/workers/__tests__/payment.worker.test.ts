jest.mock("../../config", () => ({
  default: {
    redis: { url: "redis://localhost:6379" },
    db: {
      url: "postgresql://localhost/test",
      host: "localhost",
      port: 5432,
      name: "test",
      user: "test",
      password: "test",
      poolMax: 5,
      idleTimeoutMs: 1000,
      connectionTimeoutMs: 1000,
    },
  },
}));

jest.mock("../../queues/queue.config", () => ({
  redisConnection: { host: "localhost", port: 6379 },
  QUEUE_NAMES: { PAYMENT_POLL: "payment-poll-queue" },
  CONCURRENCY: { PAYMENT_POLL: 3 },
}));

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  })),
}));

const mockDbQuery = jest.fn();
jest.mock("../../config/database", () => ({
  default: { query: mockDbQuery },
  __esModule: true,
}));

const mockGetTransaction = jest.fn();
jest.mock("../../services/stellar.service", () => ({
  stellarService: { getTransaction: mockGetTransaction },
}));

jest.mock("../../services/audit-logger.service", () => ({
  AuditLoggerService: { logEvent: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("../../utils/logger.utils", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

let capturedProcessor: Function;
jest.mock("bullmq", () => ({
  Worker: jest.fn().mockImplementation((_name: string, processor: Function) => {
    capturedProcessor = processor;
    return { on: jest.fn(), close: jest.fn() };
  }),
}));

import "../payment.worker";

describe("Payment Worker — Stellar verification", () => {
  const mockJob = {
    id: "job-1",
    attemptsMade: 0,
    opts: { attempts: 20 },
    data: {
      paymentId: "pay-1",
      userId: "user-1",
      transactionHash: "abc123hash",
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it("marks payment completed when Stellar tx is successful", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ status: "pending", transaction_hash: null }],
    });
    mockGetTransaction.mockResolvedValueOnce({
      successful: true,
      hash: "abc123hash",
    });
    mockDbQuery.mockResolvedValueOnce({ rows: [] }); // UPDATE

    await capturedProcessor(mockJob);

    expect(mockGetTransaction).toHaveBeenCalledWith("abc123hash");
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      ["pay-1"],
    );
  });

  it("retries when Stellar tx is not yet successful", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ status: "pending", transaction_hash: null }],
    });
    mockGetTransaction.mockResolvedValueOnce({
      successful: false,
      hash: "abc123hash",
    });

    await expect(capturedProcessor(mockJob)).rejects.toThrow("still pending");
    expect(mockDbQuery).toHaveBeenCalledTimes(1); // only the SELECT, no UPDATE
  });

  it("retries when Stellar lookup throws", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ status: "pending", transaction_hash: null }],
    });
    mockGetTransaction.mockRejectedValueOnce(new Error("Horizon timeout"));

    await expect(capturedProcessor(mockJob)).rejects.toThrow("still pending");
  });

  it("skips Stellar check and returns early when payment already completed", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ status: "completed", transaction_hash: "abc123hash" }],
    });

    await capturedProcessor(mockJob);

    expect(mockGetTransaction).not.toHaveBeenCalled();
  });
});
