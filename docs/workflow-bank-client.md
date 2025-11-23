# Bank-Client Workflow: Proof-of-Creditworthiness System

This document explains the complete workflow for a bank-client scenario where a client wants to prove their creditworthiness through the blockchain without sharing raw financial data.

## System Overview

The system consists of three main smart contracts:

- **IdentityRegistry**: Manages user registration and credit profile data
- **ConsentManager**: Handles consent agreements between users and requesters
- **DataBroker**: Enforces consent verification before allowing data access

## Complete Workflow

### Phase 1: User Registration & Profile Setup

#### Step 1.1: User Registers on Blockchain

**Actor**: Client (User)
**Contract**: `IdentityRegistry`
**Function**: `register()`

```solidity
// Client calls from their wallet
IdentityRegistry.register()
```

**What happens:**

- Client's Ethereum address becomes their unique identifier (userDID)
- Identity is created with default values:
  - `creditTier`: None
  - `incomeBand`: None
  - `dataPointer`: 0x0
- Event `UserRegistered` is emitted

**Result**: Client is now registered in the system with address as their ID.

---

#### Step 1.2: Client Prepares Financial Data (Off-Chain)

**Actor**: Client
**Component**: Off-chain data storage (Python)

**What happens:**

- Client collects financial documents:
  - Payslips
  - Bank statements
  - Asset information
  - Liability information
- Client uses Python `FinancialDataStorage` to:
  - Create `FinancialData` object with assets and liabilities
  - Save to encrypted JSON file locally
  - Calculate hash of the file (for data integrity)

**Result**: Financial data stored off-chain, hash calculated.

---

#### Step 1.3: Client Submits Documents to Validator (Off-Chain)

**Actor**: Client → Validator Service
**Component**: Off-chain validator service (not yet implemented)

**What happens:**

- Client encrypts and submits payslips/documents to trusted validator service
- Validator service:
  - Decrypts and validates documents
  - Calculates credit tier based on financial data
  - Calculates income band from income data
  - Verifies data integrity
  - Generates creditworthiness summary

**Result**: Validator has calculated credit scores, ready to update on-chain.

---

#### Step 1.4: Validator Updates User Profile on Blockchain

**Actor**: Validator Service
**Contract**: `IdentityRegistry`
**Function**: `updateProfile()`

```solidity
// Validator calls (must be from validator address)
IdentityRegistry.updateProfile(
    userDID: 0x742d35...,
    creditTier: CreditTier.MidGold,
    incomeBand: IncomeBand.upto150k
)
```

**What happens:**

- Validator updates client's credit tier and income band
- Only validator can call this (enforced by `onlyValidator` modifier)
- Event `ProfileUpdated` is emitted

**Result**: Client's credit profile is now on-chain and publicly verifiable.

---

#### Step 1.5: Client Updates Data Pointer

**Actor**: Client
**Contract**: `IdentityRegistry`
**Function**: `updateDataPointer()`

```solidity
// Client calls from their wallet
IdentityRegistry.updateDataPointer(
    dataPointer: 0x1a2b3c... // Hash of off-chain financial data JSON
)
```

**What happens:**

- Client stores hash of their off-chain financial data
- This hash proves data integrity (any tampering can be detected)
- Event `ProfileUpdated` is emitted

**Result**: On-chain hash points to off-chain data, enabling integrity verification.

---

### Phase 2: Bank-Client Interaction

#### Step 2.1: Client Visits Bank

**Actor**: Client → Bank
**Location**: Physical bank or online portal

**What happens:**

- Client wants to apply for a loan
- Client provides their Ethereum address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- Bank needs to verify client owns this address

---

#### Step 2.2: Bank Verifies Address Ownership

**Actor**: Bank
**Contract**: `IdentityRegistry`
**Function**: `verifyAddressOwnership()`

**Workflow:**

1. **Bank generates challenge:**

   ```
   Message: "BankXYZ-Verify-2024-01-15-abc123"
   (Includes timestamp and nonce to prevent replay attacks)
   ```
2. **Client signs challenge:**

   - Bank sends challenge to client
   - Client's wallet (MetaMask, etc.) prompts: "Sign message to prove ownership"
   - Client approves → signature created using private key
   - Signature returned: `0xabcd1234...` (65 bytes)
3. **Bank verifies signature:**

   ```solidity
   IdentityRegistry.verifyAddressOwnership(
       userAddress: 0x742d35...,
       message: "BankXYZ-Verify-2024-01-15-abc123",
       signature: 0xabcd1234...
   )
   // Returns: true (if valid) or false (if invalid)
   ```

**What happens:**

- Function extracts r, s, v from signature
- Uses `ecrecover()` to recover address from signature
- Compares recovered address with claimed address
- Returns `true` if they match (proves ownership)

**Result**:

- ✅ If `true`: Bank trusts client owns the address
- ❌ If `false`: Bank rejects, client cannot prove ownership

---

#### Step 2.3: Bank Checks Client Registration

**Actor**: Bank
**Contract**: `IdentityRegistry`
**Function**: `identities(address)` (public mapping)

```solidity
// Bank queries client's registration status
IdentityRegistry.identities(0x742d35...)
// Returns: Identity struct with creditTier, incomeBand, etc.
```

**What happens:**

- Bank verifies client is registered
- Bank can see client's credit tier and income band (public data)
- Bank confirms client has completed profile setup

**Result**: Bank confirms client is registered and has credit profile.

---

#### Step 2.4: Bank Requests Consent

**Actor**: Bank
**Contract**: `ConsentManager` (via client)
**Function**: `createConsent()`

**Note**: Bank cannot directly request consent. The client must create it.

**Workflow:**

1. **Bank requests consent from client:**

   - Bank asks: "Can we access your credit tier and income band?"
   - Bank provides their address: `0xBankAddress...`
   - Bank specifies duration: "30 days"
2. **Client creates consent:**

   ```solidity
   // Client calls from their wallet
   ConsentManager.createConsent(
       requesterDID: 0xBankAddress...,
       userDID: 0x742d35..., // Client's address
       startDate: 1705320000, // Unix timestamp
       endDate: 1707912000    // 30 days later
   )
   ```

**What happens:**

- Consent is created with status `Requested`
- Consent ID is generated: `keccak256(requesterDID + userDID)`
- Only client can create consent for themselves (enforced by `onlyOwner` modifier)
- Event could be emitted (if implemented)

**Result**: Consent created, but status is still `Requested`.

---

#### Step 2.5: Client Grants Consent

**Actor**: Client
**Contract**: `ConsentManager`
**Function**: `changeStatus()`

```solidity
// Client calls from their wallet
bytes32 consentID = keccak256(abi.encodePacked(bankAddress, clientAddress));

ConsentManager.changeStatus(
    userDID: 0x742d35...,
    consentID: consentID,
    newStatus: ConsentStatus.Granted
)
```

**What happens:**

- Client changes consent status from `Requested` to `Granted`
- Only client can change their own consent status
- Consent is now active and can be used for data access

**Result**: Bank now has valid consent to access client's data.

---

#### Step 2.6: Bank Accesses Client's Credit Data

**Actor**: Bank
**Contract**: `DataBroker`
**Function**: `getCreditTier()` or `getIncomeBand()`

```solidity
// Bank calls (msg.sender must be bank's address)
DataBroker.getCreditTier(
    ownerDID: 0x742d35... // Client's address
)
// Returns: CreditTier.MidGold

DataBroker.getIncomeBand(
    ownerDID: 0x742d35...
)
// Returns: IncomeBand.upto150k
```

**What happens:**

1. `DataBroker` checks consent:

   ```solidity
   ConsentManager.isConsentGranted(clientAddress, bankAddress)
   // Returns: true (if consent is Granted and valid)
   ```
2. If consent is valid:

   - `DataBroker` calls `IdentityRegistry.getCreditTier()`
   - Returns credit tier to bank
3. If consent is invalid:

   - Function reverts with "No valid consent"
   - Bank cannot access data

**Result**:

- ✅ Bank receives credit tier and income band
- ✅ Bank can make loan decision based on this data
- ❌ Bank never sees raw financial data (only summary)

---

### Phase 3: Data Integrity Verification (Optional)

#### Step 3.1: Bank Verifies Off-Chain Data Integrity

**Actor**: Bank
**Component**: Off-chain data storage + on-chain verification

**What happens:**

- Bank wants to verify client's off-chain data hasn't been tampered with
- Bank gets `dataPointer` from `IdentityRegistry` (hash of off-chain data)
- Bank requests off-chain data from client (or client provides it)
- Bank calculates hash of received data
- Bank compares:
  - On-chain hash (from `dataPointer`)
  - Calculated hash (from received data)
- If they match → data is authentic
- If they don't match → data was tampered with

**Result**: Bank can verify data integrity without seeing raw data.

---

## Contract Interaction Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. register()
       ▼
┌─────────────────────┐
│ IdentityRegistry    │
│ - Stores creditTier │
│ - Stores incomeBand │
│ - Stores dataPointer│
└──────┬──────────────┘
       │
       │ 2. updateProfile() (Validator)
       │ 3. updateDataPointer() (Client)
       │
       ▼
┌─────────────────────┐
│   Validator         │
│   (Off-chain)       │
│ - Validates docs    │
│ - Calculates scores │
└─────────────────────┘

┌─────────────┐
│    Bank     │
└──────┬──────┘
       │
       │ 4. verifyAddressOwnership()
       │    (to verify client owns address)
       ▼
┌─────────────────────┐
│ IdentityRegistry    │
└─────────────────────┘

       │
       │ 5. Client creates consent
       ▼
┌─────────────────────┐
│  ConsentManager     │
│ - Stores consent    │
│ - Manages status    │
└──────┬──────────────┘
       │
       │ 6. Client grants consent
       │
       │ 7. Bank requests data
       ▼
┌─────────────────────┐
│   DataBroker        │
│ - Verifies consent  │
│ - Returns data      │
└──────┬──────────────┘
       │
       │ 8. Calls IdentityRegistry
       ▼
┌─────────────────────┐
│ IdentityRegistry    │
│ - Returns creditTier│
│ - Returns incomeBand│
└─────────────────────┘
```

## Off-Chain Components (To Be Implemented)

### 1. Financial Data Storage (`off-chain/data_storage/`)

**Purpose**: Store detailed financial data off-chain

**What it should do:**

- Store assets and liabilities as encrypted JSON files
- Calculate hash of data for on-chain `dataPointer`
- Provide functions to add/remove assets and liabilities
- Support encryption for additional security
- Verify data integrity using hash comparison

**Key Functions:**

- `save(financial_data)` → Returns hash
- `load(user_did)` → Returns FinancialData object
- `verify_hash(user_did, expected_hash)` → Verifies integrity
- `add_asset()`, `remove_asset()`, `add_liability()`, `remove_liability()`

---

### 2. Document Validator Service (`off-chain/validator/`)

**Purpose**: Validate documents and calculate credit scores

**What it should do:**

- Receive encrypted payslips/documents from clients
- Decrypt and validate document authenticity
- Extract financial information:
  - Income from payslips
  - Assets from bank statements
  - Liabilities from loan statements
- Calculate credit tier based on:
  - Net worth
  - Debt-to-income ratio
  - Payment history
  - Other risk factors
- Calculate income band from income data
- Call `IdentityRegistry.updateProfile()` on-chain with calculated values

**Key Functions:**

- `validate_documents(encrypted_docs)` → Validates and extracts data
- `calculate_credit_tier(financial_data)` → Returns CreditTier enum value
- `calculate_income_band(income_data)` → Returns IncomeBand enum value
- `update_on_chain_profile(user_address, credit_tier, income_band)` → Updates blockchain

---

### 3. Credit Calculator (`off-chain/credit_calculator/`)

**Purpose**: Calculate credit scores and classifications

**What it should do:**

- Take financial data as input
- Calculate various metrics:
  - Net worth (assets - liabilities)
  - Debt-to-income ratio
  - Credit utilization
  - Payment history score
- Classify into credit tiers:
  - Bronze: Low creditworthiness
  - Silver: Medium creditworthiness
  - Gold: Good creditworthiness
  - Platinum: Excellent creditworthiness
- Classify into income bands based on annual income

**Key Functions:**

- `calculate_net_worth(assets, liabilities)` → Returns net worth
- `classify_credit_tier(financial_metrics)` → Returns CreditTier
- `classify_income_band(annual_income)` → Returns IncomeBand
- `calculate_risk_score(financial_data)` → Returns risk score (0-1000)

---

### 4. Client Application (`off-chain/client/`)

**Purpose**: User-facing application for managing identity

**What it should do:**

- Allow users to register on blockchain
- Upload financial documents (encrypted)
- Submit documents to validator
- View their credit profile
- Manage consents (grant/revoke)
- View access logs
- Update data pointer when financial data changes

**Key Functions:**

- `register_on_chain()` → Calls IdentityRegistry.register()
- `upload_financial_data()` → Uses FinancialDataStorage
- `submit_to_validator()` → Sends encrypted docs to validator
- `grant_consent(requester_address)` → Calls ConsentManager
- `view_access_logs()` → Shows who accessed their data

---

## Security Features

### 1. Address Ownership Verification

- Banks verify clients own their addresses using cryptographic signatures
- Prevents identity theft and address spoofing
- Standard Web3 pattern (EIP-191)

### 2. Consent-Based Access

- Banks can only access data with explicit user consent
- Users can revoke consent at any time
- Consent has expiration dates
- All access attempts are logged

### 3. Data Privacy

- Raw financial data never goes on-chain
- Only summary data (credit tier, income band) is public
- Detailed data stored encrypted off-chain
- Hash verification ensures data integrity

### 4. Validator Trust

- Only trusted validator can update credit scores
- Prevents users from faking their creditworthiness
- Validator address is immutable (set at deployment)

## Example Scenario: Loan Application

### Day 1: Client Setup

1. Client registers: `IdentityRegistry.register()`
2. Client prepares financial data (off-chain)
3. Client submits documents to validator (off-chain)
4. Validator calculates: CreditTier = MidGold, IncomeBand = upto150k
5. Validator updates: `IdentityRegistry.updateProfile(MidGold, upto150k)`
6. Client updates: `IdentityRegistry.updateDataPointer(hash)`

### Day 2: Bank Visit

1. Client provides address: `0x742d35...`
2. Bank verifies ownership: `verifyAddressOwnership()` → ✅ true
3. Bank checks registration: `identities(0x742d35...)` → ✅ registered
4. Bank sees: CreditTier = MidGold, IncomeBand = upto150k
5. Bank requests consent (asks client)
6. Client creates consent: `ConsentManager.createConsent(bankAddress, ...)`
7. Client grants consent: `ConsentManager.changeStatus(..., Granted)`

### Day 3: Loan Decision

1. Bank accesses data: `DataBroker.getCreditTier(0x742d35...)` → MidGold
2. Bank accesses data: `DataBroker.getIncomeBand(0x742d35...)` → upto150k
3. Bank makes loan decision based on credit tier and income band
4. Bank never sees raw financial data (privacy preserved)

## Benefits

1. **Privacy**: Raw financial data stays off-chain
2. **Verifiability**: Credit scores are on-chain and tamper-proof
3. **User Control**: Users control who can access their data
4. **Efficiency**: Banks get instant access to creditworthiness data
5. **Security**: Cryptographic proofs prevent fraud
6. **Transparency**: All consent and access is logged on-chain

## Future Enhancements

- Token rewards for data sharing
- Multiple validators for redundancy
- Reputation system for validators
- Cross-chain compatibility
- Mobile wallet integration
- Automated consent expiration handling
