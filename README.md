# Identity Blockchain System

A decentralized identity and consent management system built on Ethereum, enabling users to control their data sharing with transparent consent agreements and rewards.

## Project Overview

This project implements a blockchain-based identity and data consent management system with the following components:

- **IdentityRegistry**: Manages user identity registration and credit/income information
- **ConsentManager**: Handles consent agreements between users and data requesters
- **DataSharingToken**: ERC20 token for rewarding users who share their data
- **DataBroker**: Gateway contract that enforces consent verification before data access

### Features

- User identity registration with credit tier and income band
- Granular consent management with time-based expiration
- Transparent audit logs for all consent and data access events
- Token rewards for data sharing
- Modern React frontend with wallet integration

## Prerequisites

- Node.js 22.10.0 or later (LTS recommended)
- npm or yarn
- A Web3 wallet (MetaMask recommended)

## Quick Start

### Development Environment

The easiest way to start the entire development environment is using the dev script:

```bash
npm run dev
```

This single command will:
1. Start a local Hardhat node on port 8545
2. Compile all smart contracts
3. Deploy contracts to the local network
4. Update frontend configuration with deployed contract addresses
5. Start the frontend development server on port 5173

The script runs all services in the background and will keep them running until you press `Ctrl+C`.

**Note:** Make sure port 8545 and 5173 are available before running the script.

### Manual Setup

If you prefer to run each step manually:

#### 1. Start Hardhat Node

```bash
npx hardhat node
```

This starts a local Ethereum node on `http://127.0.0.1:8545`.

#### 2. Compile Contracts

```bash
npm run compile
```

#### 3. Deploy Contracts

Deploy to local Hardhat node:
```bash
npx hardhat ignition deploy ignition/modules/IdentitySystem.ts --network localhost --deployment-id local-dev
```

Or deploy to simulated networks:
```bash
# Local L1 simulation
npm run deploy:local

# Local OP simulation
npm run deploy:local:op
```

#### 4. Update Frontend Configuration

After deployment, update the frontend with the new contract addresses:

```bash
npx tsx scripts/update_frontend_config.ts
```

#### 5. Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## Project Structure

```
identity-blockchain/
├── contracts/              # Solidity smart contracts
│   ├── IdentityRegistry.sol
│   ├── ConsentManager.sol
│   ├── DataSharingToken.sol
│   └── DataBroker.sol
├── test/                   # Contract tests
├── ignition/               # Hardhat Ignition deployment modules
│   └── modules/
│       └── IdentitySystem.ts
├── scripts/                # Utility scripts
│   ├── dev.ts              # Development environment orchestrator
│   └── update_frontend_config.ts
├── frontend/               # React frontend application
│   └── src/
│       ├── components/     # React components
│       ├── hooks/          # Custom React hooks
│       ├── pages/          # Page components
│       └── contracts.ts    # Contract ABIs and addresses
└── off-chain/              # Python backend services
```

## Available Scripts

### Root Directory

- `npm run dev` - Start complete development environment (node, compile, deploy, frontend)
- `npm run compile` - Compile smart contracts
- `npm run test` - Run all tests
- `npm run deploy:local` - Deploy to local simulated L1 network
- `npm run deploy:local:op` - Deploy to local simulated OP network
- `npm run deploy:sepolia` - Deploy to Sepolia testnet

### Frontend Directory

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Testing

Run all tests:
```bash
npm run test
```

Run only Solidity tests:
```bash
npx hardhat test solidity
```

Run only TypeScript/Node.js tests:
```bash
npx hardhat test nodejs
```

## Deployment

### Local Deployment

For local development and testing, use the simulated networks:

```bash
# L1 simulation
npm run deploy:local

# OP simulation  
npm run deploy:local:op
```

### Sepolia Testnet Deployment

1. Get Sepolia ETH from a faucet
2. Set configuration variables:

```bash
# Using Hardhat keystore (recommended)
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY

# Or using environment variables
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
export SEPOLIA_PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
```

3. Deploy:
```bash
npm run deploy:sepolia
```

## Frontend Features

The frontend provides a complete user interface for:

- **Identity Management**: Register and view your identity information
- **Consent Management**: Grant and revoke data access consents
- **Active Consents**: View all currently active/granted consents with expiration dates
- **Audit Log**: Track all consent and data access events
- **Wallet Integration**: Connect with MetaMask or other Web3 wallets

## Network Configuration

The project supports multiple network configurations:

- `hardhatMainnet`: Simulated L1 network (EDR)
- `hardhatOp`: Simulated OP network (EDR)
- `localhost`: Local Hardhat node (http://127.0.0.1:8545)
- `sepolia`: Sepolia testnet

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Hardhat 3 Beta Getting Started](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3)
- [Viem Documentation](https://viem.sh/)
- [Wagmi Documentation](https://wagmi.sh/)
