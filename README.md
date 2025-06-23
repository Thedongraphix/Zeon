# Zeon Protocol

An AI agent built on XMTP network with blockchain integration for creating and managing crowdfunding campaigns on Base Sepolia.

## Project Structure

```
zeon-protocol/
├── frontend/          # React frontend UI
├── backend/           # Node.js backend API (deployed to Render)
├── package.json       # Root workspace configuration
└── README.md          # This file
```

## Features

- 🤖 **AI Agent**: LangChain-powered conversational AI
- 💬 **XMTP Messaging**: End-to-end encrypted messaging
- 🔗 **Blockchain Integration**: Deploy and interact with smart contracts on Base Sepolia
- 📱 **QR Code Generation**: Generate payment QR codes for mobile wallet contributions
- 🎯 **Crowdfunding**: Create and manage fundraising campaigns

## Quick Start

### Prerequisites for this project

- Node.js v20 or higher
- Yarn v4.6.0
- Base Sepolia testnet tokens

### Installation

```bash
# Install all dependencies
yarn install:all

# Start frontend (development)
yarn dev:frontend

# Backend is deployed to Render
# Frontend connects to: https://zeon-hybrid.onrender.com
```

### Environment Setup

Create a `.env` file in the `backend/` directory:

```bash
WALLET_KEY=your_private_key_here
ENCRYPTION_KEY=your_encryption_key_here
XMTP_ENV=dev
NETWORK_ID=base-sepolia
OPENROUTER_API_KEY=your_openrouter_api_key
```

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + XMTP + Ethers.js
- **Blockchain**: Base Sepolia testnet
- **AI**: OpenRouter API with LangChain
- **Messaging**: XMTP protocol

## Usage

1. Connect your wallet via Privy
2. Start chatting with the AI agent
3. Request to create a crowdfunding campaign
4. Agent deploys smart contract and generates QR codes
5. Share QR codes for mobile wallet contributions

## Development

```bash
# Frontend development
yarn dev:frontend

# Backend development (local)
cd backend && yarn dev

# Build for production
yarn build:frontend
yarn build:backend
```

## License

MIT
