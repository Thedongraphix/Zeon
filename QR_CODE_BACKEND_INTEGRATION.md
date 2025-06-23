# QR Code Backend Integration Guide

## Overview
This document explains exactly how the Zeon Hybrid backend generates QR codes and how your frontend should handle them. The backend now returns structured JSON responses containing both message text and base64-encoded QR code images.

## ✅ FIXED: Backend Architecture

### Dependencies
```json
{
  "qrcode": "^1.5.3",
  "@types/qrcode": "^1.5.5",
  "ethers": "^6.12.0"
}
```

### Core QR Generation Function
**Location:** `utils/blockchain.ts`

```typescript
export const generateQRCode = async (
  data: string, 
  description: string = "QR Code"
): Promise<string> => {
  // Generates PNG buffer and returns base64 string
  const qrPngBuffer = await QRCode.toBuffer(data, {
    type: 'png',
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'M'
  });
  
  return qrPngBuffer.toString('base64');
};
```

### ✅ UPDATED: Contribution QR Function
**Location:** `utils/blockchain.ts`

```typescript
// ✅ NOW RETURNS OBJECT (not JSON string)
export const generateContributionQR = async (
  walletAddress: string, 
  amount: string, 
  fundraiserName: string
): Promise<{ message: string; qrCode: string }> => {
  try {
    const amountInWei = ethers.parseEther(amount).toString();
    const paymentData = `ethereum:${walletAddress}?value=${amountInWei}`;
    const qrCodeBase64 = await generateQRCode(paymentData, description);
    
    const response = {
      message: `📱 Scan to Contribute ${amount} ETH...`,
      qrCode: `data:image/png;base64,${qrCodeBase64}`
    };

    return response; // ✅ Return object directly
  } catch (error: any) {
    throw new Error(`QR Code Generation Failed: ${error.message}`);
  }
};
```

## ✅ UPDATED: API Response Format

### 1. QR Code Tool (`/api/chat`)
When user requests a QR code, the API returns:

```json
{
  "response": "{\"message\":\"📱 Scan to Contribute 0.01 ETH...\",\"qrCode\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQ...\"}"
}
```

### 2. Fundraiser Deployment
When deploying a fundraiser, the QR code is embedded in the response:

```json
{
  "response": "🎉 **My Fundraiser** is Live!...{\"message\":\"📱 Scan to Contribute 0.01 ETH...\",\"qrCode\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQ...\"}"
}
```

## Frontend Integration Guide

### 1. Parse the Response
```javascript
// When you receive the API response
const apiResponse = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage, sessionId: 'user123' })
});

const data = await apiResponse.json();
const responseText = data.response;
```

### 2. Extract QR Code Data
```javascript
function extractQRFromResponse(responseText) {
  try {
    // Look for JSON pattern in the response
    const jsonMatch = responseText.match(/\{[^{}]*"qrCode"[^{}]*\}/);
    
    if (jsonMatch) {
      const qrData = JSON.parse(jsonMatch[0]);
      
      if (qrData.qrCode && qrData.message) {
        console.log('✅ Successfully parsed JSON:', qrData);
        console.log('🎯 Found QR response format');
        return qrData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to parse QR data:', error);
    return null;
  }
}
```

### 3. Display QR Code
```javascript
function displayMessage(responseText) {
  const qrData = extractQRFromResponse(responseText);
  
  if (qrData) {
    // Clean the response text (remove the JSON part)
    const cleanText = responseText.replace(/\{[^{}]*"qrCode"[^{}]*\}/, '').trim();
    
    // Display the text message
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = cleanText;
    chatContainer.appendChild(messageDiv);
    
    // Display the QR code
    const qrDiv = document.createElement('div');
    qrDiv.innerHTML = `
      <div class="qr-container">
        <p>${qrData.message}</p>
        <img src="${qrData.qrCode}" alt="QR Code" style="max-width: 256px; height: auto;" />
        <p><small>Scan with your mobile wallet to contribute</small></p>
      </div>
    `;
    chatContainer.appendChild(qrDiv);
    
    console.log('QR Code loaded successfully');
  } else {
    // No QR code, display text normally
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = responseText;
    chatContainer.appendChild(messageDiv);
  }
}
```

## Testing the Integration

### 1. Test QR Code Generation
Send these messages to your API:
```
"Generate a QR code for contributing 0.01 ETH to contract 0x1234567890123456789012345678901234567890"
```

### 2. Test Fundraiser Deployment
```
"Create a fundraiser worth 0.1 ETH for charity at address 0x1234567890123456789012345678901234567890 for 30 days"
```

### 3. Expected Console Output
```
✅ Successfully parsed JSON: { message: "📱 Scan to Contribute 0.01 ETH...", qrCode: "data:image/png;base64,..." }
🎯 Found QR response format
QR Code loaded successfully
```

## Summary

✅ **Fixed Issues:**
1. Backend now returns structured QR objects instead of JSON strings
2. Frontend can properly parse and display QR codes
3. Both standalone QR generation and fundraiser deployment work correctly
4. CORS configuration allows frontend access

✅ **Key Changes:**
- `generateContributionQR()` returns object directly
- `formatDeployResponse()` handles both object and string inputs
- API tools convert objects to JSON strings for frontend parsing
- Frontend can extract and display QR codes properly 