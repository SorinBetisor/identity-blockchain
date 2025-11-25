# Deployment Guide

This guide explains how to deploy the Identity Blockchain smart contracts to local and test networks.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Compile contracts:**
   ```bash
   npx hardhat compile
   ```

## Deployment Options

### Option 1: Local Deployment (Recommended for Testing)

Deploy to a local Hardhat network for testing and development. This is the **primary method** for testing and interaction.

#### Deploy to Local L1 Network:
```bash
npx hardhat ignition deploy ignition/modules/IdentitySystem.ts --network hardhatMainnet
```

#### Deploy to Local OP Network:
```bash
npx hardhat ignition deploy ignition/modules/IdentitySystem.ts --network hardhatOp
```

**Note:** Local deployments don't require any private keys or RPC URLs. They use simulated networks.

### Option 2: Sepolia Testnet Deployment (Optional)

Deploy to Sepolia testnet if you want to demonstrate the system on a public test network.

#### Step 1: Get Sepolia ETH
You'll need Sepolia ETH to pay for gas. Get it from a faucet:
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia

#### Step 2: Set Up Configuration Variables

You need to set two configuration variables:
- `SEPOLIA_RPC_URL`: Your Sepolia RPC endpoint (e.g., from Infura, Alchemy, or QuickNode)
- `SEPOLIA_PRIVATE_KEY`: Private key of an account with Sepolia ETH

**Option A: Using Hardhat Keystore (Recommended)**
```bash
# Set RPC URL
npx hardhat keystore set SEPOLIA_RPC_URL

# Set private key (will prompt securely)
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

**Option B: Using Environment Variables**
```bash
# Windows PowerShell
$env:SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
$env:SEPOLIA_PRIVATE_KEY="0xYOUR_PRIVATE_KEY"

# Linux/Mac
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
export SEPOLIA_PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
```

#### Step 3: Deploy to Sepolia
```bash
npx hardhat ignition deploy ignition/modules/IdentitySystem.ts --network sepolia
```

## Deployment Parameters

The deployment module accepts optional parameters:

- `tokenName`: Name of the DataSharingToken (default: "Data Sharing Token")
- `tokenSymbol`: Symbol of the DataSharingToken (default: "DST")
- `rewardPerAccess`: Reward amount per data access in wei (default: "1000000000000000000" = 1 token)

**Example with custom parameters:**
```bash
npx hardhat ignition deploy ignition/modules/IdentitySystem.ts \
  --parameters '{"IdentitySystem":{"tokenName":"My Token","tokenSymbol":"MTK","rewardPerAccess":"500000000000000000"}}' \
  --network hardhatMainnet
```

## Deployment Output

After deployment, you'll see output like:
```
Deploying [ IdentitySystem ] module
Deploying IdentityRegistry...
IdentityRegistry deployed at: 0x...
Deploying ConsentManager...
ConsentManager deployed at: 0x...
Deploying DataSharingToken...
DataSharingToken deployed at: 0x...
Deploying DataBroker...
DataBroker deployed at: 0x...
Configuring DataBroker as minter...
✅ [ IdentitySystem ] module deployed
```

## Deployment Artifacts

Deployment information is stored in:
- `ignition/deployments/chain-<chainId>/deployed_addresses.json` - Contract addresses
- `ignition/deployments/chain-<chainId>/artifacts/` - Deployment artifacts

## Verifying Deployment

After deployment, you can verify the contracts are deployed correctly:

1. **Check contract addresses** in the deployment output or artifacts
2. **Interact with contracts** using Hardhat console:
   ```bash
   npx hardhat console --network hardhatMainnet
   ```
3. **Run tests** to verify functionality:
   ```bash
   npx hardhat test
   ```

## Contract Deployment Order

The contracts are deployed in this order:

1. **IdentityRegistry** - Manages user identity registration
2. **ConsentManager** - Manages consent agreements
3. **DataSharingToken** - ERC20 reward token
4. **DataBroker** - Gateway contract (depends on all above)
5. **Configuration** - DataBroker is granted minter role on the token

## Troubleshooting

### "Insufficient funds" error
- For local networks: This shouldn't happen as accounts are pre-funded
- For Sepolia: Ensure your account has enough Sepolia ETH

### "Invalid RPC URL" error
- Verify your `SEPOLIA_RPC_URL` is correct and accessible
- Check if your RPC provider requires authentication

### "Invalid private key" error
- Ensure your private key starts with `0x`
- Verify the account has sufficient funds

### Contract verification fails
- Ensure all contracts compiled successfully: `npx hardhat compile`
- Check that contract files are in the `contracts/` directory

## Next Steps

After deployment:
1. Save the deployed contract addresses
2. Update your frontend/backend to use the new addresses
3. Test the deployed contracts using the test suite
4. Document the deployment addresses for your team


