import { generateEncryptionKeyHex, generatePrivateKeyHex } from "../helpers/client.js";
import fs from "fs";
import path from "path";

/**
 * Generate XMTP agent keys
 * This script generates the necessary keys for an XMTP agent
 */
async function generateKeys() {
  console.log("🔑 Generating XMTP agent keys...");

  // Generate wallet private key
  const walletKey = generatePrivateKeyHex();
  
  // Generate encryption key for XMTP database
  const encryptionKey = generateEncryptionKeyHex();

  // Create .env content
  const envContent = `# XMTP Environment Variables
WALLET_KEY=${walletKey}
ENCRYPTION_KEY=${encryptionKey}
XMTP_ENV=dev

# Coinbase AgentKit Configuration
CDP_API_KEY_NAME=organizations/.../apiKeys/...
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC...END EC PRIVATE KEY-----\\n

# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Network Configuration
NETWORK_ID=base-sepolia
`;

  // Write to .env file
  const envPath = path.resolve(process.cwd(), ".env");
  
  try {
    if (fs.existsSync(envPath)) {
      console.log("⚠️  .env file already exists, backing up...");
      fs.copyFileSync(envPath, `${envPath}.backup.${Date.now()}`);
    }
    
    fs.writeFileSync(envPath, envContent);
    
    console.log("✅ Keys generated successfully!");
    console.log(`📝 Created .env file with:`);
    console.log(`   • WALLET_KEY: ${walletKey}`);
    console.log(`   • ENCRYPTION_KEY: ${encryptionKey.substring(0, 10)}...`);
    console.log(`   • XMTP_ENV: dev`);
    console.log("");
    console.log("🔧 Next steps:");
    console.log("1. Add your CDP API key name and private key to .env");
    console.log("2. Add your OpenAI API key to .env");
    console.log("3. Run 'npm run dev' to start your agent");
    
  } catch (error) {
    console.error("❌ Error writing .env file:", error);
    console.log("📝 Please create a .env file manually with the following content:");
    console.log(envContent);
  }
}

// Run the key generation
generateKeys().catch(console.error); 