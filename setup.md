# Zeon Protocol Development Setup

## Quick Setup

1. **Install dependencies**:
   ```bash
   yarn install:all
   ```

2. **Configure backend environment**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start development**:
   ```bash
   # Terminal 1: Start frontend
   yarn dev:frontend
   
   # Backend is deployed to Render at:
   # https://zeon-hybrid.onrender.com
   ```

## Environment Variables

### Backend (.env in backend/)
```bash
WALLET_KEY=your_wallet_private_key_here
ENCRYPTION_KEY=your_encryption_key_here
XMTP_ENV=dev
NETWORK_ID=base-sepolia
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### Frontend
No environment variables needed - connects to deployed backend.

## Architecture

- **Frontend**: http://localhost:3000
- **Backend**: https://zeon-hybrid.onrender.com (deployed)
- **Blockchain**: Base Sepolia testnet

## Development Commands

```bash
# Install all dependencies
yarn install:all

# Frontend development
yarn dev:frontend

# Frontend build
yarn build:frontend

# Backend development (if running locally)
cd backend && yarn dev

# Clean all node_modules
yarn clean
```

## QR Code Issues Fixed

The backend now properly returns QR codes as objects:
```typescript
{
  message: "Scan to contribute...",
  qrCode: "data:image/png;base64,..."
}
```

Frontend parses these correctly and displays QR codes as images.

## Performance Optimizations

- Pre-initialized blockchain components
- Optimized gas pricing (20% increase)
- No deployment timeouts
- Connection pooling
- Memory management 