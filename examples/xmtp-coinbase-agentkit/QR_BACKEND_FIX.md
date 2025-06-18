# Backend QR Code Fix

## Problem
Your `generateContributionQR` function returns `JSON.stringify()` but frontend expects a JSON object.

## Fix - Update Backend Code

### 1. Change generateContributionQR function:
```javascript
// BEFORE (causing the error):
export const generateContributionQR = async (
  walletAddress: string, 
  amount: string, 
  fundraiserName: string
): Promise<string> => {
  // ... your existing code ...
  
  const response = {
    message: `📱 Scan to Contribute ${amount} ETH...`,
    qrCode: `data:image/png;base64,${qrCodeBase64}`
  };

  return JSON.stringify(response, null, 2); // ❌ PROBLEM: Returns string
};

// AFTER (fixed):
export const generateContributionQR = async (
  walletAddress: string, 
  amount: string, 
  fundraiserName: string
): Promise<{ message: string; qrCode: string }> => { // ✅ Return object type
  // ... your existing code stays the same ...
  
  const response = {
    message: `📱 Scan to Contribute ${amount} ETH...`,
    qrCode: `data:image/png;base64,${qrCodeBase64}`
  };

  return response; // ✅ Return object directly
};
```

### 2. Update formatDeployResponse function:
```javascript
export const formatDeployResponse = (
  contractAddress: string,
  txHash: string,
  fundraiserName: string,
  goalAmount: string,
  qrCodeResponse: { message: string; qrCode: string } | string // Updated type
): string => {
  const contractUrl = generateBaseScanLink(contractAddress, 'address');
  const txUrl = generateBaseScanLink(txHash, 'tx');
  const shortContract = `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;
  const shortTx = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

  // Handle both object and string responses
  let qrSection: string;
  if (typeof qrCodeResponse === 'object' && qrCodeResponse.qrCode) {
    // It's the QR object - return as JSON string for frontend to parse
    qrSection = JSON.stringify(qrCodeResponse);
  } else if (typeof qrCodeResponse === 'string') {
    try {
      // Try to parse existing JSON string
      const qrData = JSON.parse(qrCodeResponse);
      if (qrData.qrCode && qrData.message) {
        qrSection = qrCodeResponse; // Already JSON string
      } else {
        qrSection = qrCodeResponse; // Error message
      }
    } catch {
      qrSection = qrCodeResponse; // Error message
    }
  } else {
    qrSection = "QR code generation failed";
  }

  return `🎉 **${fundraiserName}** is Live!

Your fundraiser has been successfully deployed on Base Sepolia!

📋 **Details:**
• Goal: ${goalAmount} ETH
• Contract: [${shortContract}](${contractUrl})
• Transaction: [${shortTx}](${txUrl})

${qrSection}

**🚀 Your fundraiser is now ready to receive contributions!**`;
};
```

### 3. In your main API endpoint:
```javascript
// When calling generateContributionQR
const qrResult = await generateContributionQR(contractAddress, "0.01", fundraiserName);

// If you need it as JSON string for response
const finalResponse = formatDeployResponse(
  contractAddress,
  txHash,
  fundraiserName,
  goalAmount,
  JSON.stringify(qrResult) // Convert to string for formatDeployResponse
);

// Return to frontend
res.json({ response: finalResponse });
```

## Expected Flow:
1. Backend generates QR object: `{ message: "...", qrCode: "data:image/png;base64,..." }`
2. Backend embeds it in response as JSON string
3. Frontend parses the JSON string to get the object
4. Frontend displays QR code properly

## Test:
After this fix, your console should show:
- ✅ Successfully parsed JSON: { message: "...", qrCode: "data:image/png;base64,..." }
- 🎯 Found QR response format
- QR Code loaded successfully 