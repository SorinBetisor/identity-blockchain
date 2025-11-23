# Data Models

This directory contains TypeScript type definitions for all data structures used in the Proof-of-Creditworthiness system.

## Files

- **UserProfile.ts** - On-chain user identity and creditworthiness data
- **Consent.ts** - Consent agreements between users and requesters
- **AccessLog.ts** - Immutable audit log entries
- **FinancialData.ts** - Off-chain financial data (assets and liabilities)
- **index.ts** - Central export file

## Usage

```typescript
import { UserProfile, CreditTier, IncomeBand } from "./models";
import { Consent, ConsentStatus, DataType } from "./models";
import { AccessLog, EventType } from "./models";
import { FinancialData, Asset, Liability } from "./models";

// Example: Creating a user profile
const profile: UserProfile = {
  userDID: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  hashedEmail: "0x...",
  hashedNationalID: "0x...",
  creditTier: "Gold",
  riskScore: 750,
  incomeBand: "100k-150k",
  netWorth: BigInt("1000000000000000000"), // 1 ETH in wei
  dataPointer: "0x...",
  isActive: true,
  registrationDate: BigInt(Date.now()),
};
```

## Type Safety

These TypeScript types provide:
- Compile-time type checking
- IntelliSense/autocomplete support
- Documentation through JSDoc comments
- Type inference for better developer experience

## Validation

For runtime validation, consider using libraries like:
- `zod` - Schema validation
- `joi` - Object schema validation
- `yup` - Schema builder for value parsing and validation

Example with zod:
```typescript
import { z } from "zod";

const CreditTierSchema = z.enum(["Gold", "Silver", "Bronze"]);
const UserProfileSchema = z.object({
  userDID: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  creditTier: CreditTierSchema,
  riskScore: z.number().min(0).max(1000),
  // ... etc
});
```

