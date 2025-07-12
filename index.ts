import * as fs from "fs";
import {
  AgentKit,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  CdpWalletProvider,
  erc20ActionProvider,
  erc721ActionProvider,
  walletActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import { DynamicTool } from "@langchain/core/tools";
import { ethers } from 'ethers';
import { generateCryptoQRData } from './utils/qrCodeGenerator.js';

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

console.log("🔧 Validating environment variables...");

// Import validation from helpers
import { validateEnvironment } from "./helpers/client.js";
// Import blockchain utilities
import { 
  generateFundraiserLink, 
  formatFundraiserResponse, 
  getFundraiserStatus 
} from "./utils/blockchain.js";
// Import enhanced contract deployment
import { 
  createEnhancedFundraiser, 
  createSmartContractFundraiser 
} from "./utils/fundraiser-contract.js";
// Import balance manager
import BalanceManager from "./utils/balance-manager.js";

const {
  CDP_API_KEY_NAME,
  CDP_API_KEY_PRIVATE_KEY,
  NETWORK_ID,
  OPENROUTER_API_KEY,
} = validateEnvironment([
  "CDP_API_KEY_NAME",
  "CDP_API_KEY_PRIVATE_KEY",
  "NETWORK_ID",
  "OPENROUTER_API_KEY",
]);

console.log("✅ Environment variables validated:", {
  CDP_API_KEY_NAME: CDP_API_KEY_NAME || 'MISSING',
  CDP_API_KEY_PRIVATE_KEY: CDP_API_KEY_PRIVATE_KEY ? 'SET' : 'MISSING',
  NETWORK_ID: NETWORK_ID || 'base-sepolia',
  OPENROUTER_API_KEY: OPENROUTER_API_KEY ? `${OPENROUTER_API_KEY.substring(0, 10)}...` : 'MISSING'
});

// Storage constants
const WALLET_STORAGE_DIR = ".data/wallet";

// Global stores for memory and agent instances
const memoryStore: Record<string, MemorySaver> = {};

interface AgentConfig {
  configurable: {
    thread_id: string;
  };
}

type Agent = ReturnType<typeof createReactAgent>;

// Agent will be initialized once and reused
let globalAgent: Agent | null = null;
let globalConfig: AgentConfig | null = null;
let globalBalanceManager: BalanceManager | null = null;

/**
 * Ensure local storage directory exists
 */
function ensureLocalStorage() {
  if (!fs.existsSync(WALLET_STORAGE_DIR)) {
    fs.mkdirSync(WALLET_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Save wallet data to storage.
 *
 * @param userId - The unique identifier for the user
 * @param walletData - The wallet data to be saved
 */
function saveWalletData(userId: string, walletData: string) {
  const localFilePath = `${WALLET_STORAGE_DIR}/${userId}.json`;
  try {
    if (!fs.existsSync(localFilePath)) {
      console.log(`💾 Wallet data saved for user ${userId}`);
      fs.writeFileSync(localFilePath, walletData);
    }
  } catch (error) {
    console.error(`Failed to save wallet data to file: ${error as string}`);
  }
}

/**
 * Get wallet data from storage.
 *
 * @param userId - The unique identifier for the user
 * @returns The wallet data as a string, or null if not found
 */
function getWalletData(userId: string): string | null {
  const localFilePath = `${WALLET_STORAGE_DIR}/${userId}.json`;
  try {
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath, "utf8");
    }
  } catch (error) {
    console.warn(`Could not read wallet data from file: ${error as string}`);
  }
  return null;
}

/**
 * Initialize the AgentKit with the necessary tools and configuration.
 *
 * @param userId - The unique identifier for the user
 * @returns An object containing the initialized agent and configuration
 */
async function initializeAgent(
  userId: string,
): Promise<{ agent: Agent; config: AgentConfig }> {
  console.log(`🤖 Initializing agent for user: ${userId}`);

  // Initialize the LLM
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });

  // Configure CDP with wallet provider for the user
  const walletData = getWalletData(userId);
  
  const provider = await CdpWalletProvider.configureWithWallet({
    apiKeyId: CDP_API_KEY_NAME,
    apiKeySecret: CDP_API_KEY_PRIVATE_KEY,
    networkId: NETWORK_ID,
    cdpWalletData: walletData || undefined,
  });

  if (!walletData) {
    console.log(`🔑 Creating new wallet for user: ${userId}`);
    const newWalletData = await provider.exportWallet();
    saveWalletData(userId, JSON.stringify(newWalletData));
  } else {
    console.log(`🔑 Loading existing wallet for user: ${userId}`);
  }

  // Log wallet information for debugging
  const walletAddress = await provider.getAddress();
  console.log(`💼 Wallet initialized for user ${userId}: ${walletAddress}`);

  // Initialize balance manager if not already created
  if (!globalBalanceManager) {
    console.log(`💰 Initializing balance manager...`);
    globalBalanceManager = new BalanceManager(provider, {
      minimumBalance: "0.002", // Slightly higher minimum for faster operations
      targetBalance: "0.01",   // Higher target balance
      recheckIntervalMs: 45000 // Check every 45 seconds
    });
    
    // Start background monitoring
    globalBalanceManager.startMonitoring();
    
    // Check initial balance and request faucet if needed
    const balanceCheck = await globalBalanceManager.ensureSufficientBalance();
    if (!balanceCheck.ready && balanceCheck.message) {
      console.log(`⚠️ ${balanceCheck.message}`);
    }
  }

  // Get the AgentKit tools
  const agentKit = await AgentKit.from({
    walletProvider: provider,
    actionProviders: [
      cdpApiActionProvider({
        apiKeyId: CDP_API_KEY_NAME,
        apiKeySecret: CDP_API_KEY_PRIVATE_KEY,
      }),
      cdpWalletActionProvider({
        apiKeyId: CDP_API_KEY_NAME,
        apiKeySecret: CDP_API_KEY_PRIVATE_KEY,
      }),
      erc20ActionProvider(),
      erc721ActionProvider(),
      walletActionProvider(),
    ],
  });

  // Get LangChain-compatible tools
  const agentKitTools = await getLangChainTools(agentKit);
  console.log(`🛠️  Loaded ${agentKitTools.length} tools for AgentKit`);

  // Create custom tools for fundraiser management
  const fundraiserTool = new DynamicTool({
    name: "create_fundraiser",
    description: `Creates a new fundraiser for a specified ETH amount. Call this when a user wants to start a fundraiser. Returns a formatted string with fundraiser details, progress, and contribution options.`,
    func: async (input: string) => {
      try {
        const { fundraiserName, goalAmount, description } = JSON.parse(input);
        
        // Use enhanced fundraiser creation (wallet-based by default)
        const result = await createEnhancedFundraiser(
          provider,
          fundraiserName,
          goalAmount,
          description,
          false // Use wallet-based fundraiser
        );
        
        return result;
      } catch (error) {
        return "Error creating fundraiser. Please ensure you provide fundraiserName, goalAmount, and an optional description in JSON format.";
      }
    },
  });

  const contractFundraiserTool = new DynamicTool({
    name: "create_contract_fundraiser",
    description: `Creates a new smart contract fundraiser for a specified ETH amount. This deploys an actual contract on Base Sepolia that can be verified and interacted with directly. Call this when a user wants to start a contract-based fundraiser. Returns a formatted string with deployment details, contract address, and QR code.`,
    func: async (input: string) => {
      try {
        const { fundraiserName, goalAmount, description } = JSON.parse(input);
        
        // Use enhanced fundraiser creation with smart contract
        const result = await createEnhancedFundraiser(
          provider,
          fundraiserName,
          goalAmount,
          description,
          true // Use smart contract deployment
        );
        
        return result;
      } catch (error) {
        return "Error creating contract fundraiser. Please ensure you provide fundraiserName, goalAmount, and an optional description in JSON format.";
      }
    },
  });

  const qrCodeTool = new DynamicTool({
    name: "generate_contribution_qr_code",
    description: "Generates a QR code for a specific ETH contribution amount to a fundraiser. Call this when a user asks for a QR code.",
    func: async (input: string) => {
      try {
        const { amount, fundraiserName, description } = JSON.parse(input);
        const walletAddress = await provider.getAddress();
        
        const { generateContributionQR } = await import('./utils/blockchain.js');
        const qrData = await generateContributionQR(walletAddress, amount, fundraiserName);
        
        const responsePayload = {
            response: `Here is the QR code you requested for the "${fundraiserName}" fundraiser.`,
            qrCode: qrData.qrCode,
            qrMessage: qrData.message,
        };

        return JSON.stringify(responsePayload);
      } catch (error) {
        return "Error generating QR code. Please ensure you provide amount, fundraiserName, and an optional description in JSON format.";
      }
    },
  });

  const tools = [...agentKitTools, fundraiserTool, contractFundraiserTool, qrCodeTool];
  console.log(`✅ Added 3 custom tools. Total tools: ${tools.length}`);

  // Create memory saver
  let memory = memoryStore[userId];
  if (!memory) {
    memory = new MemorySaver();
    memoryStore[userId] = memory;
    console.log(`🧠 Created new memory store for user: ${userId}`);
  }

  // Create system prompt
  const systemPrompt = `You are Zeon, an AI agent specialized in helping users with cryptocurrency fundraising and wallet management.

*CRITICAL FORMATTING RULES:*
- You MUST return the tool's output EXACTLY as it is provided.
- Do NOT modify, rephrase, or add any text to the tool's output.
- Do NOT add any markdown formatting like bolding, italics, or lists unless it is already present in the tool's output.
- URLs must NEVER be broken across multiple lines.
- If a tool returns a JSON string, you MUST return the entire, unmodified JSON string and nothing else.

*IMPORTANT FUNDRAISING GUIDELINES:*
- To create a wallet-based fundraiser, use the 'create_fundraiser' tool. You must provide 'fundraiserName' and 'goalAmount'.
- To create a smart contract fundraiser, use the 'create_contract_fundraiser' tool. You must provide 'fundraiserName' and 'goalAmount'.
- To generate a QR code, use the 'generate_contribution_qr_code' tool. You must provide 'amount' and 'fundraiserName'.
- Smart contract fundraisers are deployed on Base Sepolia and can be verified on BaseScan.
- Wallet-based fundraisers are simpler and use direct wallet transfers.
- Do not make up responses for fundraisers or QR codes. Use the tools.
- Always use the exact output from tools without reformatting.

*SMART CONTRACT FEATURES:*
- Smart contract fundraisers are deployed on Base Sepolia network.
- They provide transparency, automatic tracking, and are verifiable on BaseScan.
- Contributors can interact directly with the contract.
- The contract includes safety features like withdrawal controls and goal tracking.

*FUND MANAGEMENT PROTOCOL:*
- I maintain a minimum balance of 0.002 ETH for fast operations.
- Balance is automatically monitored and topped up from faucet as needed.
- If funds are temporarily low, I'll inform users with specific timing expectations.
- For urgent needs, users can send ETH directly to my wallet address.

Key features:
- You operate on the ${NETWORK_ID} network.
- You use tools to generate enhanced QR codes and fundraiser details.
- You maintain conversation memory across sessions.
- You can deploy actual smart contracts for fundraisers.

Important guidelines:
- Always use the fundraiser creation tools and QR code generation tools.
- Prioritize security and user education.
- Explain technical concepts in simple terms.
- Be helpful, friendly, and professional.
- When users ask for contract deployment, use the 'create_contract_fundraiser' tool.

Current user: ${userId}
Wallet Address: ${walletAddress}
Network: ${NETWORK_ID}

Remember to always verify addresses and amounts before executing transactions.`;

  // Create the agent
  const agent = createReactAgent({
    llm,
    tools, // Use combined tools
    checkpointSaver: memory,
    messageModifier: systemPrompt,
  });

  const config: AgentConfig = {
    configurable: {
      thread_id: userId,
    },
  };

  console.log(`✅ Agent initialized successfully for user: ${userId}`);
  
  return { agent, config };
}

/**
 * Check if a message likely involves a transaction that requires ETH
 */
function isTransactionMessage(message: string): boolean {
  const transactionKeywords = [
    'fundraiser', 'create', 'deploy', 'transfer', 'send', 'mint', 
    'token', 'nft', 'swap', 'trade', 'contract', 'transaction',
    'faucet', 'withdraw', 'deposit', 'stake', 'unstake'
  ];
  
  const lowerMessage = message.toLowerCase();
  return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Process a message using the agent.
 *
 * @param agent - The initialized agent
 * @param config - The agent configuration
 * @param message - The message to process
 * @returns A promise that resolves to the agent's response
 */
async function processMessage(
  agent: Agent,
  config: AgentConfig,
  message: string,
): Promise<string> {
  try {
    console.log(`🔄 Processing message: "${message}"`);
    
    // Proactive balance check for transaction-related requests
    if (globalBalanceManager && isTransactionMessage(message)) {
      console.log(`💰 Checking balance before transaction operation...`);
      const balanceCheck = await globalBalanceManager.ensureSufficientBalance();
      if (!balanceCheck.ready) {
        console.log(`⚠️ Insufficient balance for transaction: ${balanceCheck.message}`);
        return balanceCheck.message || "I need to request more funds before proceeding. Please try again in a moment.";
      }
    }
    
    const response = await agent.invoke(
      { messages: [new HumanMessage(message)] },
      config,
    );

    // Extract the response content
    const lastMessage = response.messages[response.messages.length - 1];
    
    if (lastMessage?.content) {
      const responseText = typeof lastMessage.content === 'string' 
        ? lastMessage.content 
        : JSON.stringify(lastMessage.content);
      
      console.log(`✅ Agent response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);
      return responseText;
    } else {
      console.warn("⚠️  Agent returned empty response");
      return "I apologize, but I couldn't generate a proper response. Could you please try rephrasing your question?";
    }
  } catch (error) {
    console.error("❌ Error processing message:", error);
    
    if (error instanceof Error) {
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      // Enhanced error handling with automatic retry logic
      if (error.message.includes("insufficient funds")) {
        console.log("💰 Insufficient funds detected, attempting automatic resolution...");
        
        if (globalBalanceManager) {
          const balanceCheck = await globalBalanceManager.ensureSufficientBalance();
          if (balanceCheck.ready) {
            // Funds are now available, suggest immediate retry
            return "I've resolved the funding issue. Please try your request again now - I should have sufficient funds.";
          } else {
            // Still need to wait for funds
            return balanceCheck.message || "I'm working on getting more funds. Please try again in about a minute.";
          }
        } else {
          return "I'm running low on funds for transaction fees. I've automatically requested more from the faucet, which should arrive in about a minute. Please try your request again shortly.";
        }
      }
      if (error.message.includes("CDP")) {
        return "❌ I'm having trouble with wallet operations. Please check your configuration and try again.";
      } else if (error.message.includes("OpenRouter") || error.message.includes("OpenAI")) {
        return "❌ I'm having trouble with my AI processing. Please try again in a moment.";
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        return "❌ I'm having network connectivity issues. Please try again in a moment.";
      }
    }
    
    return "❌ I encountered an unexpected error. Please try again or contact support if the problem persists.";
  }
}

/**
 * Handle incoming messages and route them to the appropriate agent.
 *
 * @param messageContent - The content of the message
 * @param userId - The user ID (replaces XMTP sender address)
 * @returns A promise that resolves to the agent's response
 */
async function handleMessage(
  messageContent: string,
  userId: string,
): Promise<string> {
  try {
    console.log(`📩 Received message from user ${userId}: "${messageContent}"`);
    
    // Use global agent if available, otherwise initialize a new one
    let agent = globalAgent;
    let config = globalConfig;
    
    if (!agent || !config) {
      console.log(`🔧 Initializing agent for user: ${userId}`);
      const result = await initializeAgent(userId);
      agent = result.agent;
      config = result.config;
      
      // Store globally for reuse
      globalAgent = agent;
      globalConfig = config;
      
      console.log(`✅ Agent initialized for ${userId}`);
    }

    // Process the message
    const response = await processMessage(
      agent,
      config,
      messageContent,
    );
    
    console.log(`🤖 Sending response to ${userId}`);
    
    return response;

  } catch (error) {
    console.error("❌ Error handling message:", error);
    
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error("❌ Error name:", error.name);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
      
      // Return more specific error messages based on error type
      if (error.message.includes("CDP") || error.message.includes("wallet")) {
        return "❌ Wallet initialization error. Please check your CDP configuration and try again.";
      } else if (error.message.includes("OpenAI") || error.message.includes("OpenRouter")) {
        return "❌ AI service error. Please check your API key configuration.";
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        return "❌ Network connectivity error. Please try again in a moment.";
      }
    } else {
      console.error("❌ Non-Error exception:", JSON.stringify(error));
    }
    
    return "❌ Sorry, I'm having technical difficulties. Please try again in a moment!";
  }
}

/**
 * Start the agent service
 */
async function startAgent() {
  console.log(`
🚀 Starting Zeon Fundraising Agent with Coinbase AgentKit...
  `);
  
  try {
    ensureLocalStorage();
    
    console.log("🔧 Initializing AgentKit...");
    
    // Pre-initialize the global agent with a default user
    const defaultUserId = "default-user";
    const result = await initializeAgent(defaultUserId);
    globalAgent = result.agent;
    globalConfig = result.config;
    
    console.log("🎯 Agent is ready!");
    console.log(`⛓️  Network: ${NETWORK_ID}`);
    console.log(`🤖 AgentKit: Initialized with ${globalAgent ? 'success' : 'error'}`);
    
    // Ensure we have sufficient funds for immediate operations
    if (globalBalanceManager) {
      console.log("💰 Performing startup fund check...");
      const startupBalanceCheck = await globalBalanceManager.ensureSufficientBalance();
      if (startupBalanceCheck.ready) {
        console.log("✅ Sufficient funds available for immediate operations");
      } else {
        console.log(`⚠️ Startup fund status: ${startupBalanceCheck.message}`);
      }
    }
    
    // Return the handler for the API server
    return {
      handleMessage,
    };

  } catch (error) {
    console.error("❌ Failed to start agent:", error);
    throw error;
  }
}

/**
 * Main function to start the service
 */
async function main() {
  // Initialize the Express app
  const app = express();
  const PORT = process.env.PORT || 10000;

  // Request logging middleware
  app.use((req, res, next) => {
    const origin = req.get('origin') || req.get('referer') || 'no-origin';
    console.log(`📍 ${req.method} ${req.path} from origin: ${origin}`);
    next();
  });

  // Enhanced CORS middleware with proper preflight handling
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001', 
        'https://zeon-frontend.vercel.app',
        'https://www.zeonai.xyz',
        'https://zeonai.xyz',
        'https://zeon.vercel.app',
        /\.vercel\.app$/,
        /\.netlify\.app$/,
        /localhost:\d+$/
      ];
      
      // Check if origin is allowed
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log(`🚫 CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-HTTP-Method-Override',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods'
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    optionsSuccessStatus: 200, // Legacy browser support
    preflightContinue: false,
    maxAge: 86400 // 24 hours
  }));
  
  // Additional CORS headers middleware as fallback
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://zeon-frontend.vercel.app',
      'https://www.zeonai.xyz',
      'https://zeonai.xyz',
      'https://zeon.vercel.app'
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  });
  
  app.use(express.json({ limit: '10mb' }));

  // Agent will be initialized in the background after the server starts
  let agent: Awaited<ReturnType<typeof startAgent>> | null = null;

  // Health check endpoint with balance status
  app.get('/health', async (_req, res) => {
    let balanceInfo = { balance: 'unknown', status: 'unknown' };
    
    if (globalBalanceManager) {
      try {
        const balance = await globalBalanceManager.getCurrentBalance();
        const isBalanceSufficient = await globalBalanceManager.isBalanceSufficient();
        balanceInfo = {
          balance: `${balance} ETH`,
          status: isBalanceSufficient ? 'sufficient' : 'low'
        };
      } catch (error) {
        balanceInfo.status = 'error';
      }
    }
    
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      agent: agent ? 'ready' : 'initializing',
      network: NETWORK_ID,
      balance: balanceInfo
    });
  });

  // Basic info endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'Zeon Fundraising Agent',
      status: 'running',
      agent: agent ? 'ready' : 'initializing',
      network: NETWORK_ID,
      timestamp: new Date().toISOString()
    });
  });

  // Chat endpoint handler function
  const handleChatRequest = async (req: any, res: any) => {
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    let { message, sessionId, walletAddress } = req.body;
    
    // Handle different field name variations
    message = message || req.body.text || req.body.content || req.body.query;
    sessionId = sessionId || req.body.session_id || req.body.userId || req.body.user_id || req.body.id || walletAddress || 'default-session';
    
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
      console.log(`🔄 Processing message: "${message}" for session: ${sessionId}`);
      const startTime = Date.now();
      const response = await agent.handleMessage(message, sessionId);
      const processingTime = Date.now() - startTime;
      
      console.log(`⚡ Processing time: ${processingTime}ms`);
      console.log(`✅ Response generated: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
      
      // Get current balance status for metadata
      let balanceStatus = { ready: true, balance: 'unknown' };
      if (globalBalanceManager) {
        try {
          const balance = await globalBalanceManager.getCurrentBalance();
          const isReady = await globalBalanceManager.isBalanceSufficient();
          balanceStatus = { ready: isReady, balance: `${balance} ETH` };
        } catch (error) {
          console.warn("Could not get balance status for response metadata");
        }
      }
      
      res.send({ 
        response,
        metadata: {
          processingTime,
          sessionId,
          timestamp: new Date().toISOString(),
          network: NETWORK_ID,
          balance: balanceStatus
        }
      });
    } catch (error) {
      console.error("❌ Error handling API message:", error);
      
      if (error instanceof Error) {
        console.error("❌ API Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
      }
      
      res.status(500).send({ 
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // API endpoints
  app.post('/api/chat', handleChatRequest);

  // NEW: Fundraiser creation endpoint
  app.post('/api/fundraiser', async (req, res) => {
    console.log('📝 Fundraiser creation request:', JSON.stringify(req.body, null, 2));
    
    const { walletAddress, goalAmount, fundraiserName, description, userWallet } = req.body;
    
    if (!walletAddress || !goalAmount || !fundraiserName) {
      return res.status(400).json({ 
        error: 'Missing required fields: walletAddress, goalAmount, fundraiserName',
        received: req.body
      });
    }
    
    try {
      console.log(`🎯 Creating fundraiser "${fundraiserName}" for ${goalAmount} ETH`);
      
      // Get fundraiser status with enhanced formatting
      const fundraiserStatus = await getFundraiserStatus(
        walletAddress,
        fundraiserName,
        goalAmount,
        description
      );
      
      // Generate sharing link
      const sharingLink = generateFundraiserLink(
        walletAddress,
        goalAmount,
        fundraiserName,
        description
      );
      
      console.log(`✅ Fundraiser created with link: ${sharingLink}`);
      
      res.json({ 
        response: fundraiserStatus.formattedResponse,
        fundraiserLink: sharingLink,
        walletAddress,
        goalAmount,
        fundraiserName,
        description,
        currentAmount: fundraiserStatus.currentAmount,
        contributors: fundraiserStatus.contributors,
        metadata: {
          timestamp: new Date().toISOString(),
          network: NETWORK_ID
        }
      });
    } catch (error) {
      console.error("❌ Error creating fundraiser:", error);
      
      res.status(500).json({ 
        error: 'Failed to create fundraiser',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Corrected QR code generation endpoint
  app.get('/api/qr-code', async (req, res) => {
    console.log('📱 QR code generation request:', JSON.stringify(req.query, null, 2));
    
    const { walletAddress, amount, fundraiserName } = req.query;
    
    if (!walletAddress || !amount || !fundraiserName) {
      return res.status(400).json({ 
        error: 'Missing required fields: walletAddress, amount, fundraiserName',
        received: req.query
      });
    }
    
    try {
      console.log(`🎯 Generating QR code image for ${amount} ETH contribution to "${fundraiserName}"`);
      
      // Use the new crypto QR data generator for better wallet compatibility
      const paymentData = generateCryptoQRData(walletAddress as string, amount as string);
      
      // Generate QR code as a buffer
      const qrPngBuffer = await QRCode.toBuffer(paymentData, {
        type: 'png',
        width: 256,
        margin: 2,
        errorCorrectionLevel: 'M'
      });
      
      console.log(`✅ QR code image generated successfully (${qrPngBuffer.length} bytes)`);
      
      // Send the buffer as a PNG image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.send(qrPngBuffer);

    } catch (error) {
      console.error("❌ Error generating QR code image:", error);
      
      res.status(500).json({ 
        error: 'Failed to generate QR code image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // NEW: Fundraiser status endpoint
  app.get('/api/fundraiser/:address', async (req, res) => {
    console.log('📊 Fundraiser status request for:', req.params.address);
    
    const { address } = req.params;
    const { name, goal, description } = req.query;
    
    if (!address || !name || !goal) {
      return res.status(400).json({ 
        error: 'Missing required parameters: name, goal',
        received: { address, name, goal, description }
      });
    }
    
    try {
      console.log(`📊 Getting status for fundraiser "${name}"`);
      
      const status = await getFundraiserStatus(
        address as string,
        name as string,
        goal as string,
        description as string
      );
      
      console.log(`✅ Status retrieved: ${status.currentAmount} ETH raised`);
      
      res.json({ 
        ...status,
        walletAddress: address,
        metadata: {
          timestamp: new Date().toISOString(),
          network: NETWORK_ID
        }
      });
    } catch (error) {
      console.error("❌ Error getting fundraiser status:", error);
      
      res.status(500).json({ 
        error: 'Failed to get fundraiser status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Start the server
  app.listen(PORT, async () => {
    console.log(`🌐 Server running on port ${PORT}`);
    
    // Initialize agent in background
    try {
      agent = await startAgent();
      console.log("✅ Agent initialization complete!");
    } catch (error) {
      console.error("❌ Failed to initialize agent:", error);
    }
  });
}

// Start the service
main().catch(console.error); 