/**
 * AccessLog - Immutable audit log entry
 * Stored in the DataSharing smart contract
 */
export interface AccessLog {
  logID: string; // bytes32 hash (0x...)
  timestamp: bigint; // Unix timestamp
  eventType: EventType;
  actorDID: string; // Address of who performed the action
  targetDID: string; // Address of who was affected (if applicable)
  dataType: string; // Data type involved (if applicable)
  success: boolean; // Whether the action was successful
  details: string; // Optional metadata/details about the event
}

export type EventType =
  | "USER_REGISTRATION"
  | "CONSENT_CREATED"
  | "CONSENT_REVOKED"
  | "CONSENT_EXPIRED"
  | "DATA_ACCESS_GRANTED"
  | "DATA_ACCESS_DENIED"
  | "TOKEN_REWARD"
  | "PROFILE_UPDATED";

/**
 * AccessLogFilter - For filtering access logs
 */
export interface AccessLogFilter {
  userDID?: string;
  eventType?: EventType;
  startDate?: bigint;
  endDate?: bigint;
  success?: boolean;
}

