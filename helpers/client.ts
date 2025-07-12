import { getRandomValues } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { IdentifierKind, type Signer, type Client } from "@xmtp/node-sdk";
import { fromString, toString } from "uint8arrays";
import { createWalletClient, http, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

interface User {
  key: `0x${string}`;
  account: ReturnType<typeof privateKeyToAccount>;
  wallet: ReturnType<typeof createWalletClient>;
}

export const createUser = (key: `0x${string}`): User => {
  const accountKey = key;
  const account = privateKeyToAccount(accountKey);
  return {
    key: accountKey,
    account,
    wallet: createWalletClient({
      account,
      chain: sepolia,
      transport: http(),
    }),
  };
};

export const createSigner = (key: `0x${string}`): Signer => {
  const user = createUser(key);
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifierKind: IdentifierKind.Ethereum,
      identifier: user.account.address.toLowerCase(),
    }),
    signMessage: async (message: string) => {
      const signature = await user.wallet.signMessage({
        message,
        account: user.account,
      });
      return toBytes(signature);
    },
  };
};

/**
 * Generate a random encryption key
 * @returns The encryption key as a hex string with 0x prefix
 */
export const generateEncryptionKeyHex = () => {
  /* Generate a random 32-byte encryption key */
  const uint8Array = getRandomValues(new Uint8Array(32));
  /* Convert the encryption key to a hex string */
  const hex = Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
};

/**
 * Get the encryption key from a hex string
 * @param hex - The hex string
 * @returns The encryption key
 */
export const getEncryptionKeyFromHex = (hex: string) => {
  /* Remove 0x prefix if present and convert the hex string to an encryption key */
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return fromString(cleanHex, "hex");
};

/**
 * Generate a random wallet private key
 * @returns The private key as a hex string with 0x prefix
 */
export const generatePrivateKeyHex = () => {
  /* Generate a random 32-byte private key */
  const uint8Array = getRandomValues(new Uint8Array(32));
  /* Convert the private key to a hex string */
  const hex = Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
};

/**
 * Log agent details for monitoring and debugging
 * @param client - The XMTP client instance
 */
export const logAgentDetails = async (client: Client) => {
  try {
    const inboxState = await client.preferences.inboxState();
    const address = inboxState.identifiers[0]?.identifier || 'Unknown';
    const inboxId = client.inboxId;
    const installationId = client.installationId;
    const conversations = await client.conversations.list();

    console.log(`
✓ XMTP Client:
• InboxId: ${inboxId}
• Address: ${address}
• Conversations: ${conversations.length}
• Installations: ${inboxState.installations.length}
• InstallationId: ${installationId}
• Network: ${process.env.XMTP_ENV || 'dev'}`);
  } catch (error) {
    console.error('Error logging agent details:', error);
  }
};

/**
 * Validate environment variables
 * @param vars - Array of required environment variable names
 * @returns Object containing the environment variables
 */
export function validateEnvironment(vars: string[]): Record<string, string> {
  const missing = vars.filter((v) => !process.env[v]);

  if (missing.length) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const envVars = fs
          .readFileSync(envPath, "utf-8")
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
          .reduce<Record<string, string>>((acc, line) => {
            const [key, ...val] = line.split("=");
            if (key && val.length) acc[key.trim()] = val.join("=").trim();
            return acc;
          }, {});

        missing.forEach((v) => {
          if (envVars[v]) process.env[v] = envVars[v];
        });
      }
    } catch (e) {
      console.error(e);
      /* ignore errors */
    }

    const stillMissing = vars.filter((v) => !process.env[v]);
    if (stillMissing.length) {
      console.error("Missing env vars:", stillMissing.join(", "));
      process.exit(1);
    }
  }

  return vars.reduce<Record<string, string>>((acc, key) => {
    acc[key] = process.env[key] as string;
    return acc;
  }, {});
}

/**
 * Get storage path for application data
 * @param description - Description of the data being stored
 * @returns Path to the storage directory
 */
export const getStoragePath = (description: string = "data") => {
  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH ?? ".data";
  // Create directory if it doesn't exist
  if (!fs.existsSync(volumePath)) {
    fs.mkdirSync(volumePath, { recursive: true });
  }
  return path.join(volumePath, `${description}`);
};

/**
 * Get database path for XMTP client storage
 * @param env - Environment (dev, production, etc.)
 * @param suffix - Database suffix
 * @returns Database file path
 */
export const getDbPath = (env: string, suffix: string = "xmtp") => {
  const volumePath = getStoragePath("xmtp");
  const dbPath = `${volumePath}/${env}-${suffix}.db3`;
  return dbPath;
};

