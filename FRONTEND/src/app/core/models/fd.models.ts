export interface TermDTO {
  value: number;
  unit: 'DAYS' | 'MONTHS' | 'YEARS' | string;
}

export interface FDCalculationRequest {
  principal: number;
  term: TermDTO;
  baseRate: number;
  categories?: string[];
  interestType: 'SIMPLE' | 'COMPOUND' | string;
  interestFrequency?: 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL' | string;
}

export interface FDCalculationResponse {
  maturityAmount: number;
  effectiveRate: number;
  interestEarned: number;
  interestFrequency?: string;
}

export interface FixedDepositAccountRequest {
  customerId: string;
  productCode: string;
  branchCode: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  interestType: string;
  interestPayoutType: string;
  interestFrequency?: string;
  /** Derived by the FD service from its Product & Pricing Kafka quote. */
  currency?: string;
}

export interface FixedDepositAccountResponse {
  fdAccountNo: string;
  customerId: string;
  productCode: string;
  currency?: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  openedAt?: string;
  maturityDate?: string;
  status: 'ACTIVE' | 'CLOSED' | 'PENDING' | string;
  interestType: string;
  interestPayoutType: string;
  accruedInterest?: number;
  closedAt?: string;
  interestFrequency?: string;
  crudValue?: string;
  userId?: string;
  wsId?: string;
}

export interface FDAccountCreationResponse {
  account: FixedDepositAccountResponse;
  transactionStatus?: string;
  transactionReference?: string;
  message?: string;
}

export interface FDWithdrawalRequest {
  fdAccountNo: string;
  withdrawalDate: string; // ISO date YYYY-MM-DD
  transferAccount: string;
}

export interface FDWithdrawalResponse {
  status: string;
  message: string;
  withdrawalAmount: number;
  penaltyApplied: number;
}

export interface FDAccountDateAdjustmentRequest { openingDate: string; maturityDate: string; }

export interface FDTransactionRequest {
  fdAccountNo: string;
  txnType: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'PENALTY' | string;
  amount: number;
  penaltyAmount?: number;
  txnDate: string;
  remarks?: string;
}

/** A persisted financial event shown in the administrator's read-only ledger. */
export interface FDTransactionLedgerEntry {
  transactionId: string;
  fdAccountNo: string;
  customerId?: string;
  currency: string;
  transactionType: string;
  amount: number;
  penaltyAmount: number;
  transactionDate: string;
  remarks?: string;
}

export interface BatchProcessResponse {
  status: string;
  businessDate: string;
  message: string;
}
