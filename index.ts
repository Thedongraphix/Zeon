import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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
    console.warn(`Missing environment variables (will continue anyway): ${missing.join(', ')}`);
  }
  
  return result;
}

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

/**
 * Simple message handler that returns a basic response
 */
async function handleMessage(
  messageContent: string,
  userId: string,
): Promise<string> {
  console.log(`📩 Received message from user ${userId}: "${messageContent}"`);
  
  // For now, just return a simple response
  return `Hello! I'm Zeon, your AI fundraising assistant. You said: "${messageContent}". I'm currently in basic mode while we focus on AgentKit functionality. Network: ${NETWORK_ID || 'base-sepolia'}`;
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

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      agent: 'ready',
      network: NETWORK_ID || 'base-sepolia',
      version: 'simple-mode'
    });
  });

  // Basic info endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'Zeon Fundraising Agent',
      status: 'running',
      agent: 'ready',
      network: NETWORK_ID || 'base-sepolia',
      timestamp: new Date().toISOString(),
      mode: 'simple'
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
    
    try {
      console.log(`🔄 Processing message: "${message}" for session: ${sessionId}`);
      const startTime = Date.now();
      const response = await handleMessage(message, sessionId);
      const processingTime = Date.now() - startTime;
      
      console.log(`⚡ Processing time: ${processingTime}ms`);
      console.log(`✅ Response generated: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
      
      res.send({ 
        response,
        metadata: {
          processingTime,
          sessionId,
          timestamp: new Date().toISOString(),
          network: NETWORK_ID || 'base-sepolia',
          mode: 'simple'
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
    console.log(`
🚀 Zeon Fundraising Agent started in Simple Mode!
⛓️  Network: ${NETWORK_ID || 'base-sepolia'}
🎯 API endpoints ready!
📍 Health check: http://localhost:${PORT}/health
💬 Chat endpoint: http://localhost:${PORT}/api/chat
    `);
  });
}

// Start the service
main().catch(console.error); 