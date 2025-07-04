// Serverless function to handle fetch requests server-side
// This bypasses CORS issues by making requests from the server

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    console.log(`Fetching content from: ${url}`);

    // Make the request with enhanced headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
      },
      // Add timeout
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Validate that we got actual HTML content
    if (!html || html.trim().length < 50) {
      throw new Error('Received empty or invalid response');
    }

    // Check if it looks like HTML
    if (!html.includes('<html') && !html.includes('<body') && !html.includes('<div')) {
      throw new Error('Response does not appear to be HTML content');
    }

    console.log(`Successfully fetched content, length: ${html.length}`);

    // Return the HTML content
    res.status(200).json({ 
      content: html,
      length: html.length,
      url: url,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching content:', error);
    
    // Provide helpful error messages
    let errorMessage = error.message;
    
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      errorMessage = 'Network request failed. Please check the URL and try again.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. The website may be slow or unresponsive.';
    } else if (error.message.includes('404')) {
      errorMessage = 'The webpage could not be found (404 error). Please check the URL.';
    } else if (error.message.includes('403')) {
      errorMessage = 'Access to this webpage is forbidden. The website may be blocking automated requests.';
    } else if (error.message.includes('500')) {
      errorMessage = 'The website server returned an error (500). Please try again later.';
    }

    res.status(500).json({ 
      error: errorMessage,
      originalError: error.message,
      url: url,
      timestamp: new Date().toISOString()
    });
  }
} 