import QRCode from 'qrcode';
import { ethers } from "ethers";

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

// Core QR Code Generation Function - PNG FORMAT FOR WALLET COMPATIBILITY
export const generateQRCode = async (
  data: string, 
  description: string = "QR Code"
): Promise<string> => {
  try {
    console.log(`🔧 Generating QR code for data: ${data.substring(0, 50)}...`);
    
    // Generate QR code as PNG for maximum wallet compatibility
    const qrPngBuffer = await QRCode.toBuffer(data, {
      type: 'png',
      width: 256, // Standard size for frontend compatibility
      margin: 2,  // Standard margin
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M' // Medium error correction for better reliability
    });
    
    console.log(`📊 QR code buffer size: ${qrPngBuffer.length} bytes`);
    
    // Convert PNG buffer to base64
    const base64Data = qrPngBuffer.toString('base64');
    
    console.log(`📝 Base64 length: ${base64Data.length} characters`);
    
    // Return the raw base64 data
    return base64Data;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error(`QR Code Generation Failed for ${description}`);
  }
};

// Wallet Contribution QR Code - NOW RETURNS A STRUCTURED OBJECT
export const generateContributionQR = async (
  walletAddress: string, 
  amount: string, 
  fundraiserName: string
): Promise<{ message: string; qrCode: string }> => {
  try {
    const amountInWei = ethers.parseEther(amount).toString();
    const paymentData = `ethereum:${walletAddress}?value=${amountInWei}`;
    const description = `Contribution QR for ${fundraiserName}`;
    
    const qrCodeBase64 = await generateQRCode(paymentData, description);
    const contractLink = generateBaseScanLink(walletAddress, 'address');
    const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    
    const response = {
      message: `📱 Scan to Contribute ${amount} ETH

🎯 **${fundraiserName}**
💰 Amount: ${amount} ETH
📍 Contract: [${shortAddress}](${contractLink})

Scan with your mobile wallet and confirm the transaction to support this fundraiser!`,
      qrCode: `data:image/png;base64,${qrCodeBase64}`
    };

    return response; // ✅ Return object directly
  } catch (error: any) {
    console.error('Error generating contribution QR:', error);
    throw new Error(`QR Code Generation Failed: ${error.message}`);
  }
};

// Contract Interaction QR Code
export const generateContractQR = async (
  contractAddress: string,
  functionData: string,
  value?: string
): Promise<{ message: string; qrCode: string }> => {
  let ethData = `ethereum:${contractAddress}`;
  
  const params = [];
  if (functionData) params.push(`data=${functionData}`);
  if (value) params.push(`value=${value}`);
  
  if (params.length > 0) {
    ethData += `?${params.join('&')}`;
  }
  
  const qrCodeBase64 = await generateQRCode(ethData, "Contract Interaction QR Code");
  
  const response = {
    message: `Scan this QR code to interact with the contract:\n\nContract Address: \`${contractAddress}\``,
    qrCode: `data:image/png;base64,${qrCodeBase64}`
  };

  return response; // ✅ Return object directly
};

// Transaction Response Formatting - STYLED
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
    return `❌ Invalid Transaction Hash
The transaction hash '${txHash}' appears to be invalid.`;
  }

  const scanLink = generateBaseScanLink(txHash, 'tx');
  
  let response = `✅ *${action} Successful!*

🔗 *Transaction Hash:* ${txHash}
   View on Base Sepolia Scan: ${scanLink}`;

  if (details) {
    response += `\n\n📋 *Transaction Details:*`;
    if (details.blockNumber) response += `\n- Block Number: ${details.blockNumber}`;
    if (details.gasUsed) response += `\n- Gas Used: ${details.gasUsed}`;
    if (details.gasPrice) response += `\n- Gas Price: ${details.gasPrice} gwei`;
    if (details.from) response += `\n- From: ${details.from}`;
    if (details.to) response += `\n- To: ${details.to}`;
    if (details.value) response += `\n- Value: ${details.value} ETH`;
  }

  return response;
};

// NEW: Deployment Response Formatter - CLEAN AND SIMPLIFIED
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

  console.log("🔧 formatDeployResponse called with:");
  console.log("📋 QR Response type:", typeof qrCodeResponse);
  console.log("📋 QR Response data:", qrCodeResponse);

  // Create the main response text
  const mainResponse = `🎉 *${fundraiserName}* is Live!

Your fundraiser has been successfully deployed on Base Sepolia!

📋 *Deployment Progress:* 
✅ Step 1/5: Parameters prepared
✅ Step 2/5: Validation completed  
✅ Step 3/5: Gas optimized for speed
✅ Step 4/5: Transaction submitted
✅ Step 5/5: Blockchain confirmation received

📋 *Details:*
• Goal: ${goalAmount} ETH
• Contract: ${shortContract} (view at ${contractUrl})
• Transaction: ${shortTx} (view at ${txUrl})

🚀 *Your fundraiser is now ready to receive contributions!*

*Share these details:*
- Contract Address: ${contractAddress}
- Goal Amount: ${goalAmount} ETH
- Network: Base Sepolia

*Need help?* Ask me to generate additional QR codes for different contribution amounts!`;

  // Handle QR code response - if it's an object with QR data, append it as JSON
  if (typeof qrCodeResponse === 'object' && qrCodeResponse.qrCode && qrCodeResponse.message) {
    console.log("✅ QR object detected, appending JSON data");
    console.log("📱 QR Code length:", qrCodeResponse.qrCode.length);
    console.log("📝 QR Message preview:", qrCodeResponse.message.substring(0, 100));
    
    // Append the QR data as JSON string at the end
    const jsonData = JSON.stringify(qrCodeResponse);
    const finalResponse = mainResponse + "\n\n" + jsonData;
    
    console.log("🎯 Final response includes QR JSON data:", finalResponse.includes('"qrCode"'));
    return finalResponse;
  } else if (typeof qrCodeResponse === 'string') {
    console.log("📝 QR response is string, checking if it's JSON...");
    try {
      // Try to parse existing JSON string and pass it through
      const qrData = JSON.parse(qrCodeResponse);
      if (qrData.qrCode && qrData.message) {
        console.log("✅ Valid QR JSON string detected, passing through");
        return mainResponse + "\n\n" + qrCodeResponse; // Pass through the JSON string
      } else {
        console.log("⚠️ String is JSON but missing QR fields, treating as error message");
        // It's an error message, append it normally
        return mainResponse + "\n\n" + qrCodeResponse;
      }
    } catch {
      console.log("⚠️ String is not JSON, treating as error message");
      // Not JSON, treat as error message
      return mainResponse + "\n\n" + qrCodeResponse;
    }
  } else {
    console.log("❌ No valid QR code data provided");
    // No QR code data
    return mainResponse;
  }
};