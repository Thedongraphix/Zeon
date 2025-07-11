/**
 * URL Helper Utilities for Fundraiser Links
 * Prevents double encoding and ensures proper URL formation
 */

/**
 * Generates a properly encoded fundraiser URL
 * @param {string} walletAddress - The fundraiser wallet address (0x...)
 * @param {Object} params - Additional URL parameters
 * @returns {string} Properly encoded URL
 */
export function generateFundraiserURL(walletAddress, params = {}) {
  // Validate the wallet address format
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new Error('Invalid wallet address format. Expected 0x followed by 40 hex characters.');
  }

  // Use your domain - replace with your actual domain
  const baseURL = 'https://zeonai.xyz/fundraiser';
  
  // Create URL object to handle encoding automatically
  const url = new URL(`${baseURL}/${walletAddress}`);
  
  // Add parameters safely - URL API handles encoding
  if (params.goal) {
    url.searchParams.set('goal', params.goal);
  }
  
  if (params.name) {
    // The URL API will properly encode spaces and special characters
    url.searchParams.set('name', params.name);
  }
  
  if (params.network) {
    url.searchParams.set('network', params.network);
  }
  
  // Return the properly formatted URL
  return url.toString();
}

/**
 * Fixes URLs that have been double-encoded
 * @param {string} malformedURL - URL with encoding issues
 * @returns {string} Fixed URL
 */
export function fixDoubleEncodedURL(malformedURL) {
  if (!malformedURL) return '';
  
  try {
    // First, replace known double-encoding patterns
    let fixedURL = malformedURL
      .replace(/%2520/g, '%20')  // Fix double-encoded spaces
      .replace(/%252F/g, '%2F')  // Fix double-encoded slashes
      .replace(/%253A/g, '%3A')  // Fix double-encoded colons
      .replace(/%253F/g, '%3F')  // Fix double-encoded question marks
      .replace(/%253D/g, '%3D')  // Fix double-encoded equals
      .replace(/%2526/g, '%26'); // Fix double-encoded ampersands
    
    // Try to parse and reconstruct the URL
    const url = new URL(decodeURIComponent(fixedURL));
    return url.toString();
  } catch (error) {
    // If URL parsing fails, return the partially fixed URL
    console.warn('Could not fully parse URL:', error);
    return malformedURL.replace(/%2520/g, '%20');
  }
}

/**
 * Safely encodes a string for URL usage
 * Checks if already encoded to prevent double encoding
 * @param {string} str - String to encode
 * @returns {string} Encoded string
 */
export function safeURLEncode(str) {
  if (!str) return '';
  
  try {
    // Check if string is already encoded
    const decoded = decodeURIComponent(str);
    
    // If decoding changes the string, it was already encoded
    if (decoded !== str) {
      return str; // Return as-is, already encoded
    }
  } catch (e) {
    // If decoding throws an error, string has invalid encoding
    // We'll encode it fresh
  }
  
  // String is not encoded, encode it now
  return encodeURIComponent(str);
} 