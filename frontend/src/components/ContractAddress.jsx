import React from 'react';

/**
 * Contract Address Display Component
 * Shows blockchain addresses without copy functionality or special styling
 */
export function ContractAddress({ address, showExplorerLink = true }) {
  // Validate address format
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return <span className="contract-address-error">Invalid address</span>;
  }

  // Format address for display (show first 6 and last 4 characters)
  const formatAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Base Sepolia explorer URL
  const explorerURL = `https://sepolia.basescan.org/address/${address}`;

  return (
    <span className="contract-address-plain">
      {showExplorerLink ? (
        <a
          href={explorerURL}
          target="_blank"
          rel="noopener noreferrer"
          className="contract-address-link"
        >
          {formatAddress(address)}
        </a>
      ) : (
        <span className="contract-address-text">{address}</span>
      )}
    </span>
  );
}

export default ContractAddress; 