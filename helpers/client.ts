import { getRandomValues } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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

