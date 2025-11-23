/**
 * UserProfile - On-chain user identity and creditworthiness data
 * Stored in the IdentityRegistry smart contract
 */
export interface UserProfile {
  userDID: string; // Ethereum address (0x...)
  hashedEmail: string; // SHA-256 hash (0x...)
  hashedNationalID: string; // SHA-256 hash (0x...)
  creditTier: CreditTier;
  riskScore: number; // 0-1000
  incomeBand: IncomeBand;
  netWorth: bigint; // In wei (smallest currency unit)
  dataPointer: string; // Hash of off-chain data location (0x...)
  isActive: boolean;
  registrationDate: bigint; // Unix timestamp
}

export type CreditTier = "Gold" | "Silver" | "Bronze";

export type IncomeBand =
  | "0-25k"
  | "25k-50k"
  | "50k-75k"
  | "75k-100k"
  | "100k-150k"
  | "150k-200k"
  | "200k+";

/**
 * UserProfileInput - For creating/updating user profiles
 */
export interface UserProfileInput {
  hashedEmail: string;
  hashedNationalID: string;
  creditTier?: CreditTier;
  riskScore?: number;
  incomeBand?: IncomeBand;
  netWorth?: bigint;
  dataPointer?: string;
}

