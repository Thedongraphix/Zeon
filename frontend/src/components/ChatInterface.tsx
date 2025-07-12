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
    { label: 'Create Fundraiser', command: 'Create a fundraiser for 0.5 ETH called "My Test Fundraiser"' }
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

  const extractWalletAddress = (content: string) => {
    const ethAddressRegex = /(0x[a-fA-F0-9]{40})/g;
    const matches = content.match(ethAddressRegex);
    return matches ? matches[0] : null;
  };

  const generateCoinbaseWalletLink = (toAddress: string, amount: string) => {
    try {
      const chainId = 84532;
      const amountInWei = (parseFloat(amount) * Math.pow(10, 18)).toString();
      const ethereumUri = `ethereum:${toAddress}@${chainId}?value=${amountInWei}`;
      const encodedUri = encodeURIComponent(ethereumUri);
      return `https://go.cb-w.com/dapp?cb_url=${encodedUri}`;
    } catch (error) {
      console.error('Error generating Coinbase Wallet link:', error);
      return null;
    }
  };

  const extractContributionAmount = (message: string) => {
    const amountRegex = /(\d+\.?\d*)\s*ETH/i;
    const match = message.match(amountRegex);
    return match ? match[1] : null;
  };

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part && part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{part}</a>;
      }
      
      const boldParts = part ? part.split(/(\*.*?\*)/g) : [];
      return boldParts.map((boldPart, j) => {
        if (boldPart && boldPart.startsWith('*') && boldPart.endsWith('*')) {
          return <strong key={`${i}-${j}`}>{boldPart.slice(1, -1)}</strong>;
        }
        return boldPart;
      });
    });
  };

  const extractPayloadFromResponse = (responseText: string) => {
    try {
      const data = JSON.parse(responseText);
      if (data.response && data.qrCode && data.qrMessage) {
        return {
          response: data.response,
          qrCode: data.qrCode,
          qrMessage: data.qrMessage,
        };
      }
    } catch (e) {}

    try {
      const data = JSON.parse(responseText);
      if (data.qrCode && data.message) {
        return {
          response: data.message,
          qrCode: data.qrCode,
          qrMessage: data.message,
        };
      }
    } catch (e) {}

    return null;
  }

  const renderMessageContent = (content: string) => {
    const payload = extractPayloadFromResponse(content);
    
    if (payload) {
      const walletAddress = extractWalletAddress(payload.qrMessage);
      const contributionAmount = extractContributionAmount(payload.qrMessage);
      const coinbaseWalletLink = (walletAddress && contributionAmount) ? generateCoinbaseWalletLink(walletAddress, contributionAmount) : null;
      
      return (
        <div className="message-content">
          <div className="mb-4 whitespace-pre-wrap break-words overflow-wrap-anywhere">
            {renderTextWithLinks(payload.response)}
          </div>
          
          <div className="qr-code-container my-4">
            <div className="qr-code-wrapper">
              <div className="qr-code-display">
                <img 
                  src={payload.qrCode}
                  alt="Contribution QR Code"
                  className="qr-code-png"
                />
              </div>
              
              <div className="qr-code-actions">
                <div className="text-xs text-blue-300 mb-3 text-center whitespace-pre-wrap break-words">
                  {payload.qrMessage}
                </div>
                
                {coinbaseWalletLink && (
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
                  </div>
                )}
                
                {walletAddress && (
                  <div className="wallet-address-section">
                    <div className="wallet-address-display">
                      <span className="address-text select-all">{walletAddress}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="message-content">
        <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {renderTextWithLinks(content)}
        </div>
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


    </div>
  );
};

export default ChatInterface;