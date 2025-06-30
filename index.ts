import * as fs from "fs";
import {
  AgentKit,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  CdpWalletProvider,
  erc20ActionProvider,
  walletActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import {
  createSigner,
  getEncryptionKeyFromHex,
  logAgentDetails,
  validateEnvironment,
} from "./helpers/client.js";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import {
  Client,
  type Conversation,
  type DecodedMessage,
  type XmtpEnv,
} from "@xmtp/node-sdk";
import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';

console.log("🔧 Validating environment variables...");
const {
  WALLET_KEY,
  ENCRYPTION_KEY,
  XMTP_ENV,
  CDP_API_KEY_NAME,
  CDP_API_KEY_PRIVATE_KEY,
  NETWORK_ID,
  OPENROUTER_API_KEY,
} = validateEnvironment([
  "WALLET_KEY",
  "ENCRYPTION_KEY",
  "XMTP_ENV",
  "CDP_API_KEY_NAME",
  "CDP_API_KEY_PRIVATE_KEY",
  "NETWORK_ID",
  "OPENROUTER_API_KEY",
]);

console.log("✅ Environment variables validated:", {
  WALLET_KEY: WALLET_KEY ? `${WALLET_KEY.substring(0, 10)}...` : 'MISSING',
  ENCRYPTION_KEY: ENCRYPTION_KEY ? `${ENCRYPTION_KEY.substring(0, 10)}...` : 'MISSING',
  XMTP_ENV: XMTP_ENV || 'MISSING',
  CDP_API_KEY_NAME: CDP_API_KEY_NAME || 'MISSING',
  CDP_API_KEY_PRIVATE_KEY: CDP_API_KEY_PRIVATE_KEY ? 'SET' : 'MISSING',
  NETWORK_ID: NETWORK_ID || 'MISSING',
  OPENROUTER_API_KEY: OPENROUTER_API_KEY ? `${OPENROUTER_API_KEY.substring(0, 10)}...` : 'MISSING'
});

// Storage constants
const XMTP_STORAGE_DIR = ".data/xmtp";
const WALLET_STORAGE_DIR = ".data/wallet";

// Global stores for memory and agent instances
const memoryStore: Record<string, MemorySaver> = {};
const agentStore: Record<string, Agent> = {};

interface AgentConfig {
  configurable: {
    thread_id: string;
  };
}

type Agent = ReturnType<typeof createReactAgent>;

// NEW: Agent will be initialized in the background after the server starts
let agent: Awaited<ReturnType<typeof startAgent>> | null = null;

/**
 * Ensure local storage directory exists
 */
function ensureLocalStorage() {
  if (!fs.existsSync(XMTP_STORAGE_DIR)) {
    fs.mkdirSync(XMTP_STORAGE_DIR, { recursive: true });
  }
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
 * Clear XMTP installation data to avoid installation limit
 */
function clearXmtpInstallations() {
  try {
    if (fs.existsSync(XMTP_STORAGE_DIR)) {
      const files = fs.readdirSync(XMTP_STORAGE_DIR);
      for (const file of files) {
        if (file.endsWith('.db3')) {
          const filePath = `${XMTP_STORAGE_DIR}/${file}`;
          fs.unlinkSync(filePath);
          console.log(`🗑️  Cleared XMTP database: ${file}`);
        }
      }
    }
  } catch (error) {
    console.warn("Could not clear XMTP installations:", error);
  }
}

/**
 * Initialize the XMTP client.
 *
 * @returns An initialized XMTP Client instance
 */
async function initializeXmtpClient() {
  const signer = createSigner(WALLET_KEY);
  const dbEncryptionKey = getEncryptionKeyFromHex(ENCRYPTION_KEY);

  const identifier = await signer.getIdentifier();
  const address = identifier.identifier;

  try {
    const client = await Client.create(signer, {
      dbEncryptionKey,
      env: XMTP_ENV as XmtpEnv,
      dbPath: XMTP_STORAGE_DIR + `/${XMTP_ENV}-${address}`,
    });

    void logAgentDetails(client);

    console.log("✓ Syncing conversations...");
    await client.conversations.sync();

    return client;
  } catch (error: any) {
    if (error.message?.includes("already registered 5/5 installations")) {
      console.log("🔄 XMTP installation limit reached, clearing data and retrying...");
      clearXmtpInstallations();
      
      // Retry after clearing
      const client = await Client.create(signer, {
        dbEncryptionKey,
        env: XMTP_ENV as XmtpEnv,
        dbPath: XMTP_STORAGE_DIR + `/${XMTP_ENV}-${address}`,
      });

      void logAgentDetails(client);

      console.log("✓ Syncing conversations...");
      await client.conversations.sync();

      return client;
    }
    throw error;
  }
}

/**
 * Generate QR code for fundraising campaigns
 */
async function generateFundraiserQR(walletAddress: string, amount?: string): Promise<string> {
  try {
    // Create a payment URL that works with mobile wallets
    const baseUrl = `https://pay.coinbase.com/buy/select-asset`;
    const params = new URLSearchParams({
      destinationAddress: walletAddress,
      blockchainNames: "base",
      assetNames: "USDC",
    });
    
    if (amount) {
      params.append("defaultAmount", amount);
    }
    
    const paymentUrl = `${baseUrl}?${params.toString()}`;
    
    // Generate QR code
    const qrCodeData = await QRCode.toDataURL(paymentUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeData;
            } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Initialize the agent with CDP Agentkit.
 *
 * @param userId - The unique identifier for the user
 * @returns The initialized agent and its configuration
 */
async function initializeAgent(
  userId: string,
): Promise<{ agent: Agent; config: AgentConfig }> {
  try {
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.1,
      apiKey: OPENROUTER_API_KEY,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://github.com/chrisdev/zeon-protocol",
          "X-Title": "Zeon Fundraising Agent"
        }
      },
    });

    const storedWalletData = getWalletData(userId);
    console.log(
      `🔍 Wallet data for ${userId}: ${storedWalletData ? "Found" : "Not found"}`,
    );

    const config = {
      apiKeyName: CDP_API_KEY_NAME,
      apiKeyPrivateKey: CDP_API_KEY_PRIVATE_KEY.replace(/\\n/g, "\n"),
      cdpWalletData: storedWalletData || undefined,
      networkId: NETWORK_ID || "base-sepolia",
    };

    console.log("⚙️  Configuring CDP Wallet Provider with:", {
      apiKeyName: config.apiKeyName,
      apiKeyPrivateKeyIsSet: !!config.apiKeyPrivateKey,
      privateKeyLength: config.apiKeyPrivateKey?.length,
      cdpWalletDataIsSet: !!config.cdpWalletData,
      networkId: config.networkId,
    });

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider({
          apiKeyName: CDP_API_KEY_NAME,
          apiKeyPrivateKey: CDP_API_KEY_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        cdpWalletActionProvider({
          apiKeyName: CDP_API_KEY_NAME,
          apiKeyPrivateKey: CDP_API_KEY_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      ],
    });

    const tools = await getLangChainTools(agentkit);

    memoryStore[userId] = new MemorySaver();

    const agentConfig: AgentConfig = {
      configurable: { thread_id: userId },
    };

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memoryStore[userId],
      messageModifier: `
        You are Zeon, a DeFi Fundraising Agent specialized in helping users create and manage cryptocurrency-based fundraising campaigns.
        
        Your core capabilities include:
        🎯 Creating and managing fundraising campaigns
        💰 Handling cryptocurrency transactions on Base Sepolia testnet
        📱 Generating QR codes for easy mobile donations
        🔗 Smart contract interactions for transparent fundraising
        💸 USDC token operations (primary fundraising token)
        📊 Providing campaign analytics and progress tracking
        
        NETWORK INFORMATION:
        - Default network: Base Sepolia testnet
        - Primary token: USDC (Address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e)
        - USDC transactions are gasless on Base
        - You can request testnet funds from the faucet if needed
        
        FUNDRAISING WORKFLOW:
        1. When users want to create a fundraiser, ask for:
           - Campaign title and description
           - Target amount in USDC
           - Campaign duration (if any)
        2. Deploy a simple fundraising smart contract or use your wallet
        3. Generate QR codes for easy mobile donations
        4. Provide shareable links for the campaign
        5. Track and report campaign progress
        
        COMMUNICATION STYLE:
        - Be enthusiastic about helping with fundraising goals
        - Explain crypto concepts in simple terms
        - Always prioritize security and transparency
        - Provide clear instructions for donors
        - Celebrate milestones and achievements
        
        IMPORTANT LIMITATIONS:
        - Only work with legitimate fundraising purposes
        - Always verify wallet addresses before transactions
        - Remind users this is testnet (for testing purposes)
        - For mainnet operations, clearly state the real financial implications
        
        Be helpful, secure, and focused on making cryptocurrency fundraising accessible to everyone!
      `,
    });

    agentStore[userId] = agent;

    const exportedWallet = await walletProvider.exportWallet();
    const walletDataJson = JSON.stringify(exportedWallet);
    saveWalletData(userId, walletDataJson);

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("❌ Failed to initialize agent:", error);
    
    if (error instanceof Error) {
      console.error("❌ Agent initialization error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
    
    throw error;
  }
}

/**
 * Process a message with the agent.
 *
 * @param agent - The agent instance to process the message
 * @param config - The agent configuration
 * @param message - The message to process
 * @returns The processed response as a string
 */
async function processMessage(
  agent: Agent,
  config: AgentConfig,
  message: string,
): Promise<string> {
  let response = "";

  try {
    const stream = await agent.stream(
      { messages: [new HumanMessage(message)] },
      config,
    );

    for await (const chunk of stream) {
      if (chunk && typeof chunk === "object" && "agent" in chunk) {
        const agentChunk = chunk as {
          agent: { messages: Array<{ content: unknown }> };
        };
        response += String(agentChunk.agent.messages[0].content) + "\n";
      }
    }

    // Check if the response contains wallet information and offer to generate QR code
    if (response.includes("wallet") || response.includes("address") || response.includes("donate")) {
      // Extract wallet address from response if possible
      const addressMatch = response.match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) {
        try {
          const qrCode = await generateFundraiserQR(addressMatch[0]);
          response += `\n\n📱 **QR Code for Mobile Donations:**\n![QR Code](${qrCode})\n\nScan this QR code with your mobile wallet to donate easily!`;
        } catch (error) {
          console.error("Error generating QR code:", error);
        }
      }
    }

    return response.trim();
  } catch (error) {
    console.error("❌ Error processing message:", error);
    
    if (error instanceof Error) {
      console.error("❌ Processing error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
      });

    if (error.message.includes("401")) {
      return `❌ Authentication error with AI service. Please check the API configuration.`;
    } else if (error.message.includes("insufficient funds")) {
        return `❌ Insufficient funds! Please make sure you have enough tokens in your wallet for this transaction. You can get testnet USDC from the Base Sepolia faucet.`;
    } else if (error.message.includes("invalid address")) {
        return `❌ Invalid address format! Please provide a valid Ethereum address (starting with 0x).`;
    } else if (error.message.includes("network")) {
      return `❌ Network error! Please check your connection and try again.`;
      } else if (error.message.includes("API")) {
        return `❌ API error: ${error.message}`;
      }
    }

    return `❌ Sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
  }
}

/**
 * Handle incoming messages for API requests
 */
async function handleMessage(
  messageContent: string,
  senderAddress: string,
  client: Client,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<string> {
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
      const result = await initializeAgent(senderAddress);
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
    );
    
    console.log(`🤖 Sending response to ${senderAddress}`);
    
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
    
    console.log("🔧 Initializing XMTP Client...");
    const client = await initializeXmtpClient();
    
    console.log("🎯 Agent is ready!");
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
    throw error;
  }
}

/**
 * Main function to start the service
 */
async function main() {
  // Initialize the Express app
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Request logging middleware
  app.use((req, res, next) => {
    const origin = req.get('origin') || req.get('referer') || 'no-origin';
    console.log(`📍 ${req.method} ${req.path} from origin: ${origin}`);
    next();
  });

  // CORS middleware
  app.use(cors({
    origin: [
      'http://localhost:3000', 
      'https://zeon-frontend.vercel.app', 
        'https://www.zeonai.xyz',
        'https://zeonai.xyz',
      /\.vercel\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
      res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      agent: agent ? 'ready' : 'initializing'
    });
  });

  // Chat endpoint handler function
  const handleChatRequest = async (req: any, res: any) => {
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    let { message, sessionId } = req.body;
    
    // Handle different field name variations
    message = message || req.body.text || req.body.content || req.body.query;
    sessionId = sessionId || req.body.session_id || req.body.userId || req.body.user_id || req.body.id || 'default-session';
    
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
      
      res.send({ 
        response,
        metadata: {
          processingTime,
          sessionId,
          timestamp: new Date().toISOString()
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
