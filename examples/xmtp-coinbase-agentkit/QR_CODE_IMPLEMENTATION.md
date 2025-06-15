# QR Code Generation and Display Documentation

## Overview
This documentation describes how QR codes are generated on the backend and displayed on the frontend in the Zeon Protocol chat interface, including Base Sepolia blockchain integration.

## Table of Contents
1. [Backend QR Code Generation](#backend-qr-code-generation)
2. [Frontend QR Code Detection and Display](#frontend-qr-code-detection-and-display)
3. [Base Sepolia Integration](#base-sepolia-integration)
4. [Transaction Link Implementation](#transaction-link-implementation)
5. [Mobile Optimization](#mobile-optimization)
6. [Testing Guidelines](#testing-guidelines)
7. [Complete Implementation Examples](#complete-implementation-examples)

## Backend QR Code Generation

### Required Dependencies
```bash
npm install qrcode
npm install @types/qrcode  # for TypeScript projects
```

### QR Code Format
QR codes should be generated and returned in the following markdown format:

```markdown
![QR Code Description](data:image/svg+xml;base64,BASE64_ENCODED_SVG_DATA)
```

### Core QR Code Generation Function

```typescript
import QRCode from 'qrcode';

export const generateQRCode = async (
  data: string, 
  description: string = "QR Code"
): Promise<string> => {
  try {
    // Generate QR code as SVG for crisp display
    const qrSvg = await QRCode.toString(data, {
      type: 'svg',
      width: 256,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    // Convert SVG to base64
    const base64Data = Buffer.from(qrSvg).toString('base64');
    
    // Return in markdown format for frontend detection
    return `![${description}](data:image/svg+xml;base64,${base64Data})`;
  } catch (error) {
    console.error('QR code generation failed:', error);
    return `[QR Code Generation Failed: ${description}]`;
  }
};
```

### Wallet Contribution QR Code

```typescript
export const generateContributionQR = async (
  walletAddress: string, 
  amount: string, 
  fundraiserName: string
): Promise<string> => {
  // EIP-681 format for wallet compatibility
  const paymentData = `ethereum:${walletAddress}?value=${amount}`;
  const description = `Contribution QR Code`;
  
  const qrCode = await generateQRCode(paymentData, description);
  
  return `Here is the QR code for contributing ${amount} ETH to the fundraiser for "${fundraiserName}":

${qrCode}

You can scan this with your mobile wallet to contribute.`;
};
```

### Contract Interaction QR Code

```typescript
export const generateContractQR = async (
  contractAddress: string,
  functionData: string,
  value?: string
): Promise<string> => {
  let ethData = `ethereum:${contractAddress}`;
  
  const params = [];
  if (functionData) params.push(`data=${functionData}`);
  if (value) params.push(`value=${value}`);
  
  if (params.length > 0) {
    ethData += `?${params.join('&')}`;
  }
  
  const qrCode = await generateQRCode(ethData, "Contract Interaction QR Code");
  
  return `Scan this QR code to interact with the contract:

${qrCode}

Contract Address: \`${contractAddress}\``;
};
```

## Base Sepolia Integration

### Base Sepolia Scan Links

```typescript
// Helper function to generate Base Sepolia scan links
export const generateBaseScanLink = (
  hash: string, 
  type: 'tx' | 'address' | 'token' = 'tx'
): string => {
  const baseUrl = 'https://sepolia.basescan.org';
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${hash}`;
    case 'address':
      return `${baseUrl}/address/${hash}`;
    case 'token':
      return `${baseUrl}/token/${hash}`;
    default:
      return `${baseUrl}/search?q=${hash}`;
  }
};

// Validate transaction hash format
export const isValidTxHash = (hash: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

// Validate Ethereum address format
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};
```

### Transaction Response Formatting

```typescript
export const formatTransactionResponse = (
  txHash: string,
  action: string,
  details?: {
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    from?: string;
    to?: string;
    value?: string;
  }
): string => {
  if (!isValidTxHash(txHash)) {
    throw new Error('Invalid transaction hash format');
  }

  const scanLink = generateBaseScanLink(txHash, 'tx');
  const shortHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
  
  let response = `✅ ${action} completed successfully!

**Transaction Hash:** \`${txHash}\`

🔍 **View on Base Sepolia Scan:** [${shortHash}](${scanLink})`;

  if (details) {
    response += `\n\n**Transaction Details:**`;
    if (details.blockNumber) response += `\n- **Block Number:** ${details.blockNumber}`;
    if (details.gasUsed) response += `\n- **Gas Used:** ${details.gasUsed}`;
    if (details.gasPrice) response += `\n- **Gas Price:** ${details.gasPrice} gwei`;
    if (details.from) response += `\n- **From:** \`${details.from}\``;
    if (details.to) response += `\n- **To:** \`${details.to}\``;
    if (details.value) response += `\n- **Value:** ${details.value} ETH`;
  }

  return response;
};
```

### Complete Transaction Flow

```typescript
// Example: Deploy contract with QR code and transaction link
export const deployContractWithQR = async (
  contractName: string,
  constructorArgs: any[],
  deployer: string
): Promise<string> => {
  try {
    // 1. Deploy the contract
    const deployTx = await deployContract(contractName, constructorArgs);
    await deployTx.wait();
    
    const contractAddress = deployTx.contractAddress;
    const txHash = deployTx.hash;
    
    // 2. Generate QR code for contract interaction
    const qrCode = await generateContractQR(contractAddress, '');
    
    // 3. Format response with transaction link and QR code
    const response = formatTransactionResponse(
      txHash,
      `${contractName} contract deployment`,
      {
        to: contractAddress,
        from: deployer,
        gasUsed: deployTx.gasUsed?.toString()
      }
    );
    
    return `${response}

**Contract Address:** \`${contractAddress}\`

${qrCode}

The contract is now live on Base Sepolia! You can interact with it using the QR code above or by visiting the contract address on Base Scan.`;

  } catch (error) {
    return `❌ Contract deployment failed: ${error.message}`;
  }
};
```

## Frontend QR Code Detection and Display

### Detection Pattern
The frontend uses this regex to detect QR codes in message content:

```typescript
const qrCodeRegex = /!\[.*?\]\(data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)\)/g;
```

### Transaction Hash Detection
```typescript
const txHashRegex = /(0x[a-fA-F0-9]{64})/g;
```

### Wallet Address Detection
```typescript
const ethAddressRegex = /(0x[a-fA-F0-9]{40})/g;
```

### Core Frontend Implementation

```typescript
// Extract transaction hashes from content
const extractTransactionHash = (content: string): string[] => {
  const txHashRegex = /(0x[a-fA-F0-9]{64})/g;
  const matches = content.match(txHashRegex);
  return matches ? matches : [];
};

// Generate Base Sepolia scan URLs
const getBaseScanUrl = (
  hashOrAddress: string, 
  type: 'tx' | 'address' | 'token' = 'tx'
): string => {
  const baseUrl = 'https://sepolia.basescan.org';
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${hashOrAddress}`;
    case 'address':
      return `${baseUrl}/address/${hashOrAddress}`;
    case 'token':
      return `${baseUrl}/token/${hashOrAddress}`;
    default:
      return `${baseUrl}/search?q=${hashOrAddress}`;
  }
};

// Render transaction links
const renderTransactionLinks = (txHashes: string[]) => {
  return txHashes.map((txHash, index) => {
    const scanUrl = getBaseScanUrl(txHash, 'tx');
    const shortHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
    
    return (
      <div key={`tx-${index}`} className="transaction-link-container">
        <a
          href={scanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="transaction-link"
        >
          <span className="transaction-icon">🔍</span>
          <span className="transaction-text">View on Base Scan: {shortHash}</span>
          <span className="external-link-icon">↗</span>
        </a>
        <button
          onClick={() => copyToClipboard(txHash)}
          className="transaction-copy-button"
          title="Copy transaction hash"
        >
          <ClipboardIcon className="h-4 w-4" />
        </button>
      </div>
    );
  });
};
```

## Transaction Link Implementation

### CSS Styling
```css
/* Transaction Link Styling */
.transaction-link-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.75rem;
  padding: 0.75rem;
  margin: 0.5rem 0;
  transition: all 0.3s ease;
}

.transaction-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #60a5fa;
  text-decoration: none;
  font-weight: 500;
  flex: 1;
  transition: all 0.2s ease;
}

.transaction-link:hover {
  color: white;
  transform: translateX(2px);
}

.transaction-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  word-break: break-all;
}
```

## Mobile Optimization

### Responsive Design Features
- **QR Code Sizing:**
  - Desktop: 200x200px
  - Mobile (≤640px): 180x180px  
  - Small Mobile (≤480px): 160x160px

- **Touch-Friendly Buttons:**
  - Minimum 44px touch targets
  - Proper spacing for accessibility
  - Haptic feedback considerations

### Mobile CSS
```css
@media (max-width: 640px) {
  .transaction-link-container {
    padding: 0.5rem;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .transaction-text {
    font-size: 0.75rem;
    text-align: center;
  }
  
  .qr-code-svg svg {
    max-width: 180px;
    max-height: 180px;
  }
}
```

## Testing Guidelines

### QR Code Testing Checklist
- [ ] QR codes render with sharp, scannable quality
- [ ] SVG displays correctly across browsers
- [ ] Mobile wallets can scan QR codes successfully
- [ ] Error handling for corrupted QR data works
- [ ] Base64 decoding functions properly

### Transaction Link Testing
- [ ] Transaction hashes are detected automatically
- [ ] Base Sepolia scan links open correctly
- [ ] Copy functionality works with toast feedback
- [ ] Mobile interface is touch-friendly
- [ ] Links work in new tabs/windows

### Integration Testing
- [ ] QR codes and transaction links work together
- [ ] Multiple QR codes in one message display correctly
- [ ] Mixed content (text + QR + links) renders properly
- [ ] Error states display appropriate messages

## Complete Implementation Examples

### Backend Agent Response Handler

```typescript
import { generateQRCode, formatTransactionResponse, generateBaseScanLink } from './utils';

export const handleUserRequest = async (
  message: string, 
  walletAddress: string
): Promise<{ response: string; error?: boolean }> => {
  try {
    if (message.includes('create fundraiser')) {
      // Handle fundraiser creation
      const fundName = extractFundraiserName(message);
      const goal = extractGoalAmount(message);
      
      // Deploy fundraiser contract
      const deployTx = await deployFundraiser(fundName, goal, walletAddress);
      const contractAddress = deployTx.contractAddress;
      
      // Generate QR code for contributions
      const qrCode = await generateQRCode(
        `ethereum:${contractAddress}?value=0.1`,
        "Fundraiser Contribution QR Code"
      );
      
      // Format response with transaction link
      const txResponse = formatTransactionResponse(
        deployTx.hash,
        "Fundraiser contract deployment",
        {
          to: contractAddress,
          from: walletAddress,
          gasUsed: deployTx.gasUsed?.toString()
        }
      );
      
      return {
        response: `🎉 Fundraiser "${fundName}" created successfully!

${txResponse}

**Contract Address:** \`${contractAddress}\`
**Fundraising Goal:** ${goal} ETH

${qrCode}

Share this QR code for easy contributions to your fundraiser!`
      };
    }
    
    // Handle other requests...
    return { response: "I can help you with crypto operations. Try asking me to create a fundraiser!" };
    
  } catch (error) {
    return { 
      response: `❌ Operation failed: ${error.message}`,
      error: true 
    };
  }
};
```

### Frontend Message Rendering Component

```typescript
const MessageRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderContent = () => {
    // Detect QR codes
    const qrRegex = /!\[.*?\]\(data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)\)/g;
    const qrMatches = Array.from(content.matchAll(qrRegex));
    
    // Detect transaction hashes and addresses
    const txHashes = extractTransactionHash(content);
    const walletAddress = extractWalletAddress(content);
    
    if (qrMatches.length > 0) {
      return renderQRCodeContent(content, qrMatches, txHashes, walletAddress);
    }
    
    if (txHashes.length > 0) {
      return renderTransactionContent(content, txHashes, walletAddress);
    }
    
    if (walletAddress) {
      return renderAddressContent(content, walletAddress);
    }
    
    return <span className="whitespace-pre-wrap">{content}</span>;
  };
  
  return <div className="message-content">{renderContent()}</div>;
};
```

## Best Practices

### Security Considerations
1. **Input Validation:** Always validate transaction hashes and addresses
2. **XSS Prevention:** Sanitize SVG content before rendering
3. **Rate Limiting:** Implement QR code generation rate limits
4. **Error Handling:** Graceful fallbacks for failed operations

### Performance Optimization
1. **Lazy Loading:** Load QR codes only when visible
2. **Caching:** Cache generated QR codes for repeated requests
3. **Compression:** Optimize SVG size for faster loading
4. **Debouncing:** Prevent excessive QR generation requests

### User Experience
1. **Loading States:** Show loading indicators during generation
2. **Success Feedback:** Provide clear success/error messages
3. **Accessibility:** Include alt text and keyboard navigation
4. **Mobile First:** Design for mobile devices primarily

## Troubleshooting

### Common Issues
1. **QR Code Not Scanning:** Check error correction level and size
2. **Base64 Decode Errors:** Validate SVG format before encoding
3. **Transaction Links Not Working:** Verify hash format (64 hex chars)
4. **Mobile Display Issues:** Test responsive breakpoints

### Debug Tips
1. Use browser dev tools to inspect SVG rendering
2. Test QR codes with multiple wallet apps
3. Verify Base Sepolia network connectivity
4. Check console for JavaScript errors

This implementation provides a complete, production-ready solution for QR code generation, display, and Base Sepolia blockchain integration in the Zeon Protocol chat interface. 