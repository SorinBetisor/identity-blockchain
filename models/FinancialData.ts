/**
 * FinancialData - Off-chain financial data structure
 * Stored locally as JSON file, encrypted
 */
export interface FinancialData {
  userDID: string; // Ethereum address (0x...)
  assets: Asset[];
  liabilities: Liability[];
  lastUpdated: string; // ISO 8601 timestamp
  metadata?: Record<string, unknown>;
}

/**
 * Asset - Individual asset entry
 */
export interface Asset {
  assetID: string;
  assetType: AssetType;
  value: number; // In base currency units
  ownershipPercentage: number; // 0-100
  lastUpdated: string; // ISO 8601 timestamp
  metadata?: Record<string, unknown>;
}

export type AssetType =
  | "savings"
  | "checking"
  | "investment"
  | "property"
  | "vehicle"
  | "other";

/**
 * Liability - Individual liability entry
 */
export interface Liability {
  liabilityID: string;
  liabilityType: LiabilityType;
  amount: number; // Outstanding balance in base currency units
  interestRate: number; // Annual interest rate as percentage (0-100)
  monthlyPayment: number; // Monthly payment amount
  dueDate: string; // ISO 8601 timestamp
  isOverdue: boolean;
  lastUpdated: string; // ISO 8601 timestamp
  metadata?: Record<string, unknown>;
}

export type LiabilityType =
  | "credit_card"
  | "mortgage"
  | "auto_loan"
  | "personal_loan"
  | "student_loan"
  | "other";

/**
 * FinancialDataInput - For creating/updating financial data
 */
export interface FinancialDataInput {
  assets?: Asset[];
  liabilities?: Liability[];
  metadata?: Record<string, unknown>;
}

