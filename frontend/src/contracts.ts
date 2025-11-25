export const CONTRACT_ADDRESSES = {
  IdentityRegistry: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  ConsentManager: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  DataBroker: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  DataSharingToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
} as const;

export const IdentityRegistryABI = [
  {
    type: "function",
    name: "register",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "identities",
    inputs: [{ name: "userDID", type: "address" }],
    outputs: [
      { name: "userDID", type: "address" },
      { name: "creditTier", type: "uint8" },
      { name: "incomeBand", type: "uint8" },
      { name: "dataPointer", type: "bytes32" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCreditTier",
    inputs: [{ name: "userDID", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getIncomeBand",
    inputs: [{ name: "userDID", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "UserRegistered",
    inputs: [{ indexed: true, name: "userDID", type: "address" }],
  },
] as const;

export const ConsentManagerABI = [
  {
    type: "function",
    name: "createConsent",
    inputs: [
      { name: "requesterDID", type: "address" },
      { name: "userDID", type: "address" },
      { name: "startDate", type: "uint96" },
      { name: "endDate", type: "uint96" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "changeStatus",
    inputs: [
      { name: "userDID", type: "address" },
      { name: "consentID", type: "bytes32" },
      { name: "newStatus", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isConsentGranted",
    inputs: [
      { name: "userDID", type: "address" },
      { name: "requesterDID", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ConsentCreated",
    inputs: [
      { indexed: true, name: "userDID", type: "address" },
      { indexed: true, name: "requesterDID", type: "address" },
      { indexed: true, name: "consentID", type: "bytes32" },
      { indexed: false, name: "startDate", type: "uint96" },
      { indexed: false, name: "endDate", type: "uint96" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ConsentStatusChanged",
    inputs: [
      { indexed: true, name: "userDID", type: "address" },
      { indexed: true, name: "requesterDID", type: "address" },
      { indexed: true, name: "consentID", type: "bytes32" },
      { indexed: false, name: "oldStatus", type: "uint8" },
      { indexed: false, name: "newStatus", type: "uint8" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
] as const;

export const DataBrokerABI = [
  {
    type: "function",
    name: "getCreditTier",
    inputs: [{ name: "ownerDID", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "nonpayable", // Not view because it emits events/mints tokens
  },
  {
    type: "function",
    name: "getIncomeBand",
    inputs: [{ name: "ownerDID", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "DataAccessGranted",
    inputs: [
      { indexed: true, name: "requesterDID", type: "address" },
      { indexed: true, name: "ownerDID", type: "address" },
      { indexed: false, name: "dataType", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "DataAccessDenied",
    inputs: [
      { indexed: true, name: "requesterDID", type: "address" },
      { indexed: true, name: "ownerDID", type: "address" },
      { indexed: false, name: "dataType", type: "string" },
      { indexed: false, name: "reason", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
] as const;

export const CreditTier = {
  None: 0,
  LowBronze: 1,
  MidBronze: 2,
  HighBronze: 3,
  LowSilver: 4,
  MidSilver: 5,
  HighSilver: 6,
  LowGold: 7,
  MidGold: 8,
  HighGold: 9,
  LowPlatinum: 10,
  MidPlatinum: 11,
  HighPlatinum: 12,
} as const;

export const IncomeBand = {
  None: 0,
  upto25k: 1,
  upto50k: 2,
  upto75k: 3,
  upto100k: 4,
  upto150k: 5,
  upto200k: 6,
  upto250k: 7,
  upto300k: 8,
  upto350k: 9,
  upto400k: 10,
  upto450k: 11,
  upto500k: 12,
  moreThan500k: 13,
} as const;

export const ConsentStatus = {
  None: 0,
  Granted: 1,
  Requested: 2,
  Revoked: 3,
  Expired: 4,
} as const;
