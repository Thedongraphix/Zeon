import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

const Header: React.FC = () => {
  const { login, logout, authenticated, user } = usePrivy();

  const handleAuthAction = () => {
    if (authenticated) {
      logout();
    } else {
      login();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark-950/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Zeon Ai</h1>
          </div>

          {/* Wallet Connection */}
          <button
            onClick={handleAuthAction}
            className="bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-300 flex items-center space-x-2"
          >
            {authenticated && user?.wallet?.address ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{formatAddress(user.wallet.address)}</span>
              </>
            ) : (
              <span>Connect Wallet</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 