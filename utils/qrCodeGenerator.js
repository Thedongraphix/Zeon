/**
 * QR Code Generation Utilities
 * Generates absolute URLs for QR codes that work across all contexts
 */

// Configuration for different environments
const QR_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000',
    apiPath: '/api/qr-code'
  },
  production: {
    baseURL: 'https://zeonai.xyz',
    apiPath: '/api/qr-code'
  }
};

/**
 * Gets the current environment configuration
 * @returns {Object} Environment-specific configuration
 */
function getEnvironmentConfig() {
  // Detect environment - adjust this based on your setup
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       (typeof window !== 'undefined' && window?.location?.hostname === 'localhost');
  
  return isDevelopment ? QR_CONFIG.development : QR_CONFIG.production;
}

/**
 * Generates an absolute URL for QR code image
 * @param {string} walletAddress - Wallet address for donations
 * @param {string|number} amount - Donation amount in ETH
 * @param {string} fundraiserName - Name of the fundraiser
 * @returns {string} Absolute URL for QR code image
 */
export function generateQRCodeURL(walletAddress, amount, fundraiserName) {
  const config = getEnvironmentConfig();
  
  // Create URL object for proper parameter encoding
  const qrURL = new URL(`${config.baseURL}${config.apiPath}`);
  
  // Add parameters - URL API handles encoding automatically
  qrURL.searchParams.set('walletAddress', walletAddress);
  qrURL.searchParams.set('amount', amount.toString());
  qrURL.searchParams.set('fundraiserName', fundraiserName);
  
  // Optional: Add network parameter for Base Sepolia
  qrURL.searchParams.set('network', 'base-sepolia');
  qrURL.searchParams.set('chainId', '84532');
  
  return qrURL.toString();
}

/**
 * Generates a crypto-specific QR code data URL
 * This creates an Ethereum URI that wallets can directly interpret
 * @param {string} walletAddress - Wallet address
 * @param {string|number} amount - Amount in ETH
 * @returns {string} Ethereum URI for QR encoding
 */
export function generateCryptoQRData(walletAddress, amount) {
  // Convert ETH to Wei (1 ETH = 10^18 Wei)
  const amountInWei = (parseFloat(amount) * 1e18).toString();
  
  // Create Ethereum URI following EIP-681
  // This format is recognized by most crypto wallets
  const ethereumURI = `ethereum:${walletAddress}@84532?value=${amountInWei}`;
  
  return ethereumURI;
}

/**
 * Validates that a QR code URL is absolute and accessible
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid and absolute
 */
export function validateQRCodeURL(url) {
  try {
    const urlObj = new URL(url);
    
    // Check that it's using HTTPS in production
    if (urlObj.hostname !== 'localhost' && urlObj.protocol !== 'https:') {
      console.warn('QR code URL should use HTTPS in production');
      return false;
    }
    
    // Ensure it's an absolute URL
    return urlObj.href.startsWith('http');
  } catch (error) {
    console.error('Invalid QR code URL:', error);
    return false;
  }
} 