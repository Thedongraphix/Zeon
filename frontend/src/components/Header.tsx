import React, { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  isFloating?: boolean;
  onLogoClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isFloating = true, onLogoClick }) => {
  const { authenticated, logout } = usePrivy();
  const { wallets } = useWallets();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const wallet = wallets[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Removed copy functionality to fix link clickability

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const headerClass = isFloating 
    ? "fixed top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 z-50 glass-modern rounded-[20px] sm:rounded-[28px] px-4 sm:px-8 py-3"
    : "glass-modern px-4 sm:px-8 py-3";

  return (
    <header className={headerClass}>
      <div className="flex items-center justify-between">
        
        {/* Left - Logo */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button 
            onClick={onLogoClick}
            className="text-xl sm:text-2xl font-bold text-white hover:text-blue-100 transition-colors duration-200 cursor-pointer"
          >
            Zeon
          </button>
          <div className="flex items-center space-x-2 px-2 sm:px-3 py-1 glass-subtle rounded-full">
            <img 
              src="/base logo.svg" 
              alt="Base Logo" 
              className="w-3 h-3 sm:w-4 sm:h-4"
            />
            <span className="text-xs font-semibold text-blue-300 hidden sm:inline">Base</span>
          </div>
        </div>

        {/* Right - Wallet/Auth */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {authenticated && wallet ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-6 py-2 sm:py-3 glass-subtle rounded-[16px] sm:rounded-[20px] hover:bg-black/60 transition-all duration-300 group"
              >
                <div className="avatar-small-modern">
                  W
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-semibold text-white group-hover:text-blue-100 transition-colors">
                    {formatAddress(wallet.address)}
                  </div>
                  <div className="text-xs text-blue-300 group-hover:text-blue-200 transition-colors">
                    Connected
                  </div>
                </div>
                <ChevronDownIcon 
                  className={`h-4 w-4 text-blue-300 group-hover:text-white transition-all duration-300 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-3 w-72 sm:w-80 glass-modern rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 shadow-2xl border border-blue-500/20 animate-slide-down">
                  <div className="space-y-6">
                    
                    {/* Wallet Address - No Copy Functionality */}
                    <div>
                      <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2 block">
                        Wallet Address
                      </label>
                      <div className="p-3 glass-subtle rounded-xl">
                        <span className="font-mono text-sm text-white select-all">
                          {formatAddress(wallet.address)}
                        </span>
                      </div>
                    </div>

                    {/* Connection Type */}
                    <div>
                      <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2 block">
                        Connection
                      </label>
                      <div className="p-3 glass-subtle rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="status-modern"></div>
                          <span className="text-sm font-medium text-white">
                            {wallet.walletClientType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Network */}
                    <div>
                      <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2 block">
                        Network
                      </label>
                      <div className="p-3 glass-subtle rounded-xl">
                        <div className="flex items-center space-x-3">
                          <img 
                            src="/base logo.svg" 
                            alt="Base Logo" 
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium text-white">
                            Base Sepolia
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-white/10">
                      <button
                        onClick={() => {
                          logout();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full py-3 px-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 font-medium text-sm"
                      >
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-blue-300 font-medium">
              Not Connected
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 