require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: '.env.local' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    "base-sepolia": {
      url: "https://sepolia.base.org",
      accounts: process.env.WALLET_KEY ? [process.env.WALLET_KEY] : [],
      gasPrice: 1000000000,
    },
  },
  etherscan: {
    apiKey: {
     "base-sepolia": process.env.BASESCAN_API_KEY || "dummy"
    }
  }
}; 