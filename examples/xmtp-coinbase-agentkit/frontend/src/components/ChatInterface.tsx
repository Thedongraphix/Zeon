import React, { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowLeftIcon, PaperAirplaneIcon, UserCircleIcon } from '@heroicons/react/24/solid';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'transaction' | 'error';
}

const MessageContent = ({ content }: { content: string }) => {
  // Regex to find introductory text and the SVG QR code, handling optional markdown fences
  const qrRegex = /^(.*?)`{0,3}(?:svg)?\s*(<svg[\s\S]*?<\/svg>)\s*`{0,3}(.*)$/s;
  const match = content.match(qrRegex);

  if (!match) {
    // Using a simple replacement for now if no SVG is found to avoid showing backticks.
    return <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{content.replace(/`/g, '')}</p>;
  }

  // Extract the text before the SVG, the SVG itself, and text after
  const textBefore = match[1]?.trim();
  const svgContent = match[2];
  const textAfter = match[3]?.trim();

  // Extract address from the text
  const addressRegex = /(0x[a-fA-F0-9]{40})/;
  const addressMatch = textBefore.match(addressRegex);
  const contractAddress = addressMatch ? addressMatch[0] : null;
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (contractAddress) {
      navigator.clipboard.writeText(contractAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Revert after 2 seconds
    }
  };

  // A component to safely render the SVG
  const QRCodeComponent = () => {
    return (
      <div>
        {textBefore && <p className="text-sm mb-2" style={{ whiteSpace: 'pre-wrap' }}>{textBefore}</p>}
        <div className="inline-flex flex-col items-center">
          <div
            className="p-2 bg-white rounded-lg shadow-md"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
          {contractAddress && (
            <button
              onClick={handleCopy}
              className="mt-2 text-xs bg-gray-600 text-white py-1 px-2 rounded hover:bg-gray-500 transition-colors w-full"
              disabled={isCopied}
            >
              {isCopied ? 'Copied!' : 'Copy Address'}
            </button>
          )}
        </div>
        {textAfter && <p className="text-sm mt-2" style={{ whiteSpace: 'pre-wrap' }}>{textAfter}</p>}
      </div>
    );
  };

  return <QRCodeComponent />;
};

const ChatInterface: React.FC = () => {
  const { user } = usePrivy();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI-powered crypto assistant. How can I help you today?",
      sender: 'agent',
      timestamp: new Date(),
      type: 'text',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('https://zeon-hybrid-api.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage, userId: user?.id }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'agent',
        timestamp: new Date(),
        type: 'text',
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '❌ An error occurred. Please try again.',
        sender: 'agent',
        timestamp: new Date(),
        type: 'error',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const quickActions = [
    'Check balance',
    'Send 0.01 ETH to vitalik.eth',
    'Swap 100 USDC',
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-800 animate-fade-in">
        {/* Chat Header */}
      <header className="flex items-center justify-between p-4 bg-gray-900 text-white shadow-md">
        <div className="flex items-center space-x-4">
          <button onClick={() => window.location.reload()} className="p-2 hover:bg-gray-700 rounded-full">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
              AI
            </div>
            <div>
              <h1 className="text-lg font-semibold">Zeon Ai</h1>
              <p className="text-sm text-green-400">Online</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <UserCircleIcon className="h-6 w-6 text-gray-400" />
          <span className="text-sm text-gray-300 hidden sm:block">
            {user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : 'Guest'}
          </span>
        </div>
      </header>

        {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'agent' && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">
                AI
              </div>
            )}
            <div className={`max-w-lg px-4 py-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
              <MessageContent content={msg.content} />
              <span className={`text-xs mt-1 block text-right ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {formatTime(msg.timestamp)}
              </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
          <div className="flex items-end gap-3 justify-start">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">AI</div>
            <div className="bg-gray-700 text-gray-200 rounded-2xl rounded-bl-none p-4">
                <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-gray-900 border-t border-gray-700">
        {messages.length <= 1 && (
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
            {quickActions.map((action) => (
                <button
                key={action}
                  onClick={() => setInputMessage(action)}
                className="px-4 py-2 text-sm bg-gray-700 text-gray-200 rounded-full hover:bg-gray-600 transition-colors flex-shrink-0"
                >
                  {action}
                </button>
              ))}
          </div>
        )}
        <div className="flex items-center bg-gray-700 rounded-xl px-4 py-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
            placeholder="Send a message..."
            className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none"
                disabled={isLoading}
              />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
            className="p-2 rounded-full text-white disabled:text-gray-500 enabled:hover:bg-blue-600 enabled:bg-blue-500 transition-colors"
            >
            <PaperAirplaneIcon className="h-6 w-6" />
            </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatInterface; 