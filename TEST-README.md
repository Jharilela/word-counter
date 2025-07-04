# Fetch Content Test for Apple.com

This directory contains test scripts to verify if the fetch content function can successfully retrieve data from https://apple.com both locally and when deployed to Vercel.

## 📁 Files

- `test-fetch-apple.js` - Node.js test script
- `test-fetch-apple.html` - Browser-based test interface
- `TEST-README.md` - This documentation

## 🚀 How to Run Tests

### Option 1: Node.js Command Line Test

Run the test directly from the command line:

```bash
# Using npm script
npm run test:fetch

# Or run directly with node
node test-fetch-apple.js
```

This will:
- Test direct fetch to https://apple.com
- If direct fetch fails, test all proxy services
- Display detailed results in the console
- Save results to a JSON file (e.g., `fetch-test-results-1703123456789.json`)

### Option 2: Browser Test

1. Open `test-fetch-apple.html` in your web browser
2. Click "Start Test" to run the comprehensive test
3. Use individual test buttons to test specific methods
4. View real-time results and statistics

### Option 3: Integration Test

You can also import and use the test functions in your own code:

```javascript
import { runFetchTest, testDirectFetch, testProxyServices } from './test-fetch-apple.js';

// Run full test
const results = await runFetchTest();

// Test only direct fetch
const directResult = await testDirectFetch();

// Test only proxy services
const proxyResult = await testProxyServices();
```

## 📊 What the Test Does

The test script replicates the exact same fetch logic used in your word counter app:

1. **Direct Fetch Test**: Attempts to fetch https://apple.com directly
   - Uses proper User-Agent headers
   - 10-second timeout
   - Checks for CORS restrictions

2. **Proxy Services Test**: If direct fetch fails, tries multiple proxy services:
   - ThingProxy (`https://thingproxy.freeboard.io/fetch/`)
   - Codetabs (`https://api.codetabs.com/v1/proxy?quest=`)
   - Proxy6 (`https://proxy6.ga/?url=`)
   - AllOrigins (`https://api.allorigins.win/get?url=`)
   - JSONProxy (`https://jsonp.afeld.me/?url=`)

3. **Content Processing**: 
   - Removes HTML tags and scripts
   - Extracts readable text content
   - Validates content length and quality

## 🔍 Test Results

The test provides detailed information about:

- **Success/Failure**: Whether content was successfully fetched
- **Method Used**: Which fetch method worked (direct or proxy service)
- **Content Length**: Number of characters extracted
- **Sample Text**: First 200 characters of extracted content
- **Error Details**: Specific error messages if fetch fails
- **Performance**: Time taken for each test

## 🌍 Environment Detection

The test automatically detects and reports:

- **Platform**: Node.js vs Browser
- **Environment**: Development vs Production
- **User Agent**: Browser/Node.js version
- **Timestamp**: When the test was run

## 📈 Expected Results

### Local Development
- **Direct Fetch**: Likely to fail due to CORS restrictions
- **Proxy Services**: Should work if proxy services are available
- **Overall**: Should succeed with at least one method

### Vercel Deployment
- **Direct Fetch**: May work better due to server-side execution
- **Proxy Services**: Should work as fallback
- **Overall**: Should succeed with at least one method

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors**: Expected in browser environment, proxy services should handle this
2. **Network Timeouts**: Proxy services may be slow or unavailable
3. **Content Blocking**: Apple.com may block automated requests

### Debug Steps

1. Check network connectivity
2. Verify proxy services are accessible
3. Review error messages in test output
4. Try different URLs to isolate the issue

## 📝 Sample Output

```
🚀 Starting fetch content test for https://apple.com
============================================================
🔍 Testing direct fetch...
❌ Direct fetch failed: Failed to fetch
🔄 Direct fetch failed, testing proxy services...

🔄 Trying proxy service 1: https://thingproxy.freeboard.io/fetch/
✅ Proxy service 1 successful!
📄 Extracted 15420 characters of text
📝 First 200 characters: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables and accessories worldwide..."

============================================================
📊 TEST RESULTS SUMMARY
============================================================
⏱️  Total duration: 8542ms
🌍 Environment: development
💻 Platform: browser
🔗 Test URL: https://apple.com
✅ Successful tests: 1
❌ Failed tests: 1

🎉 SUCCESS: Content can be fetched!
📄 Method used: proxy_1
📝 Text length: 15420 characters
📖 Sample text: "Apple Inc. designs, manufactures, and markets smartphones..."
```

## 🔄 Continuous Testing

For continuous monitoring, you can:

1. **Automate with CI/CD**: Add the test to your deployment pipeline
2. **Scheduled Testing**: Run the test periodically to monitor proxy service availability
3. **Alert System**: Set up notifications when all fetch methods fail

## 📞 Support

If you encounter issues with the test:

1. Check the detailed error messages in the test output
2. Verify your network connectivity
3. Test with different URLs to isolate the problem
4. Review the proxy service status independently

The test is designed to help you understand exactly what's happening with your fetch functionality and provide actionable insights for debugging. 