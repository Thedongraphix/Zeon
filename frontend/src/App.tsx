import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia, sepolia } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';
import FundraiserPage from './components/FundraiserPage';
import './index.css';

const config = createConfig({
  chains: [baseSepolia, sepolia],
  transports: {
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

function FundraiserRoute() {
  const { walletAddress } = useParams<{ walletAddress: string }>();
  const [searchParams] = useSearchParams();
  
  const goalAmount = searchParams.get('goal') || '1';
  const fundraiserName = searchParams.get('name') || 'Fundraiser';
  const description = searchParams.get('description') || '';
  const currentAmount = searchParams.get('current') || '0';
  
  if (!walletAddress) {
    return <div className="text-white p-8">Invalid fundraiser link</div>;
  }
  
  return (
    <FundraiserPage
      walletAddress={walletAddress}
      goalAmount={goalAmount}
      fundraiserName={decodeURIComponent(fundraiserName)}
      description={description ? decodeURIComponent(description) : undefined}
      currentAmount={currentAmount}
      contributors={[]} // This would be fetched from an API in a real implementation
    />
  );
}

function MainApp() {
  const { authenticated } = usePrivy();
  const [showChat, setShowChat] = useState(false);

  const handleGetStarted = () => {
    if (authenticated) {
      setShowChat(true);
    }
    // The login flow is handled by the LandingPage component
  };

  const handleBackToLanding = () => {
    setShowChat(false);
  };

  return (
    <div className="min-h-screen black-gradient text-white overflow-hidden">
      {/* Header - only show on landing page */}
      {!showChat && <Header />}
      
      {/* Main Content with smooth transitions */}
      <div className="relative">
        {showChat && authenticated ? (
          <div className="animate-scale-up">
            <ChatInterface onBack={handleBackToLanding} />
          </div>
        ) : (
          <div className="animate-scale-up">
            <LandingPage onGetStarted={handleGetStarted} />
          </div>
        )}
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/fundraiser/:walletAddress" element={<FundraiserRoute />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <PrivyProvider
      appId={process.env.REACT_APP_PRIVY_APP_ID || 'cmbf4m9j800fple0npr5qdpwz'}
      config={{
        // Appearance settings
        appearance: {
          theme: 'dark',
          accentColor: '#3b82f6',
          logo: undefined,
        },
        
        // Authentication methods
        loginMethods: ['wallet', 'email'],
        
        // Wallet configuration
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
        
        // Supported chains
        supportedChains: [baseSepolia, sepolia],
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