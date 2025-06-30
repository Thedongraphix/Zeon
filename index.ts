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
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import QRCode from 'qrcode';

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

console.log("🔧 Validating environment variables...");

// Simple environment validation function
function validateEnvironment(requiredVars: string[]) {
  const missing = [];
  const result: Record<string, string> = {};
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else {
      result[varName] = value;
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return result;
}

const {
  CDP_API_KEY_ID,
  CDP_API_KEY_SECRET,
  NETWORK_ID,
  OPENROUTER_API_KEY,
} = validateEnvironment([
  "CDP_API_KEY_ID",
  "CDP_API_KEY_SECRET",
  "NETWORK_ID",
  "OPENROUTER_API_KEY",
]);

console.log("✅ Environment variables validated:", {
  CDP_API_KEY_ID: CDP_API_KEY_ID || 'MISSING',
  CDP_API_KEY_SECRET: CDP_API_KEY_SECRET ? 'SET' : 'MISSING',
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
    model: "meta-llama/llama-3.1-8b-instruct:free",
    apiKey: OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });

  // Configure CDP with wallet provider for the user
  const walletData = getWalletData(userId);
  
  const provider = await CdpWalletProvider.configureWithWallet({
    apiKeyId: CDP_API_KEY_ID,
    apiKeySecret: CDP_API_KEY_SECRET,
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

  // Get the AgentKit tools
  const agentKit = await AgentKit.from({
    walletProvider: provider,
    actionProviders: [
      cdpApiActionProvider({
        apiKeyId: CDP_API_KEY_ID,
        apiKeySecret: CDP_API_KEY_SECRET,
      }),
      cdpWalletActionProvider({
        apiKeyId: CDP_API_KEY_ID,
        apiKeySecret: CDP_API_KEY_SECRET,
      }),
      erc20ActionProvider(),
      walletActionProvider(),
    ],
  });

  // Get LangChain-compatible tools
  const tools = await getLangChainTools(agentKit);
  console.log(`🛠️  Loaded ${tools.length} tools for AgentKit`);

  // Create memory saver
  let memory = memoryStore[userId];
  if (!memory) {
    memory = new MemorySaver();
    memoryStore[userId] = memory;
    console.log(`🧠 Created new memory store for user: ${userId}`);
  }

  // Create system prompt
  const systemPrompt = `You are Zeon, an AI agent specialized in helping users with cryptocurrency fundraising and wallet management.

Your capabilities include:
- Creating and managing cryptocurrency wallets
- Helping with token transfers and transactions
- Generating QR codes for easy payments
- Providing guidance on fundraising strategies
- Explaining blockchain and cryptocurrency concepts

Key features:
- You operate on the ${NETWORK_ID} network
- You can create secure wallets for users
- You can generate QR codes for donations
- You maintain conversation memory across sessions

Important guidelines:
- Always prioritize security and user education
- Explain technical concepts in simple terms
- Provide clear step-by-step guidance
- Ask clarifying questions when needed
- Be helpful, friendly, and professional

Current user: ${userId}
Wallet Address: ${walletAddress}
Network: ${NETWORK_ID}

Remember to always verify addresses and amounts before executing transactions.`;

  // Create the agent
  const agent = createReactAgent({
    llm,
    tools,
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
      
      // Provide more specific error messages
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

  // Agent will be initialized in the background after the server starts
  let agent: Awaited<ReturnType<typeof startAgent>> | null = null;

  // Health check endpoint
  app.get('/health', (_req, res) => {
      res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      agent: agent ? 'ready' : 'initializing',
      network: NETWORK_ID
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
      
      res.send({ 
        response,
        metadata: {
          processingTime,
          sessionId,
          timestamp: new Date().toISOString(),
          network: NETWORK_ID
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