/**
 * Consent - On-chain consent agreement between user and requester
 * Stored in the ConsentManager smart contract
 * Matches the Consent struct in ConsentManager.sol
 * Note: ownerDID is not stored in the struct (it's the mapping key)
 */
export interface Consent {
  consentID: string; // bytes32 hash (0x...) - keccak256(requesterDID + userDID)
  requesterDID: string; // Ethereum address of requester (e.g., bank)
  status: ConsentStatus;
  startDate: bigint; // Unix timestamp (uint96)
  endDate: bigint; // Unix timestamp (uint96)
}

/**
 * ConsentStatus - Consent status enumeration from ConsentManager.sol
 */
export type ConsentStatus =
  | "None" // Consent doesn't exist
  | "Granted" // Consent is active and can be used for data access
  | "Requested" // Consent created but not yet granted
  | "Revoked" // Consent was manually revoked by the user
  | "Expired"; // Consent has passed its endDate

/**
 * ConsentInput - For creating new consents
 * Matches the createConsent function parameters in ConsentManager.sol
 * Note: Consent grants access to both creditTier and incomeBand automatically
 */
export interface ConsentInput {
  requesterDID: string; // Ethereum address of the requester
  userDID: string; // Ethereum address of the user granting consent
  startDate: bigint; // Unix timestamp when consent becomes active
  endDate: bigint; // Unix timestamp when consent expires (must be after startDate)
}

