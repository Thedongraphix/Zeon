import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { 
  PaperAirplaneIcon,
  ClipboardIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import Header from './Header';

interface Message {
  content: string;
  senderAddress: string;
  timestamp: Date;
  id: string;
  error?: boolean;
}

interface ChatInterfaceProps {
  onBack: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack }) => {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const wallet = wallets[0];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const addMessage = useCallback((content: string, senderAddress: string, error: boolean = false) => {
    const newMessage: Message = {
      content,
      senderAddress,
      timestamp: new Date(),
      id: Date.now().toString(),
      error
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const sendMessage = async () => {
    if (!inputValue.trim() || !user?.wallet?.address) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage(userMessage, user.wallet.address);
    setIsTyping(true);

    // Use relative URL for proxy in development, full URL for production
    const apiUrl = process.env.NODE_ENV === 'development' ? '' : 'https://zeon-hybrid.onrender.com';

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(m => ({
            role: isUserMessage(m.senderAddress) ? 'user' : 'assistant',
            content: m.content
          })),
          walletAddress: user.wallet.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error('Invalid response format from server');
      }
      addMessage(data.response, 'agent');
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      addMessage(`Failed to send message: ${errorMessage}`, 'system', true);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: 'Check Balance', command: 'What is my wallet balance?' },
    { label: 'Recent Transactions', command: 'Show my recent transactions' },
    { label: 'Gas Prices', command: 'What are current gas prices?' },
    { label: 'Test QR Code', command: 'Generate a test QR code for debugging' }
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const isUserMessage = (senderAddress: string) => {
    return senderAddress === user?.wallet?.address;
  };

  // Helper function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    }
  };

  // Enhanced helper function to parse agent response (matches backend JSON format)
  const parseAgentResponse = (rawResponse: string) => {
    console.log('🔍 Parsing raw response:', rawResponse);
    
    try {
      // First, try to parse as JSON (backend returns JSON strings for QR responses)
      let parsed = JSON.parse(rawResponse);
      console.log('✅ Successfully parsed JSON:', parsed);
      
      // Check if the parsed result is a string (double-encoded JSON)
      if (typeof parsed === 'string') {
        console.log('🔄 Detected double-encoded JSON, parsing again...');
        try {
          parsed = JSON.parse(parsed);
          console.log('✅ Successfully parsed double-encoded JSON:', parsed);
        } catch (e) {
          console.log('❌ Failed to parse double-encoded JSON');
        }
      }
      
      if (parsed.qrCode && parsed.message) {
        console.log('🎯 Found QR response format');
        console.log('QR Code data length:', parsed.qrCode.length);
        console.log('QR Code starts with:', parsed.qrCode.substring(0, 50));
        
        return {
          type: 'qr_response',
          message: parsed.message,
          qrCodeDataUrl: parsed.qrCode,
          transactionHash: parsed.transactionHash || null
        };
      }
      
      if (parsed.message) {
        console.log('📝 Found JSON message format');
        return {
          type: 'json_message',
          message: parsed.message,
          qrCodeDataUrl: null,
          transactionHash: parsed.transactionHash || null
        };
      }
      
      // If JSON but not in expected format, treat as regular text
      console.log('⚠️ JSON format not recognized, treating as text');
      return {
        type: 'text',
        message: rawResponse,
        qrCodeDataUrl: null,
        transactionHash: null
      };
    } catch (e) {
      console.log('❌ JSON parse failed, checking for markdown QR format');
      // Not JSON, check for embedded QR codes in markdown format
      const qrCodeRegex = /!\[.*?\]\(data:image\/png;base64,([A-Za-z0-9+/=]+)\)/;
      const qrMatch = rawResponse.match(qrCodeRegex);
      
      if (qrMatch) {
        console.log('📱 Found markdown QR format');
        console.log('QR base64 length:', qrMatch[1].length);
        return {
          type: 'markdown_qr',
          message: rawResponse,
          qrCodeDataUrl: `data:image/png;base64,${qrMatch[1]}`,
          transactionHash: null
        };
      }
      
      console.log('📄 No special format detected, treating as plain text');
      return {
        type: 'text',
        message: rawResponse,
        qrCodeDataUrl: null,
        transactionHash: null
      };
    }
  };

  // Helper function to extract transaction hashes from content
  const extractTransactionHash = (content: string) => {
    // Look for transaction hashes (0x followed by 64 hex characters)
    const txHashRegex = /(0x[a-fA-F0-9]{64})/g;
    const matches = content.match(txHashRegex);
    return matches ? matches : [];
  };

  // Helper function to extract wallet address from content
  const extractWalletAddress = (content: string) => {
    // Look for Ethereum addresses (0x followed by 40 hex characters)
    const ethAddressRegex = /(0x[a-fA-F0-9]{40})/g;
    const matches = content.match(ethAddressRegex);
    return matches ? matches[0] : null;
  };

  // Helper function to generate Base Sepolia scan URLs
  const getBaseScanUrl = (hashOrAddress: string, type: 'tx' | 'address' | 'token' = 'tx') => {
    const baseUrl = 'https://sepolia.basescan.org';
    switch (type) {
      case 'tx':
        return `${baseUrl}/tx/${hashOrAddress}`;
      case 'address':
        return `${baseUrl}/address/${hashOrAddress}`;
      case 'token':
        return `${baseUrl}/token/${hashOrAddress}`;
      default:
        return `${baseUrl}/search?q=${hashOrAddress}`;
    }
  };

  // Helper function to generate Coinbase Wallet deep link
  const generateCoinbaseWalletLink = (toAddress: string, amount: string) => {
    try {
      // Base Sepolia Chain ID
      const chainId = 84532;
      
      // Convert ETH amount to wei (multiply by 10^18)
      const amountInWei = (parseFloat(amount) * Math.pow(10, 18)).toString();
      
      // Create ethereum URI format
      const ethereumUri = `ethereum:${toAddress}@${chainId}?value=${amountInWei}`;
      
      // Encode the ethereum URI for Coinbase Wallet deep link
      const encodedUri = encodeURIComponent(ethereumUri);
      
      // Coinbase Wallet deep link format
      const coinbaseWalletLink = `https://go.cb-w.com/dapp?cb_url=${encodedUri}`;
      
      return coinbaseWalletLink;
    } catch (error) {
      console.error('Error generating Coinbase Wallet link:', error);
      return null;
    }
  };

  // Helper function to extract contribution amount from message
  const extractContributionAmount = (message: string) => {
    // Look for patterns like "0.01 ETH", "0.1 ETH", etc.
    const amountRegex = /(\d+\.?\d*)\s*ETH/i;
    const match = message.match(amountRegex);
    return match ? match[1] : null;
  };

  // Enhanced function to render message content with proper QR code and link handling
  const renderMessageContent = (content: string) => {
    // Parse the response to handle JSON format from backend
    const parsedResponse = parseAgentResponse(content);
    
    console.log('Parsed response:', parsedResponse);
    
    // Extract additional data
    const txHashes = extractTransactionHash(parsedResponse.message);
    const walletAddress = extractWalletAddress(parsedResponse.message);
    
    // Handle QR code responses
    if (parsedResponse.type === 'qr_response' && parsedResponse.qrCodeDataUrl) {
      return (
        <div className="message-content">
          {/* Message text */}
          <div className="mb-4 whitespace-pre-wrap break-words overflow-wrap-anywhere">
            {parsedResponse.message}
          </div>
          
                     {/* QR Code Display */}
           <div className="qr-code-container my-4">
             <div className="qr-code-wrapper">
               <div className="qr-code-display">
                 <img 
                   src={parsedResponse.qrCodeDataUrl}
                   alt="QR Code for Transaction"
                   className="qr-code-png"
                   onError={(e) => {
                     console.error('QR Code failed to load');
                     console.error('Invalid URL:', e.currentTarget.src.substring(0, 100) + '...');
                   }}
                   onLoad={() => {
                     console.log('QR Code loaded successfully - Full size 256x256');
                   }}
                 />
               </div>
                             <div className="qr-code-actions">
                 <div className="text-xs text-blue-300 mb-3 text-center">
                   📱 Scan with your mobile wallet to contribute
                 </div>
                 
                 {/* Coinbase Wallet Quick Contribute Link */}
                 {walletAddress && (() => {
                   const contributionAmount = extractContributionAmount(parsedResponse.message);
                   const coinbaseWalletLink = contributionAmount ? generateCoinbaseWalletLink(walletAddress, contributionAmount) : null;
                   
                   return coinbaseWalletLink ? (
                     <div className="coinbase-wallet-link-container mb-4">
                       <a
                         href={coinbaseWalletLink}
                         className="coinbase-wallet-link"
                         title={`Contribute ${contributionAmount} ETH via Coinbase Wallet`}
                       >
                         <div className="coinbase-wallet-icon">
                           <img 
                             src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiMwMDUyRkYiLz4KPHBhdGggZD0iTTEzIDEzSDIwVjE5SDEzVjEzWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+"
                             alt="Coinbase"
                             className="w-5 h-5"
                           />
                         </div>
                         <span className="coinbase-wallet-text">
                           Contribute {contributionAmount} ETH via Coinbase Wallet
                         </span>
                         <span className="external-link-icon">↗</span>
                       </a>
                       <div className="text-xs text-blue-400 mt-1 text-center">
                         Opens Coinbase Wallet with pre-filled transaction
                       </div>
                     </div>
                   ) : null;
                 })()}
                 
                 {/* Transaction Hash Link */}
                 {parsedResponse.transactionHash && (
                   <div className="transaction-link-container mb-3">
                     <a
                       href={getBaseScanUrl(parsedResponse.transactionHash, 'tx')}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="transaction-link"
                     >
                       <span className="transaction-icon">🔍</span>
                       <span className="transaction-text">
                         View on Base Scan: {`${parsedResponse.transactionHash.slice(0, 10)}...${parsedResponse.transactionHash.slice(-8)}`}
                       </span>
                       <span className="external-link-icon">↗</span>
                     </a>
                     <button
                       onClick={() => copyToClipboard(parsedResponse.transactionHash!)}
                       className="transaction-copy-button"
                       title="Copy transaction hash"
                     >
                       <ClipboardIcon className="h-4 w-4" />
                     </button>
                   </div>
                 )}
                 
                 {/* Wallet Address Section */}
                 {walletAddress && (
                   <div className="wallet-address-section">
                     <div className="wallet-address">
                       <span className="address-text">{walletAddress}</span>
                       <button
                         onClick={() => copyToClipboard(walletAddress)}
                         className="copy-button"
                         title="Copy wallet address"
                       >
                         <ClipboardIcon className="h-4 w-4" />
                       </button>
                     </div>
                     <div className="text-xs text-blue-400 mt-1 text-center">
                       Tap to copy wallet address
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
          
          {/* Additional Transaction Links */}
          {txHashes.length > 0 && (
            <div className="mt-3">
              {txHashes.map((txHash, index) => {
                if (txHash === parsedResponse.transactionHash) return null; // Skip if already displayed above
                
                return (
                  <div key={`tx-${index}`} className="transaction-link-container mb-2">
                    <a
                      href={getBaseScanUrl(txHash, 'tx')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transaction-link"
                    >
                      <span className="transaction-icon">🔍</span>
                      <span className="transaction-text">
                        View on Base Scan: {`${txHash.slice(0, 10)}...${txHash.slice(-8)}`}
                      </span>
                      <span className="external-link-icon">↗</span>
                    </a>
                    <button
                      onClick={() => copyToClipboard(txHash)}
                      className="transaction-copy-button"
                      title="Copy transaction hash"
                    >
                      <ClipboardIcon className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    
    // Handle markdown QR codes (fallback)
    if (parsedResponse.type === 'markdown_qr' && parsedResponse.qrCodeDataUrl) {
      const messageWithoutQR = parsedResponse.message.replace(/!\[.*?\]\(data:image\/png;base64,([A-Za-z0-9+/=]+)\)/g, '');
      
      return (
        <div className="message-content">
          {/* Message text without QR markdown */}
          {messageWithoutQR.trim() && (
            <div className="mb-4 whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {messageWithoutQR.trim()}
            </div>
          )}
          
          {/* QR Code Display */}
          <div className="qr-code-container my-4">
            <div className="qr-code-wrapper">
              <div className="qr-code-display">
                <img 
                  src={parsedResponse.qrCodeDataUrl}
                  alt="QR Code"
                  className="qr-code-png"
                  onError={(e) => {
                    console.error('QR Code failed to load');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="qr-code-actions">
                <div className="text-xs text-blue-300 mb-3 text-center">
                  📱 Scan with your mobile wallet
                </div>
                
                {walletAddress && (
                  <div className="wallet-address-section">
                    <div className="wallet-address">
                      <span className="address-text">{walletAddress}</span>
                      <button
                        onClick={() => copyToClipboard(walletAddress)}
                        className="copy-button"
                        title="Copy wallet address"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Transaction Links */}
          {txHashes.length > 0 && renderTransactionLinks(txHashes)}
        </div>
      );
    }
    
    // Handle regular text with potential transaction hashes or wallet addresses
    return renderTextWithLinks(parsedResponse.message, txHashes, walletAddress);
  };

  // Helper function to render transaction links
  const renderTransactionLinks = (txHashes: string[]) => {
    return (
      <div className="mt-3">
        {txHashes.map((txHash, index) => (
          <div key={`tx-link-${index}`} className="transaction-link-container mb-2">
            <a
              href={getBaseScanUrl(txHash, 'tx')}
              target="_blank"
              rel="noopener noreferrer"
              className="transaction-link"
            >
              <span className="transaction-icon">🔍</span>
              <span className="transaction-text">
                View on Base Scan: {`${txHash.slice(0, 10)}...${txHash.slice(-8)}`}
              </span>
              <span className="external-link-icon">↗</span>
            </a>
            <button
              onClick={() => copyToClipboard(txHash)}
              className="transaction-copy-button"
              title="Copy transaction hash"
            >
              <ClipboardIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Helper function to render text content with clickable links
  const renderTextWithLinks = (content: string, txHashes: string[], walletAddress: string | null) => {
    let processedContent = content;
    
    // Replace transaction hashes with placeholders
    txHashes.forEach((txHash, index) => {
      processedContent = processedContent.replace(
        new RegExp(txHash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        `__TX_PLACEHOLDER_${index}__`
      );
    });
    
    // Replace wallet address with placeholder
    if (walletAddress) {
      processedContent = processedContent.replace(
        new RegExp(walletAddress.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        '__WALLET_PLACEHOLDER__'
      );
    }
    
    // Split content and process placeholders
    const parts = processedContent.split(/(__TX_PLACEHOLDER_\d+__|__WALLET_PLACEHOLDER__)/);
    
    return (
      <div className="message-content">
        <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {parts.map((part, index) => {
            // Handle transaction hash placeholders
            const txMatch = part.match(/^__TX_PLACEHOLDER_(\d+)__$/);
            if (txMatch) {
              const txIndex = parseInt(txMatch[1]);
              const txHash = txHashes[txIndex];
              return (
                <span key={`tx-inline-${index}`} className="inline-block">
                  <a
                    href={getBaseScanUrl(txHash, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                    title={`View transaction ${txHash} on Base Scan`}
                  >
                    {`${txHash.slice(0, 10)}...${txHash.slice(-8)}`}
                  </a>
                </span>
              );
            }
            
            // Handle wallet address placeholder
            if (part === '__WALLET_PLACEHOLDER__' && walletAddress) {
              return (
                <span key={`wallet-inline-${index}`} className="inline-wallet-address">
                  <span className="address-text">{walletAddress}</span>
                  <button
                    onClick={() => copyToClipboard(walletAddress)}
                    className="inline-copy-button ml-1"
                    title="Copy wallet address"
                  >
                    <ClipboardIcon className="h-3 w-3" />
                  </button>
                </span>
              );
            }
            
            // Regular text
            return <span key={index}>{part}</span>;
          })}
        </div>
        
        {/* Transaction links section */}
        {txHashes.length > 0 && (
          <div className="mt-3">
            {renderTransactionLinks(txHashes)}
          </div>
        )}
        
        {/* Standalone wallet address section */}
        {walletAddress && !processedContent.includes('__WALLET_PLACEHOLDER__') && (
          <div className="wallet-address-section mt-3">
            <div className="wallet-address">
              <span className="address-text">{walletAddress}</span>
              <button
                onClick={() => copyToClipboard(walletAddress)}
                className="copy-button"
                title="Copy wallet address"
              >
                <ClipboardIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-blue-400 mt-1 text-center">
              Tap to copy wallet address
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen black-gradient flex flex-col">
      
      {/* Header - Same as Landing Page */}
      <Header isFloating={true} onLogoClick={onBack} />

      {/* Messages */}
      <div className="flex-1 overflow-hidden pt-16 sm:pt-20">
        <div className="h-full overflow-y-auto scrollbar-minimal px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="text-center py-12 sm:py-16 md:py-20">
                <div className="avatar-modern mx-auto mb-6 sm:mb-8">
                  A
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6 px-4">
                  Welcome to Zeon Console
                </h2>
                <p className="text-blue-200 text-base sm:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
                  Your AI-powered crypto operations terminal. Ask me anything about your wallet, 
                  execute transactions, or get market insights.
                </p>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => setInputValue(action.command)}
                      className="p-3 sm:p-4 glass-subtle rounded-2xl hover:bg-black/60 transition-all duration-300 group"
                    >
                      <div className="text-sm font-medium text-blue-300 group-hover:text-white transition-colors">
                        {action.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message List */}
            {messages.map((message) => (
              <div key={message.id} className="flex space-x-3 sm:space-x-4 w-full">
                
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {isUserMessage(message.senderAddress) ? (
                    <div className="avatar-small-modern">
                      U
                    </div>
                  ) : message.senderAddress === 'system' ? (
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      {message.error ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      ) : (
                        <CommandLineIcon className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                  ) : (
                    <div className="avatar-small-modern">
                      A
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm font-medium text-blue-300">
                      {isUserMessage(message.senderAddress) ? 'You' : 
                       message.senderAddress === 'system' ? 'System' : 'Agent'}
                    </span>
                    <span className="text-xs text-blue-400">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  
                  <div className={`
                    ${isUserMessage(message.senderAddress) 
                      ? 'message-user-modern ml-auto' 
                      : message.error 
                        ? 'message-error-modern'
                        : 'message-agent-modern'}
                  `}>
                    <div className="text-sm leading-relaxed">
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex space-x-4">
                <div className="avatar-small-modern">
                  A
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm font-medium text-blue-300">Agent</span>
                    <span className="text-xs text-blue-400">typing...</span>
                  </div>
                  <div className="message-agent-modern">
                    <div className="flex space-x-1">
                      <div className="animate-pulse-dot delay-0">•</div>
                      <div className="animate-pulse-dot delay-75">•</div>
                      <div className="animate-pulse-dot delay-150">•</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area - Enhanced Mobile Experience */}
      <div className="p-3 sm:p-6 mb-2 sm:mb-6 mx-3 sm:mx-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-2 sm:space-x-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about crypto operations..."
                className="w-full px-4 sm:px-6 py-4 sm:py-4 glass-modern rounded-2xl text-white placeholder-blue-300/70 focus:outline-none border-blue-500/30 focus:border-blue-400 resize-none transition-all duration-300 text-base sm:text-base leading-relaxed"
                rows={1}
                style={{ 
                  minHeight: '56px', 
                  maxHeight: '120px',
                  background: 'rgba(0, 0, 0, 0.70)',
                  backdropFilter: 'blur(20px) saturate(150%)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontSize: '16px', // Prevents zoom on iOS
                  lineHeight: '1.5'
                }}
              />
              
              {/* Paste Button */}
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setInputValue(text);
                  } catch (err) {
                    console.error('Failed to read clipboard:', err);
                  }
                }}
                className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 p-2 sm:p-2 hover:bg-blue-500/20 rounded-lg transition-colors duration-200"
              >
                <ClipboardIcon className="h-5 w-5 text-blue-300 hover:text-white" />
              </button>
            </div>
            
            {/* Send Button - Enhanced for mobile */}
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="px-4 sm:px-6 py-4 sm:py-4 blue-gradient text-white font-medium rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-friendly"
              style={{ height: '56px', minWidth: '56px' }}
            >
              <PaperAirplaneIcon className="h-5 w-5 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Copy Toast Notification */}
      {showCopyToast && (
        <div className="copy-toast">
          <div className="copy-toast-content">
            <span>✓ Copied to clipboard!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;