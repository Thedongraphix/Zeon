/**
 * Test Suite for Fundraiser Fixes
 * Run these tests to verify all issues are resolved
 */

import { generateFundraiserURL, fixDoubleEncodedURL, safeURLEncode } from './urlHelpers.js';
import { generateQRCodeURL, validateQRCodeURL, generateCryptoQRData } from './qrCodeGenerator.js';
import { formatFundraiserResponse, generateFundraiserLink, getFundraiserStatus } from './blockchain.ts';

/**
 * Test runner function
 */
async function runTests() {
  console.log('🧪 Starting Fundraiser Fix Test Suite...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  function test(description, testFn) {
    totalTests++;
    try {
      const result = testFn();
      if (result === true || (typeof result === 'object' && result.success)) {
        console.log(`✅ ${description}`);
        passedTests++;
        if (typeof result === 'object' && result.details) {
          console.log(`   ${result.details}`);
        }
      } else {
        console.log(`❌ ${description}`);
        if (typeof result === 'object' && result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${description}`);
      console.log(`   Exception: ${error.message}`);
    }
  }

  // Test data
  const testFundraiser = {
    address: '0x7805B1557019e15BF3E6903d1bE02c2038da14D2',
    goal: '0.0002',
    name: 'Web3 Ladies'
  };

  console.log('1️⃣ Testing URL Encoding Fixes...\n');

  test('Generate properly encoded fundraiser URL', () => {
    const generatedURL = generateFundraiserURL(testFundraiser.address, {
      goal: testFundraiser.goal,
      name: testFundraiser.name
    });
    
    const expectedPattern = 'https://zeonai.xyz/fundraiser/0x7805B1557019e15BF3E6903d1bE02c2038da14D2?goal=0.0002&name=Web3+Ladies';
    const isValid = generatedURL.includes('Web3+Ladies') && !generatedURL.includes('%2520');
    
    return {
      success: isValid,
      details: `Generated: ${generatedURL}`,
      error: isValid ? null : 'URL contains double encoding or incorrect format'
    };
  });

  test('Fix double-encoded URLs', () => {
    const doubleEncodedURL = 'https://zeonai.xyz/fundraiser/0x123?name=Web3%2520Ladies';
    const fixedURL = fixDoubleEncodedURL(doubleEncodedURL);
    
    const isFixed = fixedURL.includes('Web3%20Ladies') && !fixedURL.includes('%2520');
    
    return {
      success: isFixed,
      details: `Fixed: ${fixedURL}`,
      error: isFixed ? null : 'URL still contains double encoding'
    };
  });

  test('Safe URL encoding prevents double encoding', () => {
    const alreadyEncoded = 'Web3%20Ladies';
    const plainText = 'Web3 Ladies';
    
    const result1 = safeURLEncode(alreadyEncoded);
    const result2 = safeURLEncode(plainText);
    
    const test1Pass = result1 === 'Web3%20Ladies'; // Should remain unchanged
    const test2Pass = result2 === 'Web3%20Ladies'; // Should be encoded
    
    return {
      success: test1Pass && test2Pass,
      details: `Already encoded: ${result1}, Plain text: ${result2}`,
      error: (!test1Pass || !test2Pass) ? 'Safe encoding not working correctly' : null
    };
  });

  console.log('\n2️⃣ Testing QR Code Generation...\n');

  test('Generate absolute QR code URL', () => {
    const qrURL = generateQRCodeURL(
      testFundraiser.address,
      testFundraiser.goal,
      testFundraiser.name
    );
    
    const isAbsolute = qrURL.startsWith('http');
    const isValid = validateQRCodeURL(qrURL);
    
    return {
      success: isAbsolute && isValid,
      details: `QR URL: ${qrURL}`,
      error: (!isAbsolute || !isValid) ? 'QR URL is not absolute or invalid' : null
    };
  });

  test('Generate crypto QR data with correct format', () => {
    const cryptoData = generateCryptoQRData(testFundraiser.address, testFundraiser.goal);
    
    const expectedPattern = `ethereum:${testFundraiser.address}@84532?value=`;
    const isCorrectFormat = cryptoData.startsWith(expectedPattern);
    const hasChainId = cryptoData.includes('@84532');
    
    return {
      success: isCorrectFormat && hasChainId,
      details: `Crypto data: ${cryptoData}`,
      error: (!isCorrectFormat || !hasChainId) ? 'Crypto QR data format is incorrect' : null
    };
  });

  test('Validate QR code URLs', () => {
    const validURL = 'https://zeonai.xyz/api/qr-code?walletAddress=0x123&amount=1';
    const invalidURL = '/api/qr-code?walletAddress=0x123'; // relative URL
    
    const validResult = validateQRCodeURL(validURL);
    const invalidResult = validateQRCodeURL(invalidURL);
    
    return {
      success: validResult === true && invalidResult === false,
      details: `Valid URL check: ${validResult}, Invalid URL check: ${invalidResult}`,
      error: (validResult !== true || invalidResult !== false) ? 'URL validation not working correctly' : null
    };
  });

  console.log('\n3️⃣ Testing Fundraiser Integration...\n');

  test('Generate fundraiser link with new URL helpers', () => {
    const fundraiserLink = generateFundraiserLink(
      testFundraiser.address,
      testFundraiser.goal,
      testFundraiser.name,
      'Test description'
    );
    
    const hasCorrectBase = fundraiserLink.includes('https://zeonai.xyz/fundraiser/');
    const hasNoDoubleEncoding = !fundraiserLink.includes('%2520');
    const hasProperEncoding = fundraiserLink.includes('Web3+Ladies') || fundraiserLink.includes('Web3%20Ladies');
    
    return {
      success: hasCorrectBase && hasNoDoubleEncoding && hasProperEncoding,
      details: `Link: ${fundraiserLink}`,
      error: (!hasCorrectBase || !hasNoDoubleEncoding || !hasProperEncoding) ? 'Fundraiser link has encoding issues' : null
    };
  });

  test('Format fundraiser response without double encoding', async () => {
    try {
      const fundraiserStatus = await getFundraiserStatus(
        testFundraiser.address,
        testFundraiser.name,
        testFundraiser.goal,
        'Test description'
      );
      
      const hasNoDoubleEncoding = !fundraiserStatus.formattedResponse.includes('%2520');
      const hasProperLinks = fundraiserStatus.formattedResponse.includes('https://');
      
      return {
        success: hasNoDoubleEncoding && hasProperLinks,
        details: 'Fundraiser response generated successfully',
        error: (!hasNoDoubleEncoding || !hasProperLinks) ? 'Response contains encoding issues or missing links' : null
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate fundraiser status: ${error.message}`
      };
    }
  });

  console.log('\n4️⃣ Testing Edge Cases...\n');

  test('Handle invalid wallet addresses', () => {
    try {
      generateFundraiserURL('invalid-address', { name: 'Test' });
      return {
        success: false,
        error: 'Should have thrown error for invalid address'
      };
    } catch (error) {
      return {
        success: error.message.includes('Invalid wallet address format'),
        details: 'Correctly rejected invalid address',
        error: !error.message.includes('Invalid wallet address format') ? 'Wrong error message' : null
      };
    }
  });

  test('Handle empty or null inputs', () => {
    const result1 = fixDoubleEncodedURL('');
    const result2 = fixDoubleEncodedURL(null);
    const result3 = safeURLEncode('');
    
    return {
      success: result1 === '' && result2 === '' && result3 === '',
      details: 'Empty inputs handled correctly',
      error: (result1 !== '' || result2 !== '' || result3 !== '') ? 'Empty inputs not handled properly' : null
    };
  });

  test('Handle special characters in fundraiser names', () => {
    const specialName = 'Test & Friends: "Special" Characters!';
    const encodedURL = generateFundraiserURL(testFundraiser.address, {
      name: specialName,
      goal: '1'
    });
    
    const hasNoDoubleEncoding = !encodedURL.includes('%2520');
    const isValidURL = encodedURL.startsWith('https://');
    
    return {
      success: hasNoDoubleEncoding && isValidURL,
      details: `URL: ${encodedURL}`,
      error: (!hasNoDoubleEncoding || !isValidURL) ? 'Special characters not handled correctly' : null
    };
  });

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! The fundraiser fixes are working correctly.');
    console.log('\nKey improvements verified:');
    console.log('• ✅ No more double URL encoding (%2520 → %20)');
    console.log('• ✅ QR codes use absolute URLs');
    console.log('• ✅ Proper wallet compatibility with EIP-681 format');
    console.log('• ✅ Safe encoding prevents double encoding issues');
    console.log('• ✅ Invalid inputs handled gracefully');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above before deploying.');
    return false;
  }
}

// Export the test runner
export { runTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
} 