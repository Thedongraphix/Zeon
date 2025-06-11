import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { authenticated, login } = usePrivy();

  const handleGetStarted = () => {
    if (authenticated) {
      onGetStarted();
    } else {
      login();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <div className="max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fade-in-down">
          Your AI-Powered <br />
          <span className="text-blue-400">Zeon Ai</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-10 animate-fade-in-up">
          Chat with your personal XMTP agent to manage your crypto assets with
          simple, natural language.
        </p>
        <button
          onClick={handleGetStarted}
          className="bg-blue-600 text-white font-semibold text-lg px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 transform hover:scale-105 animate-fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          {authenticated ? 'Start Chatting' : 'Connect Wallet to Start'}
        </button>
      </div>
    </div>
  );
};

export default LandingPage; 