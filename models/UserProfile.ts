/**
 * UserProfile - On-chain user identity and creditworthiness data
 * Stored in the IdentityRegistry smart contract
 * Matches the Identity struct in IdentityRegistry.sol
 */
export interface UserProfile {
  userDID: string; // Ethereum address (0x...)
  creditTier: CreditTier;
  incomeBand: IncomeBand;
  dataPointer: string; // bytes32 hash of off-chain FinancialData JSON file (0x...)
}

/**
 * CreditTier - Credit tier classifications from IdentityRegistry.sol
 * Each tier has Low/Mid/High sub-classifications
 */
export type CreditTier =
  | "None"
  | "LowBronze"
  | "MidBronze"
  | "HighBronze"
  | "LowSilver"
  | "MidSilver"
  | "HighSilver"
  | "LowGold"
  | "MidGold"
  | "HighGold"
  | "LowPlatinum"
  | "MidPlatinum"
  | "HighPlatinum";

/**
 * IncomeBand - Income band classifications from IdentityRegistry.sol
 * Ranges from None (not set) to moreThan500k
 */
export type IncomeBand =
  | "None"
  | "upto25k"
  | "upto50k"
  | "upto75k"
  | "upto100k"
  | "upto150k"
  | "upto200k"
  | "upto250k"
  | "upto300k"
  | "upto350k"
  | "upto400k"
  | "upto450k"
  | "upto500k"
  | "moreThan500k";

