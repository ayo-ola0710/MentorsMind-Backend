# TODO: Fix confirmPayment Verifies Wrong Thing on Stellar

## Plan

### 1. Update `src/services/stellar.service.ts`

- [x] Enhance `getTransaction()` to also return `source_account`
- [x] Add `getTransactionOperations(txHash)` method to fetch operations for a transaction

### 2. Update `src/services/payments.service.ts`

- [x] Replace `getAccount()` call with `getTransaction(stellarTxHash)`
- [x] Assert `transaction.successful === true`
- [x] Verify `transaction.source_account` matches `payment.from_address`
- [x] Verify payment amount in transaction operations matches `payment.amount`
- [x] Return 400 error if any verification fails (remove silent catch)

### 3. Update Tests

- [x] `src/__tests__/unit/payments.service.test.ts` — update mocks, add 400 validation tests
- [x] `src/__tests__/services/payments.service.unit.test.ts` — update mocks, add 400 validation tests

### 4. Run tests to verify

- [ ] Run payment service unit tests
