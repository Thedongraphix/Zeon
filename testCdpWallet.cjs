require('dotenv').config();
const { CdpWalletProvider } = require('@coinbase/agentkit');

async function testCdpWallet() {
  try {
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
      networkId: process.env.NETWORK_ID || 'base-sepolia',
    };
    console.log('Testing CDP Wallet Provider with config:', {
      apiKeyName: config.apiKeyName,
      apiKeyPrivateKeyIsSet: !!config.apiKeyPrivateKey,
      privateKeyLength: config.apiKeyPrivateKey?.length,
      networkId: config.networkId,
    });
    const walletProvider = await CdpWalletProvider.configureWithWallet(config);
    console.log('✅ CDP Wallet initialized successfully:', walletProvider);
  } catch (error) {
    console.error('❌ Failed to initialize CDP Wallet:', error);
    if (error.response) {
      console.error('API Error Response:', error.response.data);
    }
  }
}

testCdpWallet();
