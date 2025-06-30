import { generatePrivateKey } from "viem/accounts";
import { getRandomValues } from "node:crypto";
import fs from "node:fs";

/**
 * Generate a random encryption key
 * @returns The encryption key as a hex string
 */
function generateEncryptionKeyHex(): string {
  const uint8Array = getRandomValues(new Uint8Array(32));
  const hex = Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hex;
}

/**
 * Generate CDP API configuration and append to .env file
 */
function generateKeys(): void {
  const walletKey = generatePrivateKey();
  const encryptionKey = generateEncryptionKeyHex();
  
  console.log("🔑 Generated Keys for CDP AgentKit:");
  console.log(`📝 Wallet Key: ${walletKey}`);
  console.log(`🔐 Encryption Key: ${encryptionKey}`);
  
  // Append to .env file
  const envContent = `
# Generated CDP AgentKit Configuration
WALLET_KEY=${walletKey}
ENCRYPTION_KEY=${encryptionKey}
NETWORK_ID=base-sepolia
`;

  try {
    fs.appendFileSync(".env", envContent);
    console.log("✅ Keys appended to .env file");
    console.log("⚠️  Please add your API credentials:");
    console.log("   CDP_API_KEY_NAME=your_cdp_api_key_name");
    console.log("   CDP_API_KEY_PRIVATE_KEY=your_cdp_private_key");
    console.log("   OPENROUTER_API_KEY=your_openrouter_api_key");
  } catch (error) {
    console.error("❌ Failed to write to .env file:", error);
    console.log("📋 Please manually add these to your .env file:");
    console.log(envContent);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateKeys();
}

export { generateKeys, generateEncryptionKeyHex }; 