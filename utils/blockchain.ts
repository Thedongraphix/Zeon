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

// NEW: Generate fundraiser sharing link
export const generateFundraiserLink = (
  walletAddress: string,
  goalAmount: string,
  fundraiserName: string,
  description?: string,
  currentAmount?: string
): string => {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://zeonai.xyz';
  
  const params = new URLSearchParams({
    goal: goalAmount,
    name: encodeURIComponent(fundraiserName),
  });
  
  if (description) {
    params.append('description', encodeURIComponent(description));
  }
  
  if (currentAmount && currentAmount !== '0') {
    params.append('current', currentAmount);
  }
  
  return `${baseUrl}/fundraiser/${walletAddress}?${params.toString()}`;
};

// NEW: Enhanced fundraiser response formatter with sharing links
export const formatFundraiserResponse = (
  walletAddress: string,
  fundraiserName: string,
  goalAmount: string,
  description?: string,
  currentAmount?: string,
  contributors?: Array<{address: string, amount: string, timestamp: string}>
): string => {
  const contractUrl = generateBaseScanLink(walletAddress, 'address');
  const shortWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  const sharingLink = generateFundraiserLink(walletAddress, goalAmount, fundraiserName, description, currentAmount);
  
  // Calculate progress
  const goalNum = parseFloat(goalAmount);
  const currentNum = parseFloat(currentAmount || '0');
  const progressPercentage = goalNum > 0 ? Math.round((currentNum / goalNum) * 100) : 0;
  const progressBar = generateProgressBar(progressPercentage);
  
  // Direct contribution links for different amounts
  const quickAmounts = ['0.001', '0.005', '0.01', '0.05'];
  const directLinks = quickAmounts.map(amount => {
    const amountInWei = parseFloat(amount) * 1e18;
    const paymentLink = `ethereum:${walletAddress}?value=${amountInWei}`;
    return `• [${amount} ETH](${paymentLink})`;
  }).join('\n');

  const response = `🎉 **${fundraiserName}** - LIVE

${description || 'Help support this important cause!'}

---

📊 **PROGRESS**
${progressBar}
💰 **${currentAmount || '0'} ETH** raised of **${goalAmount} ETH** goal (${progressPercentage}%)

---

🏦 **WALLET ADDRESS**
\`${walletAddress}\`
🔍 [View on Base Sepolia](${contractUrl})

---

🚀 **CONTRIBUTE NOW**

📱 **For Mobile Users (QR Code)**
Ask me: "Generate QR code for [amount] ETH contribution"

💻 **For Desktop Users (Direct Links)**
${directLinks}

🌐 **Share This Fundraiser**
${sharingLink}

---

👥 **CONTRIBUTORS** (${contributors?.length || 0})
${formatContributorsList(contributors || [])}

---

✨ **How to Contribute:**
1. 🔗 Click a direct link above OR scan QR code
2. 📱 Confirm in your wallet (MetaMask, Trust Wallet, etc.)
3. ✅ Your contribution will appear here automatically!

💡 **Need help?** Ask me to generate a custom QR code for any amount!`;

  return response;
};

// Helper function to generate progress bar
const generateProgressBar = (percentage: number): string => {
  const safePercentage = Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
  const filled = Math.round(safePercentage / 10);
  const empty = Math.max(0, 10 - filled); // Ensure empty is not negative
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${safePercentage}%`;
};

// Helper function to format contributors list
const formatContributorsList = (contributors: Array<{address: string, amount: string, timestamp: string}>): string => {
  if (contributors.length === 0) {
    return '🔹 Be the first to contribute!';
  }
  
  return contributors
    .slice(0, 5) // Show only last 5 contributors
    .map((contributor, index) => {
      const shortAddr = `${contributor.address.slice(0, 6)}...${contributor.address.slice(-4)}`;
      const timeAgo = getTimeAgo(contributor.timestamp);
      return `🔹 ${contributor.amount} ETH from ${shortAddr} (${timeAgo})`;
    })
    .join('\n') + 
    (contributors.length > 5 ? `\n🔹 ... and ${contributors.length - 5} more contributors` : '');
};

// Helper function to get human-readable time ago
const getTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

// NEW: Enhanced QR code generation with comprehensive sharing
export const generateEnhancedContributionQR = async (
  walletAddress: string, 
  amount: string, 
  fundraiserName: string,
  description?: string
): Promise<{
  message: string; 
  qrCode: string;
  directLink: string;
  sharingLink: string;
}> => {
  try {
    const amountInWei = ethers.parseEther(amount).toString();
    const paymentData = `ethereum:${walletAddress}?value=${amountInWei}`;
    const description_text = `Contribution QR for ${fundraiserName}`;
    
    const qrCodeBase64 = await generateQRCode(paymentData, description_text);
    const contractLink = generateBaseScanLink(walletAddress, 'address');
    const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    const sharingLink = generateFundraiserLink(walletAddress, amount, fundraiserName, description);
    
    const message = `📱 Scan to contribute ${amount} ETH to "${fundraiserName}"
Wallet: ${shortAddress}
[View on Base Sepolia](${contractLink})

Instructions:
1. Scan QR code with your mobile wallet
2. Confirm the transaction 
3. Your contribution will be recorded!

Can't scan? [Click to Contribute ${amount} ETH](${paymentData})
Share this fundraiser: ${sharingLink}`;

    return {
      message,
      qrCode: `data:image/png;base64,${qrCodeBase64}`,
      directLink: paymentData,
      sharingLink
    };
  } catch (error: any) {
    console.error('Error generating enhanced contribution QR:', error);
    throw new Error(`QR Code Generation Failed: ${error.message}`);
  }
};

// NEW: Get fundraiser status with contributor tracking
export const getFundraiserStatus = async (
  walletAddress: string,
  fundraiserName: string,
  goalAmount: string,
  description?: string
): Promise<{
  currentAmount: string;
  contributors: Array<{address: string, amount: string, timestamp: string}>;
  formattedResponse: string;
}> => {
  // In a real implementation, this would fetch transaction data from the blockchain.
  // For now, we will display the fundraiser with no contributions yet.
  const contributors: Array<{address: string, amount: string, timestamp: string}> = [];
  const currentAmount = '0';
  
  const formattedResponse = formatFundraiserResponse(
    walletAddress,
    fundraiserName,
    goalAmount,
    description,
    currentAmount,
    contributors
  );
  
  return {
    currentAmount,
    contributors,
    formattedResponse
  };
};