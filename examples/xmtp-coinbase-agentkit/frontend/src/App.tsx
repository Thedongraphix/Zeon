import React, { useState } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia, sepolia } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';
import './index.css';

const config = createConfig({
  chains: [baseSepolia, sepolia],
  transports: {
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

function AppContent() {
  const { authenticated } = usePrivy();
  const [showChat, setShowChat] = useState(false);

  const handleGetStarted = () => {
    if (authenticated) {
      setShowChat(true);
    }
    // The login flow is handled by the LandingPage component
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {!showChat && <Header />}
      {showChat && authenticated ? (
        <ChatInterface />
      ) : (
        <LandingPage onGetStarted={handleGetStarted} />
      )}
    </div>
  );
}

function App() {
  return (
    <PrivyProvider
      appId={process.env.REACT_APP_PRIVY_APP_ID || 'cmbf4m9j800fple0npr5qdpwz'}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#3b82f6',
          logo: undefined,
        },
        loginMethods: ['wallet', 'email'],
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <AppContent />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App; 