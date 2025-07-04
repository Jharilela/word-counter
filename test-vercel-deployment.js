/**
 * Vercel Deployment Test for Fetch Functionality
 * This script helps debug fetch issues when deployed to Vercel
 */

import fs from 'fs';

// Test configuration
const TEST_URL = 'https://apple.com';

// Enhanced proxy services list
const PROXY_SERVICES = [
  // Primary services
  'https://thingproxy.freeboard.io/fetch/',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://proxy6.ga/?url=',
  'https://api.allorigins.win/get?url=',
  'https://jsonp.afeld.me/?url=',
  // Additional fallback services
  'https://cors-anywhere.herokuapp.com/',
  'https://api.codetabs.com/v1/proxy?quest=&apikey=test',
  'https://thingproxy.freeboard.io/fetch/?bypass-cache=true',
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
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

// Parse HTML function (simplified)
const parseHTML = (html) => {
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
  
  // Extract text content
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

// Test direct fetch with enhanced headers
const testDirectFetch = async () => {
  console.log('🔍 Testing direct fetch with enhanced headers...');
  
  try {
    const response = await fetchWithTimeout(TEST_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
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

// Test proxy services with enhanced error handling
const testProxyServices = async () => {
  console.log('🔍 Testing proxy services with enhanced error handling...');
  
  for (let i = 0; i < PROXY_SERVICES.length; i++) {
    const proxyUrl = PROXY_SERVICES[i];
    console.log(`\n🔄 Trying proxy service ${i + 1}: ${proxyUrl}`);
    
    try {
      let fullProxyUrl;
      if (proxyUrl.includes('cors-anywhere.herokuapp.com')) {
        fullProxyUrl = proxyUrl + TEST_URL;
      } else if (proxyUrl.includes('corsproxy.io')) {
        fullProxyUrl = proxyUrl + encodeURIComponent(TEST_URL);
      } else {
        fullProxyUrl = proxyUrl + encodeURIComponent(TEST_URL);
      }
      
      const response = await fetchWithTimeout(fullProxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      }, 20000);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let html;
      
      // Handle different proxy response formats
      if (proxyUrl.includes('allorigins.win')) {
        if (proxyUrl.includes('/raw?')) {
          // Raw endpoint returns HTML directly
          html = await response.text();
        } else {
          // Regular endpoint returns JSON
          const data = await response.json();
          if (data.status?.http_code && data.status.http_code !== 200) {
            throw new Error(`Target site returned ${data.status.http_code}`);
          }
          html = data.contents;
        }
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
      } else if (proxyUrl.includes('corsproxy.io')) {
        html = await response.text();
      } else if (proxyUrl.includes('cors-anywhere.herokuapp.com')) {
        html = await response.text();
      } else {
        html = await response.text();
      }
      
      // Check if we got actual HTML content
      if (!html || html.trim().length < 50) {
        throw new Error('Received empty or invalid response');
      }
      
      // Additional validation - check if it looks like HTML
      if (!html.includes('<html') && !html.includes('<body') && !html.includes('<div')) {
        throw new Error('Response does not appear to be HTML content');
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

// Test environment detection
const testEnvironment = () => {
  console.log('🔍 Testing environment detection...');
  
  const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    platform: typeof window !== 'undefined' ? 'browser' : 'node',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
    location: typeof window !== 'undefined' ? window.location.href : 'Server-side',
    timestamp: new Date().toISOString(),
    vercel: process.env.VERCEL === '1',
    vercelUrl: process.env.VERCEL_URL,
    vercelEnv: process.env.VERCEL_ENV,
  };
  
  console.log('Environment info:', JSON.stringify(env, null, 2));
  return env;
};

// Main test function
const runVercelTest = async () => {
  console.log('🚀 Starting Vercel deployment test for https://apple.com');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    environment: testEnvironment(),
    url: TEST_URL,
    tests: []
  };
  
  // Test direct fetch first
  const directResult = await testDirectFetch();
  results.tests.push(directResult);
  
  // Always test proxy services for comprehensive coverage
  console.log('\n🔄 Testing proxy services for comprehensive coverage...');
  const proxyResult = await testProxyServices();
  results.tests.push(proxyResult);
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERCEL TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`⏱️  Total duration: ${duration}ms`);
  console.log(`🌍 Environment: ${results.environment.nodeEnv}`);
  console.log(`💻 Platform: ${results.environment.platform}`);
  console.log(`🔗 Test URL: ${TEST_URL}`);
  console.log(`🚀 Vercel: ${results.environment.vercel ? 'Yes' : 'No'}`);
  
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
    console.log('• CORS restrictions in browser environment');
    console.log('• Proxy services are down or blocked');
    console.log('• Network connectivity issues');
    console.log('• Apple.com is blocking automated requests');
    console.log('• Vercel environment restrictions');
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
  
  // Save results to file
  const resultsFile = `vercel-test-results-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsFile}`);
  
  return results;
};

// Run the test
runVercelTest()
  .then(results => {
    console.log('\n🏁 Vercel test completed!');
    process.exit(results.tests.some(test => test.success) ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Vercel test failed with error:', error);
    process.exit(1);
  }); 