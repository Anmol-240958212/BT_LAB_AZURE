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
}

export interface FDCalculationResponse {
  maturityAmount: number;
  effectiveRate: number;
  interestEarned: number;
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
  status?: string;
}

export interface FixedDepositAccountResponse {
  fdAccountNo: string;
  customerId: string;
  productCode: string;
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

export interface FDTransactionRequest {
  fdAccountNo: string;
  txnType: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'PENALTY' | string;
  amount: number;
  penaltyAmount?: number;
  txnDate: string;
  remarks?: string;
}

export interface FDTransactionRecord extends FDTransactionRequest {
  transactionId: string;
}

export interface BatchProcessResponse {
  status: string;
  businessDate: string;
  message: string;
}
