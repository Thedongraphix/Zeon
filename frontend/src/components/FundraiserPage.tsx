import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { 
  WalletIcon,
  QrCodeIcon,
  ArrowTopRightOnSquareIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import QRCode from 'qrcode';

interface FundraiserPageProps {
  walletAddress: string;
  goalAmount: string;
  fundraiserName: string;
  description?: string;
  currentAmount?: string;
  contributors?: Array<{
    address: string;
    amount: string;
    timestamp: Date;
  }>;
}

const FundraiserPage: React.FC<FundraiserPageProps> = ({
  walletAddress,
  goalAmount,
  fundraiserName,
  description,
  currentAmount = "0",
  contributors = []
}) => {
  const { login, user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [contributionAmount, setContributionAmount] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [isContributing, setIsContributing] = useState(false);

  const wallet = wallets[0];
  const progressPercentage = Math.min((parseFloat(currentAmount) / parseFloat(goalAmount)) * 100, 100);

  // Generate QR code for contribution
  const generateQRCode = async (amount: string) => {
    try {
      const chainId = 84532; // Base Sepolia
      const amountInWei = (parseFloat(amount) * Math.pow(10, 18)).toString();
      const ethereumUri = `ethereum:${walletAddress}@${chainId}?value=${amountInWei}`;
      
      const qrCodeDataUrl = await QRCode.toDataURL(ethereumUri, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeData(qrCodeDataUrl);
      setShowQR(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  // Generate Coinbase Wallet deep link
  const generateCoinbaseWalletLink = (amount: string) => {
    try {
      const chainId = 84532;
      const amountInWei = (parseFloat(amount) * Math.pow(10, 18)).toString();
      const ethereumUri = `ethereum:${walletAddress}@${chainId}?value=${amountInWei}`;
      const encodedUri = encodeURIComponent(ethereumUri);
      return `https://go.cb-w.com/dapp?cb_url=${encodedUri}`;
    } catch (error) {
      console.error('Error generating Coinbase Wallet link:', error);
      return null;
    }
  };

  // Removed copy functionality to fix link clickability

  const handleContribute = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      alert('Please enter a valid contribution amount');
      return;
    }

    setIsContributing(true);
    
    try {
      // Generate QR code for mobile users
      await generateQRCode(contributionAmount);
      
      // For desktop users with wallet connected, attempt direct transaction
      if (wallet && window.ethereum) {
        const amountInWei = (parseFloat(contributionAmount) * Math.pow(10, 18)).toString();
        
        const transactionParameters = {
          to: walletAddress,
          value: '0x' + parseInt(amountInWei).toString(16),
          chainId: '0x14A34', // Base Sepolia chain ID in hex
        };

        // Request transaction
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [transactionParameters],
        });

        console.log('Transaction sent:', txHash);
        alert('Transaction sent successfully! Check your wallet for confirmation.');
      }
    } catch (error) {
      console.error('Error contributing:', error);
      alert('Error processing contribution. Please try again.');
    } finally {
      setIsContributing(false);
    }
  };

  const baseScanUrl = `https://sepolia.basescan.org/address/${walletAddress}`;
  const coinbaseWalletLink = contributionAmount ? generateCoinbaseWalletLink(contributionAmount) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🚀 {fundraiserName}
          </h1>
          {description && (
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        {/* Progress Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <span className="text-blue-100">*Progress*</span>
            <span className="text-white font-bold">{progressPercentage.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-white">
            <span>*Raised:* {currentAmount} ETH</span>
            <span>*Goal:* {goalAmount} ETH</span>
          </div>
        </div>

        {/* Contribution Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <WalletIcon className="h-6 w-6 mr-2" />
            Contribute to this fundraiser
          </h2>

          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-blue-100 mb-2">*Contribution Amount (ETH)*</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="0.1"
                  className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
                <span className="absolute right-3 top-3 text-gray-400">ETH</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 flex-wrap">
              {['0.01', '0.05', '0.1', '0.5'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setContributionAmount(amount)}
                  className="bg-blue-600/50 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  {amount} ETH
                </button>
              ))}
            </div>

            {/* Contribute Button */}
            <button
              onClick={handleContribute}
              disabled={isContributing || !contributionAmount}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isContributing ? (
                'Processing...'
              ) : authenticated ? (
                `Contribute ${contributionAmount || '0'} ETH`
              ) : (
                'Connect Wallet to Contribute'
              )}
            </button>

            {/* Mobile QR Code Options */}
            {contributionAmount && (
              <div className="space-y-3">
                <button
                  onClick={() => generateQRCode(contributionAmount)}
                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/30 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <QrCodeIcon className="h-5 w-5" />
                  Generate QR Code for Mobile
                </button>

                {coinbaseWalletLink && (
                  <a
                    href={coinbaseWalletLink}
                    className="w-full bg-blue-600/50 hover:bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                    Open in Coinbase Wallet
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* QR Code Modal */}
        {showQR && qrCodeData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Scan to Contribute
              </h3>
              
              <div className="flex justify-center mb-4">
                <img 
                  src={qrCodeData} 
                  alt="Contribution QR Code"
                  className="w-64 h-64 border border-gray-200 rounded-lg"
                />
              </div>
              
              <p className="text-gray-600 text-center mb-4">
                Scan with your mobile wallet to contribute {contributionAmount} ETH
              </p>
              
              <button
                onClick={() => setShowQR(false)}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Wallet Details */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">*Fundraiser Details*</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-blue-100">Wallet Address:</span>
              <span className="text-white font-mono text-sm select-all">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-blue-100">Network:</span>
              <span className="text-white">Base Sepolia</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-blue-100">Base Scan:</span>
              <a
                href={baseScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                View on Explorer
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Contributors List */}
        {contributors.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <UsersIcon className="h-6 w-6 mr-2" />
              Contributors ({contributors.length})
            </h3>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {contributors.map((contributor, index) => (
                <div key={index} className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                  <div>
                    <span className="text-white font-mono text-sm">
                      {contributor.address.slice(0, 6)}...{contributor.address.slice(-4)}
                    </span>
                    <div className="text-xs text-blue-200">
                      {contributor.timestamp.toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-green-400 font-bold">
                    {contributor.amount} ETH
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default FundraiserPage; 