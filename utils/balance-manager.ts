import { CdpWalletProvider } from "@coinbase/agentkit";

interface BalanceConfig {
  minimumBalance: string; // Minimum ETH balance to maintain (in ETH string format)
  targetBalance: string; // Target balance after topping up (in ETH string format) 
  recheckIntervalMs: number; // How often to check balance in milliseconds
}

interface BalanceStatus {
  currentBalance: string;
  isLowBalance: boolean;
  lastChecked: Date;
  lastLowBalanceAlert?: Date;
}

export class BalanceManager {
  private provider: CdpWalletProvider;
  private config: BalanceConfig;
  private status: BalanceStatus;
  private monitoringInterval?: NodeJS.Timeout;
  private balanceCache: { balance: string; timestamp: number } | null = null;
  private readonly CACHE_DURATION_MS = 30000; // 30 seconds cache

  constructor(provider: CdpWalletProvider, config?: Partial<BalanceConfig>) {
    this.provider = provider;
    this.config = {
      minimumBalance: "0.001", // 0.001 ETH minimum
      targetBalance: "0.005", // 0.005 ETH target
      recheckIntervalMs: 60000, // Check every minute
      ...config
    };
    
    this.status = {
      currentBalance: "0",
      isLowBalance: true,
      lastChecked: new Date(),
    };
  }

  /**
   * Get current wallet balance with caching
   */
  async getCurrentBalance(useCache: boolean = true): Promise<string> {
    const now = Date.now();
    
    // Return cached balance if still valid
    if (useCache && this.balanceCache && (now - this.balanceCache.timestamp) < this.CACHE_DURATION_MS) {
      return this.balanceCache.balance;
    }

    try {
      // Get balance from provider - returns bigint directly
      const balanceBigInt = await this.provider.getBalance();
      
      // Convert bigint to ETH string (assuming balance is in wei)
      const balanceInWei = balanceBigInt.toString();
      const balanceInEth = (Number(balanceInWei) / 1e18).toFixed(6);
      
      // Update cache
      this.balanceCache = {
        balance: balanceInEth,
        timestamp: now
      };

      // Update status
      this.status.currentBalance = balanceInEth;
      this.status.lastChecked = new Date();
      this.status.isLowBalance = parseFloat(balanceInEth) < parseFloat(this.config.minimumBalance);

      console.log(`💰 Current balance: ${balanceInEth} ETH (Low: ${this.status.isLowBalance})`);
      
      return balanceInEth;
    } catch (error) {
      console.error("❌ Error getting balance:", error);
      // Return cached balance if available, otherwise return "0"
      return this.balanceCache?.balance || "0";
    }
  }

  /**
   * Check if current balance is sufficient for operations
   */
  async isBalanceSufficient(useCache: boolean = true): Promise<boolean> {
    const balance = await this.getCurrentBalance(useCache);
    return parseFloat(balance) >= parseFloat(this.config.minimumBalance);
  }

  /**
   * Check balance and return status with message if low
   */
  async ensureSufficientBalance(): Promise<{ ready: boolean; message?: string }> {
    const currentBalance = await this.getCurrentBalance(false); // Always check fresh balance
    const balanceNum = parseFloat(currentBalance);
    const minimumNum = parseFloat(this.config.minimumBalance);

    console.log(`🔍 Balance check: ${balanceNum} ETH (need: ${minimumNum} ETH)`);

    if (balanceNum >= minimumNum) {
      return { ready: true };
    }

    // Balance is low - update alert timestamp
    this.status.lastLowBalanceAlert = new Date();
    
    const walletAddress = await this.provider.getAddress();
    return { 
      ready: false, 
      message: `I need more ETH for transaction fees. Current balance: ${currentBalance} ETH (need: ${this.config.minimumBalance} ETH). Please send ETH to my wallet address: ${walletAddress}`
    };
  }

  /**
   * Start monitoring balance in background
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    console.log(`🔄 Starting balance monitoring (check every ${this.config.recheckIntervalMs / 1000}s)`);
    
    // Initial balance check
    this.getCurrentBalance(false);

    this.monitoringInterval = setInterval(async () => {
      try {
        const balance = await this.getCurrentBalance(false);
        const isLow = parseFloat(balance) < parseFloat(this.config.minimumBalance);
        
        if (isLow) {
          const now = new Date();
          const lastAlert = this.status.lastLowBalanceAlert;
          const timeSinceLastAlert = lastAlert ? now.getTime() - lastAlert.getTime() : 0;
          
          // Only log low balance alert every 5 minutes to avoid spam
          if (!lastAlert || timeSinceLastAlert > 300000) {
            console.log(`⚠️ Low balance detected: ${balance} ETH (minimum: ${this.config.minimumBalance} ETH)`);
            this.status.lastLowBalanceAlert = now;
          }
        }
      } catch (error) {
        console.error("❌ Error in balance monitoring:", error);
      }
    }, this.config.recheckIntervalMs);
  }

  /**
   * Stop monitoring balance
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log("🛑 Balance monitoring stopped");
    }
  }

  /**
   * Get current status
   */
  getStatus(): BalanceStatus {
    return { ...this.status };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BalanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("⚙️ Balance manager configuration updated:", this.config);
  }

  /**
   * Get wallet address for external funding
   */
  async getWalletAddress(): Promise<string> {
    return await this.provider.getAddress();
  }
}

export default BalanceManager;
