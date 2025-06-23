// Removed CDP imports as we're using direct ethers.js integration
import {
  createSigner,
  getEncryptionKeyFromHex,
  logAgentDetails,
  validateEnvironment,
} from "./helpers/client.js";

import {
  AIMessage,
  BaseMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { Client, XmtpEnv } from "@xmtp/node-sdk";
import { ethers } from "ethers";
import contractArtifact from "./dist/CrowdFund.json" with { type: "json" };
import {
  generateBaseScanLink,
  isValidTxHash,
  isValidAddress,
  generateQRCode,
  generateContributionQR,
  formatTransactionResponse,
  formatDeployResponse
} from "./utils/blockchain.js";
import express from 'express';
import cors from 'cors';

const {
  WALLET_KEY,
  ENCRYPTION_KEY,
  XMTP_ENV,
  NETWORK_ID,
  OPENROUTER_API_KEY,
} = validateEnvironment([
  "WALLET_KEY",
  "ENCRYPTION_KEY",
  "XMTP_ENV",
  "NETWORK_ID",
  "OPENROUTER_API_KEY",
]);

// Storage constants
const XMTP_STORAGE_DIR = ".data/xmtp";
const MEMORY_STORAGE_DIR = ".data/memory";

// OPTIMIZATION: Pre-initialized providers and wallet for faster operations
let optimizedProvider: ethers.JsonRpcProvider | null = null;
let optimizedWallet: ethers.Wallet | null = null;
let contractFactory: ethers.ContractFactory | null = null;

// OPTIMIZATION: Enhanced memory store with persistence
interface ChatMemory {
  messages: Array<{ role: "user" | "assistant"; content: string; timestamp: number }>;
  lastActivity: number;
  sessionId: string;
}

const memoryStore: Record<string, MemorySaver> = {};
const chatMemoryStore: Record<string, ChatMemory> = {};
const agentStore: Record<string, any> = {};

// Global, shared components to reduce initialization latency
let llm: ChatOpenAI;
let tools: any[] = [];
let sharedComponentsInitialized = false;

interface AgentConfig {
  configurable: {
    thread_id: string;
  };
}

type Agent = ReturnType<typeof createReactAgent>;

// NEW: Agent will be initialized in the background after the server starts.
// This is to prevent Render health check timeouts.
let agent: Awaited<ReturnType<typeof startAgent>> | null = null;

// OPTIMIZATION: Initialize blockchain components early
async function initializeBlockchainComponents() {
  if (optimizedProvider && optimizedWallet && contractFactory) return;
  
  console.log("🔧 Initializing optimized blockchain components...");
  
  // Use connection pooling and keep-alive for better performance
  optimizedProvider = new ethers.JsonRpcProvider("https://sepolia.base.org", undefined, {
    staticNetwork: true, // Avoid network detection calls
    batchMaxCount: 10,   // Batch multiple calls
    batchMaxSize: 1024 * 1024, // 1MB batch size
    cacheTimeout: 300000 // 5 minute cache
  });
  
  optimizedWallet = new ethers.Wallet(WALLET_KEY!, optimizedProvider);
  
  // Pre-compile contract factory for faster deployments
  contractFactory = new ethers.ContractFactory(
    contractArtifact.abi, 
    contractArtifact.bytecode, 
    optimizedWallet
  );
  
  console.log("✅ Blockchain components optimized and ready");
}

// OPTIMIZATION: Enhanced storage with persistence
function ensureOptimizedStorage() {
  if (!fs.existsSync(XMTP_STORAGE_DIR)) {
    fs.mkdirSync(XMTP_STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(MEMORY_STORAGE_DIR)) {
    fs.mkdirSync(MEMORY_STORAGE_DIR, { recursive: true });
  }
}

// OPTIMIZATION: Persistent memory management
function saveChatMemory(sessionId: string, memory: ChatMemory): void {
  try {
    const memoryFile = path.join(MEMORY_STORAGE_DIR, `${sessionId}.json`);
    fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
  } catch (error) {
    console.error(`Failed to save memory for session ${sessionId}:`, error);
  }
}

function loadChatMemory(sessionId: string): ChatMemory | null {
  try {
    const memoryFile = path.join(MEMORY_STORAGE_DIR, `${sessionId}.json`);
    if (fs.existsSync(memoryFile)) {
      const data = fs.readFileSync(memoryFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Failed to load memory for session ${sessionId}:`, error);
  }
  return null;
}

// OPTIMIZATION: Memory cleanup to prevent memory leaks
function cleanupOldMemories(): void {
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();
  
  Object.keys(chatMemoryStore).forEach(sessionId => {
    const memory = chatMemoryStore[sessionId];
    if (now - memory.lastActivity > maxAge) {
      delete chatMemoryStore[sessionId];
      console.log(`🧹 Cleaned up old memory for session: ${sessionId}`);
    }
  });
}

// Run cleanup every hour
setInterval(cleanupOldMemories, 60 * 60 * 1000);

// Initialize XMTP client
async function initializeXmtpClient() {
  const signer = createSigner(WALLET_KEY);
  const dbEncryptionKey = getEncryptionKeyFromHex(ENCRYPTION_KEY);
  const identifier = await signer.getIdentifier();
  const address = identifier.identifier;

  const client = await Client.create(signer, {
    dbEncryptionKey,
    env: XMTP_ENV as XmtpEnv,
    dbPath: XMTP_STORAGE_DIR + `/${XMTP_ENV}-${address}`,
  });

  await logAgentDetails(client);
  console.log("✓ Syncing conversations...");
  await client.conversations.sync();
  return client;
}

// --- Contract Artifacts ---
const contractAbi = contractArtifact.abi;
const contractBytecode = contractArtifact.bytecode;
// --- End pre-compilation ---

// Helper function to parse amount from user input
function parseAmountFromInput(input: string): string {
  console.log(`🔍 Parsing amount from: "${input}"`);
  
  // More comprehensive patterns for various amount formats
  const patterns = [
    // "100 usdc worth of eth", "50 dollars worth", etc.
    /(\d+(?:\.\d+)?)\s*(?:usdc|usd|dollars?)\s*(?:worth|of|in)\s*(?:eth)?/i,
    // Direct ETH amounts: "0.5 ETH", "2 eth"
    /(\d+(?:\.\d+)?)\s*eth/i,
    // "worth X USDC", "worth X dollars"
    /worth\s*(\d+(?:\.\d+)?)\s*(?:usdc|usd|dollars?)/i,
    // "fundraiser for X USDC"
    /fundraiser\s*(?:for|worth|of)\s*(\d+(?:\.\d+)?)\s*(?:usdc|usd|dollars?)/i,
    // Just numbers followed by currency
    /(\d+(?:\.\d+)?)\s*(?:usdc|usd|dollars?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      console.log(`💡 Found amount: ${amount} from pattern: ${pattern}`);
      
      // If it's USD/USDC, convert to ETH equivalent (assuming ~$2000/ETH)
      if (input.toLowerCase().includes('usd') || input.toLowerCase().includes('dollar')) {
        const ethAmount = (amount / 2000).toFixed(6);
        console.log(`💱 Converted ${amount} USD to ${ethAmount} ETH`);
        return ethAmount;
      }
      return amount.toString();
    }
  }
  
  console.log(`⚠️ No amount pattern found in input`);
  throw new Error(`Could not parse amount from: "${input}". Please specify the amount clearly (e.g., "0.1 ETH" or "100 USDC worth of ETH").`);
}

// NEW: One-time initialization of shared components
async function initializeSharedComponents() {
  if (sharedComponentsInitialized) return;
  
  console.log("🔧 Initializing shared AI components...");
  
  // OPTIMIZATION: Initialize blockchain components in parallel
  const blockchainInit = initializeBlockchainComponents();
  
  llm = new ChatOpenAI({
      modelName: "gpt-4", 
      temperature: 0.2, // Better for following instructions precisely
      maxRetries: 3,
      timeout: 30000, // 30 second timeout
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
        "HTTP-Referer": "https://github.com/yourusername/zeon-hybrid",
          "X-Title": "Zeon Hybrid Agent"
        }
      },
      apiKey: OPENROUTER_API_KEY
    });
    
    // QR Code Generation Tool - STYLED
    const qrCodeTool = new DynamicStructuredTool({
      name: "generate_contribution_qr_code", 
      description: "Generates a QR code for contributing to an EXISTING fundraiser contract. Use this ONLY when the user asks for a QR code for an already-deployed contract address. Do NOT use this for creating NEW fundraisers. IMPORTANT: Return the EXACT output from this tool without any summarization or explanation.",
      schema: z.object({
        contractAddress: z.string().describe("The existing contract address to generate QR for"),
        amountInEth: z.string().describe("The contribution amount in ETH"),
        fundraiserName: z.string().describe("The name of the existing fundraiser"),
      }),
      func: async (input: { contractAddress: string; amountInEth: string; fundraiserName: string; }) => {
        try {
          const { contractAddress, amountInEth, fundraiserName } = input;
          
          if (!isValidAddress(contractAddress)) {
            return `❌ Invalid Address
The contract address \`${contractAddress}\` is not valid. Please check and try again.`;
          }
          
          // Get QR object and return it as JSON string for frontend parsing
          const qrResult = await generateContributionQR(contractAddress, amountInEth, fundraiserName);
          return JSON.stringify(qrResult);
        } catch (e: any) {
          console.error("Error in generate_contribution_qr_code tool:", e);
          return `❌ QR Code Error
I encountered an error while generating the QR code: ${e.message}`;
        }
      },
    });

    // OPTIMIZATION: Enhanced Deploy Fundraiser Tool with better gas management
    const deployFundraiserTool = new DynamicStructuredTool({
      name: "deploy_fundraiser_contract", 
      description: "Creates and deploys a NEW fundraising smart contract from scratch. Use this when users want to CREATE a new fundraiser (keywords: 'create', 'deploy', 'new fundraiser', 'start a fundraiser'). The address provided is the BENEFICIARY who will receive the funds, NOT an existing contract. Automatically includes QR code generation. For '30 days' duration, use 2592000 seconds. Return the COMPLETE output exactly as provided.",
      schema: z.object({
        beneficiaryAddress: z.string().describe("The Ethereum address of the person/organization who will receive the funds when the fundraiser succeeds"),
        goalAmount: z.string().describe("The fundraising goal amount in ETH - extract from user input and convert if needed"),
        durationInSeconds: z.string().optional().default("2592000").describe("Duration of the fundraiser in seconds (default: 30 days = 2592000 seconds)"),
        fundraiserName: z.string().optional().default("Fundraiser").describe("Name/purpose of the fundraiser extracted from user input"),
        originalUserInput: z.string().optional().describe("The original user message to help with amount parsing")
      }),
      func: async (input: { beneficiaryAddress: string; goalAmount: string; durationInSeconds?: string; fundraiserName?: string; originalUserInput?: string; }) => {
        try {
          console.log("🚀 Deploy fundraiser tool called with:", input);
          const { 
            beneficiaryAddress, 
            goalAmount, 
            durationInSeconds = "2592000", // Default to 30 days if not specified
            fundraiserName = "Fundraiser", 
            originalUserInput 
          } = input;
          
          // Status update: Starting deployment
          console.log("📋 Step 1/5: Preparing deployment parameters...");
          
          // Always use the original user input for better amount parsing
          let finalGoalAmount = goalAmount;
          if (originalUserInput) {
            const parsedAmount = parseAmountFromInput(originalUserInput);
            finalGoalAmount = parsedAmount;
            console.log(`💡 Using parsed amount: ${parsedAmount} ETH from "${originalUserInput}"`);
          } else {
            // Also try parsing from the goalAmount parameter
            try {
              const parsedFromGoal = parseAmountFromInput(goalAmount);
              finalGoalAmount = parsedFromGoal;
            } catch (error) {
              console.log(`⚠️ Could not parse amount from goalAmount parameter: ${goalAmount}`);
              // Keep the original goalAmount if parsing fails
            }
          }

          if (!isValidAddress(beneficiaryAddress)) {
            console.log("❌ Invalid beneficiary address:", beneficiaryAddress);
            return `❌ Invalid Address
The beneficiary address \`${beneficiaryAddress}\` is not valid. Please check and try again.`;
          }

          console.log("📋 Step 2/5: Validating deployment parameters...");
          console.log("📋 Deploying contract with params:", { beneficiaryAddress, finalGoalAmount, durationInSeconds, fundraiserName });

          // OPTIMIZATION: Use pre-initialized components
          if (!contractFactory || !optimizedProvider) {
            throw new Error("Blockchain components not initialized");
          }

          const goalInWei = ethers.parseEther(finalGoalAmount);
          console.log("💰 Goal in Wei:", goalInWei.toString());

          console.log("📋 Step 3/5: Optimizing gas settings for fast deployment...");
          // OPTIMIZATION: Enhanced gas optimization for faster deployment
          const feeData = await optimizedProvider.getFeeData();
          const gasPrice = feeData.gasPrice ? feeData.gasPrice * 150n / 100n : undefined; // 50% higher for faster mining

          console.log("⚡ Enhanced gas optimization - using 50% higher gas price for ultra-fast mining...");
          
          // OPTIMIZATION: Streamlined deployment strategy
          const deploymentOptions = {
            gasPrice, // 50% higher gas price for faster mining
            gasLimit: 1200000, // Further reduced gas limit for faster estimation
          };

          console.log(`📤 Step 4/5: Submitting deployment transaction with gas price: ${gasPrice?.toString()} wei`);
          
          const deployedContract = await contractFactory.deploy(
            beneficiaryAddress, 
            goalInWei, 
            durationInSeconds,
            deploymentOptions
          );
          
          const tx = deployedContract.deploymentTransaction();
          if (!tx) throw new Error("Deployment transaction could not be created.");
          
          console.log(`✅ Transaction submitted! Hash: ${tx.hash}`);
          console.log("📋 Step 5/5: Waiting for blockchain confirmation (should be faster with optimized gas)...");
          
          // OPTIMIZATION: Simplified deployment confirmation without timeout
          let contractAddress: string;
          try {
            await deployedContract.waitForDeployment();
            contractAddress = await deployedContract.getAddress();
            console.log("✅ Contract deployed successfully at:", contractAddress);
          } catch (deploymentError: any) {
            console.log("⏰ Deployment confirmation taking longer, checking transaction status...");
            
            try {
              // Get transaction receipt to see if it was mined
              const receipt = await optimizedProvider.getTransactionReceipt(tx.hash);
              if (receipt && receipt.contractAddress) {
                contractAddress = receipt.contractAddress;
                console.log("✅ Contract was deployed! Address:", contractAddress);
              } else if (receipt && receipt.status === 0) {
                throw new Error("Transaction failed - contract deployment reverted");
              } else {
                // Transaction is still pending
                return `⏳ **Deployment In Progress**

Your fundraiser deployment transaction has been submitted successfully!

📋 **Progress:** 
✅ Step 1/5: Parameters prepared
✅ Step 2/5: Validation completed  
✅ Step 3/5: Gas optimized (50% higher for speed)
✅ Step 4/5: Transaction submitted
⏳ Step 5/5: Waiting for blockchain confirmation...

🔗 **Transaction Hash:** \`${tx.hash}\`
📍 **View Status:** [Base Sepolia Scan](${generateBaseScanLink(tx.hash, 'tx')})

**What's happening:**
- Your transaction is being processed by the network
- Enhanced gas settings should speed up confirmation (1-2 minutes)
- You can check the transaction status using the link above
- Once confirmed, your fundraiser will be live with QR code!

**Note:** The contract deployment is in progress. Please check back in a few minutes or monitor the transaction using the provided link.`;
              }
            } catch (receiptError) {
              // If we can't get the receipt, the transaction might still be pending
              return `⏳ **Deployment Submitted - Please Wait**

Your fundraiser deployment has been submitted to the blockchain!

📋 **Progress:** 
✅ Step 1/5: Parameters prepared
✅ Step 2/5: Validation completed  
✅ Step 3/5: Gas optimized for speed
✅ Step 4/5: Transaction submitted
⏳ Step 5/5: Processing on blockchain...

🔗 **Transaction Hash:** \`${tx.hash}\`
📍 **Track Progress:** [Base Sepolia Scan](${generateBaseScanLink(tx.hash, 'tx')})

**Status:** Transaction is being processed by the network (enhanced gas should make this faster!)

**Next Steps:**
1. Monitor the transaction using the link above
2. Once confirmed, your fundraiser will be live
3. You'll automatically get a QR code for contributions

**Tip:** With our enhanced gas settings, this should be faster than usual!`;
            }
          }
          
          console.log("🔗 Transaction hash:", tx.hash);

          console.log("📱 Generating QR code for contributions...");
          // Use 5% of goal amount as suggested contribution, with a minimum of 0.001 ETH for small fundraisers
          const goalInEth = parseFloat(finalGoalAmount);
          const suggestedAmount = Math.max(0.001, Math.min(0.1, goalInEth * 0.05));
          
          let contributionQR: { message: string; qrCode: string } | string;
          try {
            console.log(`🎯 Creating QR for ${suggestedAmount} ETH contribution to ${contractAddress}`);
            const qrResult = await generateContributionQR(
              contractAddress,
              suggestedAmount.toString(),
              fundraiserName
            );
            contributionQR = qrResult; // Keep as object for formatDeployResponse
            console.log("✅ QR code generated successfully!");
          } catch (qrError) {
            console.error("❌ QR generation failed:", qrError);
            contributionQR = `**QR Code generation failed, but here are the details:**

📍 Contract Address: \`${contractAddress}\`
💰 Suggested Amount: ${suggestedAmount} ETH
🔗 View Contract: [Base Sepolia Scan](${generateBaseScanLink(contractAddress, 'address')})

You can manually send contributions to the contract address above.`;
          }

          console.log("📋 Formatting deployment response with QR code...");
          const response = formatDeployResponse(
            contractAddress,
            tx.hash,
            fundraiserName,
            finalGoalAmount,
            contributionQR
          );

          console.log("✅ Deploy tool response generated successfully with QR code");
          console.log("🔍 Response includes QR data:", typeof contributionQR === 'object' ? 'YES' : 'NO');
          return response;
        } catch (e: any) {
          console.error("❌ Error deploying contract:", e);
          console.error("📊 Full error details:", e.stack);
          
          // Enhanced error handling with more specific messages
          if (e.message.includes("insufficient funds")) {
            return `❌ **Insufficient Funds**

Your wallet doesn't have enough ETH to deploy the contract.

**Required:**
- Contract deployment gas: ~0.01-0.02 ETH
- Network: Base Sepolia testnet

**Solutions:**
1. Get testnet ETH from the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Make sure you're connected to Base Sepolia network
3. Try again once you have sufficient testnet ETH

**Wallet Balance Check:** You can check your balance by asking "What's my wallet balance?"`;
          } else if (e.message.includes("nonce")) {
            return `🔄 **Transaction Nonce Error**

There was a nonce conflict. Please try the deployment again.

**This usually happens when:**
- Multiple transactions are sent too quickly
- Network latency causes timing issues

**Solution:** Simply try deploying the fundraiser again.`;
          }
          
          return `❌ **Contract Deployment Failed**

I encountered an error while deploying your fundraiser contract.

**Error:** ${e.message}

**Common Solutions:**
1. **Insufficient Funds:** Get testnet ETH from the Base Sepolia faucet
2. **Network Issues:** Try again in a few minutes
3. **Gas Price:** The network might be congested

**Need Help?** 
- Check your wallet balance: "What's my wallet balance?"
- Get testnet ETH: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- Try deploying again with the same parameters

Would you like me to try deploying again?`;
        }
      },
    });

    // OPTIMIZATION: Enhanced contributor tool with caching
    const getFundraiserContributorsTool = new DynamicStructuredTool({
      name: "get_fundraiser_contributors",
      description: "Gets the list of contributors for a fundraiser with optimized performance",
      schema: z.object({
        contractAddress: z.string()
      }),
      func: async (input: { contractAddress: string; }) => {
        try {
          const { contractAddress } = input;
          
          if (!isValidAddress(contractAddress)) {
            return `❌ Invalid Address
The contract address \`${contractAddress}\` is not valid. Please check and try again.`;
          }
          
          if (!optimizedProvider) {
            throw new Error("Provider not initialized");
          }
          
          const fundraiserContract = new ethers.Contract(contractAddress, contractAbi, optimizedProvider);

          const contributorAddresses = await fundraiserContract.getContributors();
          const contractScanLink = generateBaseScanLink(contractAddress, 'address');
          
          if (contributorAddresses.length === 0) {
            return `🤔 No Contributions Yet
This fundraiser hasn't received any contributions. Be the first!

🔍 View Contract: [${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}](${contractScanLink})`;
          }

          // OPTIMIZATION: Parallel ENS lookups with timeout
          const contributorsWithEns = await Promise.allSettled(
            contributorAddresses.map(async (address: string) => {
              try {
                // Use a public ENS provider for lookups with timeout
                const mainnetProvider = new ethers.JsonRpcProvider("https://web3.ens.domains/v1/mainnet");
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error("ENS lookup timeout")), 2000) // Reduced timeout to 2 seconds
                );
                const ensPromise = mainnetProvider.lookupAddress(address);
                const ensName = await Promise.race([ensPromise, timeoutPromise]).catch(() => null);
                return { address, ensName: ensName || "N/A" };
              } catch (e) {
                return { address, ensName: "N/A" };
              }
            })
          );
          
          const contributorList = contributorsWithEns
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value as { address: string; ensName: string })
            .map((c: { address: string; ensName: string; }) => {
            const addressScanLink = generateBaseScanLink(c.address, 'address');
            const shortAddress = `${c.address.slice(0, 6)}...${c.address.slice(-4)}`;
            return `- ${c.ensName === "N/A" ? shortAddress : c.ensName}: [\`${shortAddress}\`](${addressScanLink})`;
          }).join('\\n');

          return `👥 Contributors for Fundraiser

Here are the amazing people who have contributed:
${contributorList}

---
🔍 View Contract: [${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}](${contractScanLink})`;
        } catch (e: any) {
          console.error("Error getting contributors:", e);
          return `❌ Could Not Get Contributors
I was unable to fetch the contributor list for this fundraiser.
Error: ${e.message}`;
        }
      },
    });
    
    // Check Status Tool - STYLED (no changes needed)
    const checkFundraiserStatusTool = new DynamicStructuredTool({
      name: "check_fundraiser_status",
      description: "Checks if a fundraiser is still active",
      schema: z.object({
        contractAddress: z.string()
      }),
      func: async (input: { contractAddress: string; }) => {
        try {
          const { contractAddress } = input;
          
          if (!isValidAddress(contractAddress)) {
            return `❌ Invalid Address
The contract address \`${contractAddress}\` is not valid. Please check and try again.`;
          }
          
          if (!optimizedProvider) {
            throw new Error("Provider not initialized");
          }
          
          const fundraiserContract = new ethers.Contract(contractAddress, contractAbi, optimizedProvider);
          
          const isActive = await fundraiserContract.isFundraiserActive();
          const statusMessage = isActive 
            ? "✅ Active: This fundraiser is currently accepting contributions." 
            : "❌ Ended: This fundraiser has ended and can no longer accept contributions.";

          const contractScanLink = generateBaseScanLink(contractAddress, 'address');
          const shortContract = `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;

          return `📊 Fundraiser Status

${statusMessage}

---
🔍 View Contract: [\`${shortContract}\`](${contractScanLink})`;
        } catch (e: any) {
          console.error("Error checking fundraiser status:", e);
          return `❌ Could Not Check Status
I was unable to check the status of this fundraiser.
Error: ${e.message}`;
        }
      },
    });

    // Check Balance Tool - OPTIMIZATION: Use optimized provider
    const checkWalletBalanceTool = new DynamicStructuredTool({
      name: "check_wallet_balance",
      description: "Checks the balance of an Ethereum wallet address",
      schema: z.object({
        address: z.string()
      }),
      func: async (input: { address: string; }) => {
        try {
          const { address } = input;
          
          if (!isValidAddress(address)) {
            return `❌ Invalid Address
The wallet address \`${address}\` is not valid. Please check and try again.`;
          }
          
          if (!optimizedProvider) {
            throw new Error("Provider not initialized");
          }
          
          const balance = await optimizedProvider.getBalance(address);
          const balanceInEth = ethers.formatEther(balance);
          
          const addressScanLink = generateBaseScanLink(address, 'address');
          const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
          
          return `💰 Wallet Balance

- Address: [\`${shortAddress}\`](${addressScanLink})
- Balance: ${balanceInEth} ETH (on Base Sepolia)`;
        } catch (e: any) {
          console.error("Error checking wallet balance:", e);
          return `❌ Could Not Check Balance
I was unable to check the balance of this wallet.
Error: ${e.message}`;
        }
      },
    });

    // OPTIMIZATION: Enhanced Send Funds Tool with better gas management
    const sendFundsTool = new DynamicStructuredTool({
      name: "send_funds_to_address_or_ens",
      description: "Sends ETH to a given address or ENS/.base name with optimized gas settings. Example: 'Send 0.1 ETH to iamchris.base.eth'. CRITICAL: Return the COMPLETE output from this tool exactly as provided.",
      schema: z.object({
        recipient: z.string().describe("The recipient's wallet address or ENS/.base name (e.g., 'iamchris.base.eth')"),
        amountInEth: z.string().describe("The amount of ETH to send (e.g., '0.1')"),
      }),
      func: async (input: { recipient: string; amountInEth: string; }) => {
        let { recipient, amountInEth } = input;
        
        // Try to parse amount if it looks like it might need conversion
        if (amountInEth.toLowerCase().includes('usd') || amountInEth.toLowerCase().includes('dollar')) {
          amountInEth = parseAmountFromInput(amountInEth);
        }
        
        console.log(`💸 Attempting to send ${amountInEth} ETH to ${recipient}`);

        try {
          if (!optimizedProvider || !optimizedWallet) {
            throw new Error("Blockchain components not initialized");
          }
          
          let targetAddress: string | null = null;

          // Check if it's a potential ENS/.base name or a regular address
          if (recipient.includes('.')) {
            console.log(`🔍 Resolving ENS/base name: ${recipient}`);
            
            // OPTIMIZATION: Add timeout to ENS resolution
            const resolutionPromise = optimizedProvider.resolveName(recipient);
            const timeoutPromise = new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error("ENS resolution timeout")), 5000)
            );
            
            targetAddress = await Promise.race([resolutionPromise, timeoutPromise]);
            if (!targetAddress) {
              return `❌ Name Not Found
I could not resolve the name \`${recipient}\`. Please ensure it's a valid and registered ENS or .base name on the correct network.`;
            }
            console.log(`✅ Resolved ${recipient} to ${targetAddress}`);
          } else if (isValidAddress(recipient)) {
            targetAddress = recipient;
          } else {
            return `❌ Invalid Recipient
The recipient \`${recipient}\` is not a valid wallet address or ENS/.base name. Please check and try again.`;
          }

          console.log(`📤 Preparing transaction to ${targetAddress} for ${amountInEth} ETH...`);
          
          // OPTIMIZATION: Get optimized gas settings
          const feeData = await optimizedProvider.getFeeData();
          const gasPrice = feeData.gasPrice ? feeData.gasPrice * 120n / 100n : undefined; // 20% higher for faster confirmation
          
          const tx = {
            to: targetAddress,
            value: ethers.parseEther(amountInEth),
            gasPrice, // 20% higher for faster confirmation
            gasLimit: 21000, // Standard ETH transfer gas limit
          };

          const txResponse = await optimizedWallet.sendTransaction(tx);
          console.log(`⏳ Transaction sent with hash: ${txResponse.hash}. Waiting for confirmation...`);
          
          // OPTIMIZATION: Wait for confirmation without timeout
          await txResponse.wait();
          console.log(`✅ Transaction confirmed!`);

          return formatTransactionResponse(txResponse.hash, "Send Funds", {
            from: optimizedWallet.address,
            to: targetAddress,
            value: amountInEth,
          });
        } catch (e: any) {
          console.error("❌ Error sending funds:", e);
          if (e.message.includes("insufficient funds")) {
            return `❌ Insufficient Funds
The wallet does not have enough ETH to complete this transaction (including gas fees).`;
          }
          return `❌ Transaction Failed
I encountered an error while trying to send the funds: ${e.message}`;
        }
      },
    });

  tools = [deployFundraiserTool, qrCodeTool, getFundraiserContributorsTool, checkFundraiserStatusTool, checkWalletBalanceTool, sendFundsTool];
  
  // Wait for blockchain components to be ready
  await blockchainInit;
  
  sharedComponentsInitialized = true;
  console.log("✅ Shared components initialized with optimizations");
}

// OPTIMIZATION: Enhanced agent initialization with persistent memory
async function initializeAgent(userId: string, client: Client): Promise<{ agent: Agent; config: AgentConfig }> {
  try {
    if (!sharedComponentsInitialized) {
      throw new Error("Shared components not initialized. Call initializeSharedComponents() first.");
    }

    // OPTIMIZATION: Load existing memory if available
    let chatMemory = loadChatMemory(userId);
    if (!chatMemory) {
      chatMemory = {
        messages: [],
        lastActivity: Date.now(),
        sessionId: userId
      };
    }
    chatMemoryStore[userId] = chatMemory;

    memoryStore[userId] = new MemorySaver();

    const agentConfig: AgentConfig = {
      configurable: { thread_id: userId },
    };

    // Bind tools to the LLM for better tool calling
    const llmWithTools = llm.bindTools(tools);
    
    const agent = await createReactAgent({
      llm: llmWithTools,
      tools,
      checkpointSaver: memoryStore[userId], // Enable persistent memory
    });

    return { agent, config: agentConfig };
  } catch (error: any) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

// OPTIMIZATION: Enhanced message processing with memory persistence
async function processMessage(
  agent: Agent,
  config: AgentConfig,
  message: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<string> {
  try {
    console.log(
      `🤔 Processing: "${message}" with history of length ${history.length}`,
    );

    const sessionId = config.configurable.thread_id;
    
    // OPTIMIZATION: Load and update chat memory
    let chatMemory = chatMemoryStore[sessionId];
    if (!chatMemory) {
      chatMemory = loadChatMemory(sessionId) || {
        messages: [],
        lastActivity: Date.now(),
        sessionId
      };
      chatMemoryStore[sessionId] = chatMemory;
    }

    // Add current message to memory
    chatMemory.messages.push({
      role: "user",
      content: message,
      timestamp: Date.now()
    });
    chatMemory.lastActivity = Date.now();

    // OPTIMIZATION: Use recent memory (last 20 messages) for context
    const recentMessages = chatMemory.messages.slice(-20);
    const messages: BaseMessage[] = recentMessages.map((msg) =>
      msg.role === "user"
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content),
    );

    // Add current message if not already included
    if (recentMessages.length === 0 || recentMessages[recentMessages.length - 1].content !== message) {
    messages.push(new HumanMessage(message));
    }

    const response = (await agent.invoke({ messages }, config)) as {
      messages: BaseMessage[];
    };

    // Log all messages in the response for debugging
    console.log(`📊 Response has ${response.messages.length} messages`);
    response.messages.forEach((msg, index) => {
      console.log(`📝 Message ${index}: ${msg.constructor.name} - ${JSON.stringify(msg.content).slice(0, 100)}...`);
    });

    const responseContent =
      response.messages[response.messages.length - 1].content as string;
    console.log(`🤖 Final response: ${responseContent.slice(0, 200)}...`);

    // OPTIMIZATION: Save assistant response to memory
    chatMemory.messages.push({
      role: "assistant",
      content: responseContent,
      timestamp: Date.now()
    });
    chatMemory.lastActivity = Date.now();

    // OPTIMIZATION: Persist memory asynchronously
    setImmediate(() => saveChatMemory(sessionId, chatMemory!));

    return responseContent;
  } catch (error: any) {
    console.error("Error processing message:", error);

    if (error.message.includes("401")) {
      console.error("OpenRouter authentication error:", error);
      return `❌ Authentication error with AI service. Please check the API configuration.`;
    } else if (error.message.includes("insufficient funds")) {
      return `❌ Insufficient funds! Please make sure you have enough ETH in your wallet for this transaction. You can get testnet ETH from the Base Sepolia faucet.`;
    } else if (error.message.includes("invalid address")) {
      return `❌ Invalid address format! Please provide a valid Ethereum address (starting with 0x) or ENS name.`;
    } else if (error.message.includes("network")) {
      return `❌ Network error! Please check your connection and try again.`;
    }

    return `❌ Sorry, I encountered an error: ${error.message}. Please try again or rephrase your request.`;
  }
}

// Handle incoming messages as a request/response function
async function handleMessage(
  messageContent: string,
  senderAddress: string,
  client: Client,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<string> {
  let conversation: any = null;
  try {
    const botAddress = client.inboxId.toLowerCase();
    
    console.log(`\n📨 Message from ${senderAddress}: ${messageContent}`);

    // Skip if it's from the agent itself
    if (senderAddress.toLowerCase() === botAddress) {
      console.log("Debug - Ignoring message from self");
      return "Ignoring message from self";
    }

    // Get or create agent for this user
    let agent = agentStore[senderAddress];
    let config;
    
    if (!agent) {
      console.log(`🚀 Initializing new agent for ${senderAddress}...`);
      const result = await initializeAgent(senderAddress, client);
      agent = result.agent;
      config = result.config;
      agentStore[senderAddress] = agent;
      console.log(`✅ Agent initialized for ${senderAddress}`);
    } else {
      config = { configurable: { thread_id: senderAddress } };
    }

    // Process the message
    const response = await processMessage(
      agent,
      config,
      messageContent,
      history,
    );
    
    console.log(`🤖 Sending response to ${senderAddress}`);
    
    return response;

  } catch (error) {
    console.error("Error handling message:", error);
    
    // The 'conversation' object is not available in this API context.
    // The error will be returned to the API caller in the main() function.
    return "❌ Sorry, I'm having technical difficulties. Please try again in a moment!";
  }
}

// Start the agent
async function startAgent() {
  console.log(`
🚀 Starting Optimized XMTP Crypto Agent...
  `);
  
  try {
    ensureOptimizedStorage();
    
    // Initialize shared components first
    await initializeSharedComponents();
    
    console.log("🔧 Initializing XMTP Client...");
    const client = await initializeXmtpClient();
    
    console.log("🎯 Agent is ready and listening for API requests!");
    console.log(`📍 Agent address: ${client.inboxId}`);
    console.log(`🌐 Network: ${XMTP_ENV}`);
    console.log(`⛓️  Blockchain: ${NETWORK_ID}`);
    
    // Return the client and handler for the API server
    return {
      client,
      handleMessage: (
        message: string,
        userId: string,
        history: { role: "user" | "assistant"; content: string }[] = [],
      ) => handleMessage(message, userId, client, history),
    };

  } catch (error) {
    console.error("❌ Failed to start agent:", error);
    process.exit(1);
  }
}

async function main() {
  const app = express();
  app.use(express.json());
  
  // FIXED: Enhanced CORS configuration with explicit domain allowlist
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'https://www.zeonai.xyz',
        'https://zeonai.xyz',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174'
      ];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`🚫 CORS blocked origin: ${origin}`);
        // In production, allow zeonai.xyz domains even if not in the exact list
        if (origin.includes('zeonai.xyz') && process.env.NODE_ENV === 'production') {
          console.log(`✅ Allowing zeonai.xyz subdomain: ${origin}`);
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name'
    ],
    exposedHeaders: ['Content-Length', 'X-Processing-Time'],
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false
  };
  
  app.use(cors(corsOptions));
  
  // ADDITIONAL: Explicit preflight handling for complex requests
  app.options('*', cors(corsOptions));
  
  // FALLBACK: Manual CORS headers as backup (in case cors middleware fails)
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    console.log(`📍 Request from origin: ${origin || 'no-origin'}`);
    
    // Always set basic CORS headers for zeonai.xyz domains
    if (origin && origin.includes('zeonai.xyz')) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name');
      res.header('Access-Control-Expose-Headers', 'Content-Length, X-Processing-Time');
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      console.log(`✈️ Preflight request from ${origin}`);
      res.status(200).end();
      return;
    }
    
    next();
  });

  app.get('/', (req, res) => {
    // Return a status indicating if the agent is ready
    const status = agent 
      ? '✅ Zeon AI Agent is running and ready!' 
      : '🟡 Zeon AI Agent is initializing... please wait.';
    res.send(status);
  });

  // Dedicated health check endpoint with proper HTTP status codes
  app.get('/health', (req, res) => {
    if (agent) {
      res.status(200).json({ 
        status: 'healthy', 
        agent: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({ 
        status: 'initializing', 
        agent: 'not_ready',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // OPTIMIZATION: Add performance metrics endpoint
  app.get('/metrics', (req, res) => {
    if (agent) {
      res.json({
        activeSessions: Object.keys(chatMemoryStore).length,
        activeAgents: Object.keys(agentStore).length,
        memorySize: Object.values(chatMemoryStore).reduce((acc, mem) => acc + mem.messages.length, 0),
        blockchainReady: !!(optimizedProvider && optimizedWallet && contractFactory),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({ error: 'Agent not ready' });
    }
  });

  // CORS TEST: Simple endpoint to verify CORS is working
  app.get('/cors-test', (req, res) => {
    const origin = req.headers.origin;
    res.json({
      message: '✅ CORS is working correctly!',
      origin: origin || 'no-origin',
      timestamp: new Date().toISOString(),
      headers: {
        'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
        'access-control-allow-credentials': res.getHeader('Access-Control-Allow-Credentials')
      }
    });
  });

  // Chat endpoint handler function
  const handleChatRequest = async (req: any, res: any) => {
    // Debug logging
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📝 Content-Type:', req.headers['content-type']);
    
    // Extract fields with fallbacks for different frontend formats
    let { message, sessionId } = req.body;
    
    // Handle different field name variations
    message = message || req.body.text || req.body.content || req.body.query;
    sessionId = sessionId || req.body.session_id || req.body.userId || req.body.user_id || req.body.id || 'default-session';
    
    // More detailed error message
    if (!message) {
      return res.status(400).send({ 
        error: 'message field is required (also accepts: text, content, query)',
        received: req.body
      });
    }
    
    // Auto-generate sessionId if still missing
    if (!sessionId || sessionId === 'default-session') {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🔄 Auto-generated sessionId: ${sessionId}`);
    }
    
    // Return 503 if agent isn't ready yet
    if (!agent) {
      return res.status(503).send({ error: 'Service Unavailable: Agent is initializing. Please try again in a moment.' });
    }
    
    try {
      const startTime = Date.now();
      const response = await agent.handleMessage(message, sessionId);
      const processingTime = Date.now() - startTime;
      
      console.log(`⚡ Processing time: ${processingTime}ms`);
      
      res.send({ 
        response,
        metadata: {
          processingTime,
          sessionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error handling API message:", error);
      res.status(500).send({ error: 'Failed to process message' });
    }
  };

  // Dedicated QR code endpoint
  app.post('/api/qr-code', async (req: any, res: any) => {
    try {
      const { contractAddress, amountInEth, fundraiserName } = req.body;
      
      if (!contractAddress || !amountInEth || !fundraiserName) {
        return res.status(400).send({ 
          error: 'contractAddress, amountInEth, and fundraiserName are required' 
        });
      }
      
      if (!isValidAddress(contractAddress)) {
        return res.status(400).send({ 
          error: 'Invalid contract address format' 
        });
      }
      
      const qrResult = await generateContributionQR(contractAddress, amountInEth, fundraiserName);
      
      res.send({
        message: qrResult.message,
        qrCode: qrResult.qrCode,
        metadata: {
          contractAddress,
          amountInEth,
          fundraiserName,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Error generating QR code:", error);
      res.status(500).send({ error: 'Failed to generate QR code' });
    }
  });

  // Both endpoints for compatibility
  app.post('/api/message', handleChatRequest);
  app.post('/api/chat', handleChatRequest);

    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => {
    console.log(`✅ Optimized API Server is live on port ${PORT}. Health checks should pass.`);
      
      // Now, initialize the agent in the background.
      console.log('⏳ Starting agent initialization in the background...');
      startAgent()
        .then(initializedAgent => {
          agent = initializedAgent;
        console.log('✅ Agent is fully initialized and ready to handle requests with optimizations.');
        })
        .catch(err => {
          console.error('❌ FATAL: Agent initialization failed. The API will not be able to process messages.', err);
        });
  });
}

main().catch((error) => {
  console.error("❌ Failed to start main application:", error);
  process.exit(1);
});