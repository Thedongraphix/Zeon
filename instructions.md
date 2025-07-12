# Fundraiser Contract Deployment Setup

## Quick Fix for Current Issues

### 1. **QR Code Generation Issues**
The main problems with your current QR codes:
- ❌ Not using proper EIP-681 format
- ❌ Missing chain ID specification  
- ❌ Inconsistent base64 encoding
- ❌ Tool output not being returned correctly

**Immediate Fixes Applied:**
- ✅ Enhanced QR generation with EIP-681 format
- ✅ Proper Base64 PNG encoding
- ✅ Chain ID specification (84532 for Base Sepolia)
- ✅ Tool returns JSON with QR data properly

### 2. **No Actual Contract Deployment**
Current system just uses wallet addresses, not smart contracts.

**Solutions Provided:**
- ✅ Smart contract option with real deployment
- ✅ Backward compatibility with wallet-based fundraisers
- ✅ Enhanced transparency and tracking

## Implementation Steps

### Step 1: Add the Enhanced Files

1. **Add the contract utilities** (`utils/fundraiser-contract.ts`)
2. **Update your agent configuration** (replace tools in `index.ts`)
3. **Add the Solidity contract** for actual deployment

### Step 2: Quick Test of QR Generation

```bash
# Test the enhanced QR endpoint
curl "http://localhost:10000/api/test-qr"
```

Expected response:
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "message": "💰 Scan to contribute 0.01 ETH...",
  "paymentData": "ethereum:0x7805...@84532?value=10000000000000000"
}
```

### Step 3: Test Enhanced Fundraiser Creation

```bash
# Test wallet-based fundraiser
curl -X POST http://localhost:10000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a fundraiser for 0.1 ETH called Test Fundraiser", "sessionId": "test"}'

# Test contract deployment
curl -X POST http://localhost:10000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Deploy a smart contract fundraiser for 0.5 ETH called Smart Test", "sessionId": "test"}'
```

## Smart Contract Deployment Option

### Option A: Use CDP AgentKit's Contract Deployment

The enhanced tools use CDP's built-in contract deployment:

```typescript
const deployment = await provider.deployContract({
  contractName: "Fundraiser",
  abi: FUNDRAISER_ABI,
  bytecode: FUNDRAISER_BYTECODE,
  constructorArgs: [name, goalAmountWei, ownerAddress],
});
```

### Option B: Compile and Deploy Custom Contract

1. **Install Hardhat**:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

2. **Add the contract** to `contracts/SimpleFundraiser.sol`

3. **Configure Hardhat** for Base Sepolia:
```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

4. **Compile and get bytecode**:
```bash
npx hardhat compile
# Bytecode will be in artifacts/contracts/SimpleFundraiser.sol/SimpleFundraiser.json
```

## Frontend Integration

### Update ChatInterface Component

The QR display should work with the new format:

```typescript
// In ChatInterface.tsx, the renderMessageContent function should handle:
const payload = extractPayloadFromResponse(content);
if (payload && payload.qrCode) {
  // payload.qrCode is already "data:image/png;base64,..."
  return (
    <img 
      src={payload.qrCode}
      alt="Contribution QR Code"
      className="qr-code-png"
    />
  );
}
```

## Testing Your Fixes

### 1. QR Code Format Test

```javascript
// Test EIP-681 format
const paymentData = "ethereum:0x7805B1557019e15BF3E6903d1bE02c2038da14D2@84532?value=10000000000000000";

// This should be scannable by:
// ✅ MetaMask Mobile
// ✅ Coinbase Wallet  
// ✅ Trust Wallet
// ✅ Rainbow Wallet
```

### 2. Agent Response Test

```bash
curl -X POST http://localhost:10000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate a QR code for 0.05 ETH contribution to My Test Fundraiser",
    "sessionId": "test-qr"
  }'
```

Expected response structure:
```json
{
  "response": "{\"response\":\"📱 QR Code generated...\",\"qrCode\":\"data:image/png;base64,...\",\"qrMessage\":\"💰 Scan to contribute...\"}"
}
```

## Why Your Current QR Codes Don't Work

1. **Wrong URI Format**: You're using generic URLs instead of `ethereum:` URIs
2. **Missing Chain ID**: Wallets need `@84532` to know it's Base Sepolia  
3. **No Value Encoding**: Amount needs to be in wei (smallest unit)
4. **Poor Base64 Handling**: Inconsistent encoding/decoding

## The Enhanced Solution Fixes:

✅ **Proper EIP-681 Format**: `ethereum:ADDRESS@CHAINID?value=WEI_AMOUNT`  
✅ **PNG QR Codes**: Maximum wallet compatibility  
✅ **Correct Base64**: Proper `data:image/png;base64,` format  
✅ **Chain Specification**: Base Sepolia (84532) explicitly specified  
✅ **Wei Conversion**: Proper ETH to wei conversion  
✅ **Error Handling**: Graceful fallbacks and clear error messages  

## Immediate Action Items

1. **Replace** your current fundraiser tools with the enhanced versions
2. **Test** QR generation using the `/api/test-qr` endpoint  
3. **Verify** that QR codes scan properly in mobile wallets
4. **Choose** between wallet-based or contract-based fundraisers
5. **Update** your frontend to handle the new response format

The enhanced system gives you:
- 🎯 **Better UX**: QR codes that actually work with mobile wallets
- 🔗 **Real Contracts**: Optional smart contract deployment with transparency  
- 📱 **Mobile Ready**: EIP-681 compliance for all major wallets
- 🚀 **Backward Compatible**: Existing code still works
- 🔧 **Easy Testing**: Built-in test endpoints

Try the test endpoint first to see the difference!