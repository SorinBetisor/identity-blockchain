/**
 * Consent - On-chain consent agreement between user and requester
 * Stored in the ConsentManager smart contract
 */
export interface Consent {
  consentID: string; // bytes32 hash (0x...)
  ownerDID: string; // Ethereum address of identity owner
  requesterID: string; // Ethereum address of requester
  dataTypes: DataType[]; // Array of data types user consents to share
  startDate: bigint; // Unix timestamp
  endDate: bigint; // Unix timestamp
  status: ConsentStatus;
  tokenReward: bigint; // Token amount rewarded for granting consent
}

export type ConsentStatus = "Active" | "Revoked" | "Expired";

export type DataType =
  | "creditTier"
  | "riskScore"
  | "incomeBand"
  | "netWorth"
  | "customProof";

/**
 * ConsentInput - For creating new consents
 */
export interface ConsentInput {
  requesterID: string;
  dataTypes: DataType[];
  durationDays: number; // 1-365
}

/**
 * CustomProofQuery - For custom proof-of-creditworthiness queries
 */
export interface CustomProofQuery {
  proofType: "income" | "balance" | "noOverdueLoans";
  threshold?: bigint; // For income and balance queries
}

