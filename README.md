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

- 🤖 **AI Agent**: Coinbase AgentKit + LangChain powered conversational AI
- 💬 **XMTP Messaging**: End-to-end encrypted messaging
- 🔗 **Blockchain Integration**: Coinbase Developer Platform (CDP) integration on Base Sepolia
- 📱 **QR Code Generation**: Generate payment QR codes for mobile wallet contributions
- 🎯 **Crowdfunding**: Create and manage fundraising campaigns
- 💸 **Enhanced Crypto Operations**: Built-in wallet management and USDC operations

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

Create a `.env` file in the `backend/zeon-hybrid/` directory:

```bash
# XMTP Keys (generate with yarn gen:keys)
WALLET_KEY=your_private_key_here
ENCRYPTION_KEY=your_encryption_key_here
XMTP_ENV=dev

# Coinbase Developer Platform
CDP_API_KEY_NAME=your_cdp_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_private_key
NETWORK_ID=base-sepolia

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key
```

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + XMTP + Coinbase AgentKit
- **Blockchain**: Base Sepolia testnet via Coinbase Developer Platform
- **AI**: OpenRouter API with AgentKit + LangChain
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
