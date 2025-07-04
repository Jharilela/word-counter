/**
 * Test Script for Fetch Content Function
 * Tests the ability to fetch content from https://apple.com
 * Can be run locally or on Vercel deployment
 */

// Test configuration
const TEST_URL = 'https://apple.com';
const TIMEOUT_MS = 30000; // 30 seconds timeout

// Proxy services from the original implementation
const PROXY_SERVICES = [
  'https://thingproxy.freeboard.io/fetch/',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://proxy6.ga/?url=',
  'https://api.allorigins.win/get?url=',
  'https://jsonp.afeld.me/?url=',
];

// Helper function to add timeout to fetch requests
const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Parse HTML function from the original implementation
const parseHTML = (html) => {
  // Create a simple HTML parser for Node.js environment
  // Remove script, style, head, and other non-content elements
  const cleanHTML = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<video[^>]*>[\s\S]*?<\/video>/gi, '')
    .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
    .replace(/<canvas[^>]*>[\s\S]*?<\/canvas>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  
  // Extract text content (simple approach)
  const text = cleanHTML
    .replace(/<[^>]*>/g, ' ') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n') // Replace multiple line breaks with single
    .trim();
  
  if (!text) {
    throw new Error('No readable text content found on the webpage.');
  }
  
  return text;
};

// Test direct fetch
const testDirectFetch = async () => {
  console.log('🔍 Testing direct fetch...');
  
  try {
    const response = await fetchWithTimeout(TEST_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    }, 10000);
    
    if (response.ok) {
      const html = await response.text();
      const text = parseHTML(html);
      console.log('✅ Direct fetch successful!');
      console.log(`📄 Extracted ${text.length} characters of text`);
      console.log(`📝 First 200 characters: "${text.substring(0, 200)}..."`);
      return { success: true, method: 'direct', textLength: text.length, sample: text.substring(0, 200) };
    } else {
      console.log(`❌ Direct fetch failed with status: ${response.status}`);
      return { success: false, method: 'direct', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ Direct fetch failed: ${error.message}`);
    return { success: false, method: 'direct', error: error.message };
  }
};

// Test proxy services
const testProxyServices = async () => {
  console.log('🔍 Testing proxy services...');
  
  for (let i = 0; i < PROXY_SERVICES.length; i++) {
    const proxyUrl = PROXY_SERVICES[i];
    console.log(`\n🔄 Trying proxy service ${i + 1}: ${proxyUrl}`);
    
    try {
      const fullProxyUrl = proxyUrl + encodeURIComponent(TEST_URL);
      const response = await fetchWithTimeout(fullProxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
        }
      }, 20000);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let html;
      
      // Handle different proxy response formats
      if (proxyUrl.includes('allorigins.win')) {
        const data = await response.json();
        if (data.status?.http_code && data.status.http_code !== 200) {
          throw new Error(`Target site returned ${data.status.http_code}`);
        }
        html = data.contents;
      } else if (proxyUrl.includes('codetabs.com')) {
        html = await response.text();
      } else if (proxyUrl.includes('jsonp.afeld.me')) {
        const text = await response.text();
        // Parse JSONP response
        const jsonpMatch = text.match(/callback\((.*)\)/);
        if (jsonpMatch) {
          const data = JSON.parse(jsonpMatch[1]);
          html = data.contents || data.body || text;
        } else {
          html = text;
        }
      } else {
        html = await response.text();
      }
      
      // Check if we got actual HTML content
      if (!html || html.trim().length < 50) {
        throw new Error('Received empty or invalid response');
      }
      
      const text = parseHTML(html);
      console.log(`✅ Proxy service ${i + 1} successful!`);
      console.log(`📄 Extracted ${text.length} characters of text`);
      console.log(`📝 First 200 characters: "${text.substring(0, 200)}..."`);
      return { success: true, method: `proxy_${i + 1}`, textLength: text.length, sample: text.substring(0, 200) };
      
    } catch (error) {
      console.log(`❌ Proxy service ${i + 1} failed: ${error.message}`);
      
      // If this was the last proxy service, don't continue
      if (i === PROXY_SERVICES.length - 1) {
        return { success: false, method: 'all_proxies', error: 'All proxy services failed' };
      }
    }
  }
};

// Main test function
const runFetchTest = async () => {
  console.log('🚀 Starting fetch content test for https://apple.com');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    platform: typeof window !== 'undefined' ? 'browser' : 'node',
    url: TEST_URL,
    tests: []
  };
  
  // Test direct fetch first
  const directResult = await testDirectFetch();
  results.tests.push(directResult);
  
  // If direct fetch failed, test proxy services
  if (!directResult.success) {
    console.log('\n🔄 Direct fetch failed, testing proxy services...');
    const proxyResult = await testProxyServices();
    results.tests.push(proxyResult);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  console.log(`⏱️  Total duration: ${duration}ms`);
  console.log(`🌍 Environment: ${results.environment}`);
  console.log(`💻 Platform: ${results.platform}`);
  console.log(`🔗 Test URL: ${TEST_URL}`);
  
  const successfulTests = results.tests.filter(test => test.success);
  const failedTests = results.tests.filter(test => !test.success);
  
  console.log(`✅ Successful tests: ${successfulTests.length}`);
  console.log(`❌ Failed tests: ${failedTests.length}`);
  
  if (successfulTests.length > 0) {
    console.log('\n🎉 SUCCESS: Content can be fetched!');
    const bestResult = successfulTests[0];
    console.log(`📄 Method used: ${bestResult.method}`);
    console.log(`📝 Text length: ${bestResult.textLength} characters`);
    console.log(`📖 Sample text: "${bestResult.sample}..."`);
  } else {
    console.log('\n💥 FAILURE: All fetch methods failed');
    console.log('Possible reasons:');
    console.log('• CORS restrictions');
    console.log('• Network connectivity issues');
    console.log('• Proxy services are down');
    console.log('• Apple.com is blocking automated requests');
  }
  
  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, index) => {
    console.log(`\nTest ${index + 1}: ${test.method}`);
    console.log(`  Status: ${test.success ? '✅ Success' : '❌ Failed'}`);
    if (test.success) {
      console.log(`  Text length: ${test.textLength} characters`);
    } else {
      console.log(`  Error: ${test.error}`);
    }
  });
  
  // Save results to file if running in Node.js
  if (typeof window === 'undefined') {
    const fs = await import('fs');
    const resultsFile = `fetch-test-results-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsFile}`);
  }
  
  return results;
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runFetchTest, testDirectFetch, testProxyServices };
}

// Run test if this file is executed directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runFetchTest()
    .then(results => {
      console.log('\n🏁 Test completed!');
      process.exit(results.tests.some(test => test.success) ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test failed with error:', error);
      process.exit(1);
    });
}

// For browser environment, expose the test function
if (typeof window !== 'undefined') {
  window.runFetchTest = runFetchTest;
  console.log('🌐 Browser environment detected. Use window.runFetchTest() to run the test.');
} 