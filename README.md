# Zeon Fundraising Agent with Coinbase AgentKit

An AI-powered fundraising agent built on XMTP network with Coinbase AgentKit integration for seamless cryptocurrency operations.

## Features

- 🤖 **AI Agent**: GPT-4 powered conversational AI with AgentKit
- 💬 **XMTP Messaging**: End-to-end encrypted messaging
- 🔗 **Blockchain Integration**: Coinbase Developer Platform (CDP) integration
- 📱 **QR Code Generation**: Generate payment QR codes for mobile wallet contributions
- 🎯 **Fundraising**: Create and manage crypto fundraising campaigns
- 💸 **USDC Operations**: Gasless USDC transactions on Base Sepolia

## Prerequisites

- Node.js v20 or higher
- Yarn v4.6.0
- OpenRouter API key
- Coinbase Developer Platform (CDP) API credentials
- Base Sepolia testnet access

## Environment Setup

Create a `.env` file in the `backend/zeon-hybrid/` directory:

```bash
# XMTP Keys (generate with yarn gen:keys)
WALLET_KEY=0x...
ENCRYPTION_KEY=...
XMTP_ENV=dev

# Coinbase Developer Platform
CDP_API_KEY_NAME=your_cdp_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_private_key
NETWORK_ID=base-sepolia

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key
```

## Installation

```bash
# Install dependencies
yarn install

# Generate XMTP keys (if you don't have them)
yarn gen:keys

# Start the agent
yarn dev
```

## Key Changes from Previous Version

### 🔄 Migrated from LangChain-only to AgentKit Integration

**Before:**
- Pure LangChain with custom tools
- Manual blockchain operations with ethers.js
- Custom QR generation logic
- Complex tool management

**After:**
- Coinbase AgentKit + LangChain integration
- Built-in CDP tools for blockchain operations
- Improved error handling and reliability
- Better crypto wallet management

### 🛠️ New Capabilities

1. **Enhanced Wallet Operations**
   - Automatic wallet creation and persistence
   - CDP-managed private keys
   - Multi-user wallet isolation

2. **Improved Blockchain Tools**
   - Native ERC-20 token support
   - Gasless USDC transactions on Base
   - Better transaction error handling

3. **Smart QR Code Generation**
   - Automatic QR generation for wallet addresses
   - Mobile-optimized payment URLs
   - Embedded in agent responses

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│   Express API    │◄──►│  XMTP Network   │
│   (React)       │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Coinbase        │
                       │  AgentKit        │
                       │                  │
                       │  ┌─────────────┐ │
                       │  │   LangChain │ │
                       │  │   Agent     │ │
                       │  └─────────────┘ │
                       │                  │
                       │  ┌─────────────┐ │
                       │  │   CDP       │ │
                       │  │   Tools     │ │
                       │  └─────────────┘ │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Base Sepolia    │
                       │  Network         │
                       └──────────────────┘
```

## Agent Capabilities

The Zeon agent can help users with:

### 🎯 Fundraising Operations
- Create fundraising campaigns
- Generate donation QR codes
- Track campaign progress
- Share fundraising links

### 💰 Crypto Operations
- Check wallet balances
- Send/receive USDC tokens
- Deploy simple smart contracts
- Request testnet funds from faucet

### 📊 Analytics & Tracking
- Campaign performance metrics
- Donation history
- Wallet transaction history

## API Endpoints

### POST `/api/chat`
Process chat messages and return agent responses.

**Request:**
```json
{
  "message": "Help me create a fundraiser for $100 USDC",
  "sessionId": "user123"
}
```

**Response:**
```json
{
  "response": "I'll help you create a fundraiser...",
  "metadata": {
    "processingTime": 1250,
    "sessionId": "user123",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### GET `/health`
Check service health status.

## Development

```bash
# Start with hot-reloading
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `WALLET_KEY` | XMTP wallet private key | ✅ |
| `ENCRYPTION_KEY` | XMTP database encryption key | ✅ |
| `XMTP_ENV` | XMTP environment (dev/production) | ✅ |
| `CDP_API_KEY_NAME` | Coinbase Developer Platform API key name | ✅ |
| `CDP_API_KEY_PRIVATE_KEY` | CDP private key | ✅ |
| `NETWORK_ID` | Blockchain network (base-sepolia) | ✅ |
| `OPENROUTER_API_KEY` | OpenRouter API key | ✅ |

## Troubleshooting

### Common Issues

1. **AgentKit Tools Not Working**
   - Ensure CDP API credentials are correct
   - Check network connectivity to Base Sepolia
   - Verify wallet has sufficient gas (ETH)

2. **QR Code Generation Fails**
   - Check if wallet address is valid
   - Ensure QRCode dependency is installed

3. **XMTP Connection Issues**
   - Verify WALLET_KEY and ENCRYPTION_KEY
   - Check XMTP_ENV setting
   - Ensure .data/xmtp directory permissions

### Debug Mode

Enable debug logging:
```bash
DEBUG=true yarn dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE.md for details 