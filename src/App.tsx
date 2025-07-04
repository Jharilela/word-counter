import { useState, useEffect } from 'react'
import './App.css'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { DropZone } from "@/components/ui/drop-zone"
import { PWAInstall } from "@/components/PWAInstall"
import { GoogleAnalyticsDebug } from "@/components/GoogleAnalyticsDebug"
import { trackEvent, trackPageView } from "@/lib/utils"
// Lucide icons
import { FaFilePdf, FaFileWord } from 'react-icons/fa'
import { FaGithub, FaDiscord, FaEnvelope, FaGlobe, FaFileCode, FaFileAlt, FaFile } from 'react-icons/fa'

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist'
// Import mammoth for .docx processing
import mammoth from 'mammoth'
// Import Tesseract.js for OCR
import { createWorker } from 'tesseract.js'

// Use the local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'

interface WordFrequency {
  word: string;
  count: number;
  percentage: number;
}

interface RepeatedWordsAnalysis {
  topWords: WordFrequency[];
  totalUniqueWords: number;
  mostRepeatedWord: WordFrequency | null;
  stopWordsFiltered: boolean;
}

interface CountResults {
  wordCount: number;
  charCountExcludingSpaces: number;
  charCountIncludingSpaces: number;
  repeatedWordsAnalysis?: RepeatedWordsAnalysis;
}
 
function App() {
  const [text, setText] = useState('')
  const [results, setResults] = useState<CountResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [filterStopWords, setFilterStopWords] = useState(true)
  const [ocrProgress, setOcrProgress] = useState<number>(0)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [ocrLanguage, setOcrLanguage] = useState('eng')

  const analyzeRepeatedWords = (text: string, filterStopWords = true): RepeatedWordsAnalysis => {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'a', 
      'an', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 
      'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 
      'their', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 
      'yourselves', 'themselves', 'what', 'which', 'who', 'when', 'where', 'why', 
      'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 
      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
    ]);
    
    if (!text.trim()) {
      return {
        topWords: [],
        totalUniqueWords: 0,
        mostRepeatedWord: null,
        stopWordsFiltered: filterStopWords
      };
    }

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 1); // Filter out single characters
    
    const filteredWords = filterStopWords 
      ? words.filter(word => !stopWords.has(word))
      : words;
    
    const frequency = new Map<string, number>();
    
    filteredWords.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });
    
    const totalWords = filteredWords.length;
    const wordFrequencies: WordFrequency[] = Array.from(frequency.entries())
      .map(([word, count]) => ({
        word,
        count,
        percentage: totalWords > 0 ? (count / totalWords) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      topWords: wordFrequencies.slice(0, 15), // Top 15 words
      totalUniqueWords: frequency.size,
      mostRepeatedWord: wordFrequencies[0] || null,
      stopWordsFiltered: filterStopWords
    };
  };

  const convertPDFPageToImage = async (pdf: any, pageNum: number): Promise<HTMLCanvasElement> => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR accuracy
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    return canvas;
  };

  const extractTextWithOCR = async (file: File): Promise<string> => {
    setIsOcrProcessing(true);
    setOcrProgress(0);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise;

      const worker = await createWorker(ocrLanguage, 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(m.progress * 100);
          }
        }
      });

      let fullText = '';
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        try {
          setOcrProgress((i - 1) / totalPages * 80); // Reserve 20% for final processing
          
          const canvas = await convertPDFPageToImage(pdf, i);
          const { data: { text } } = await worker.recognize(canvas);
          
          if (text.trim()) {
            fullText += text.trim() + '\n\n';
          }
        } catch (pageError) {
          console.error(`Error processing page ${i}:`, pageError);
          // Continue with other pages even if one fails
        }
      }

      setOcrProgress(100);
      await worker.terminate();
      
      return fullText.trim();
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(0);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      
      // Load PDF without worker (slower but more reliable)
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise

      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n'
      }

      const extractedText = fullText.trim()
      
      // If no text was extracted or very little text (likely a scanned PDF), try OCR
      if (!extractedText || extractedText.length < 50) {
        console.log('Little to no text found via standard extraction, attempting OCR...');
        return await extractTextWithOCR(file);
      }

      return extractedText
    } catch (error) {
      console.error('Error extracting text from PDF:', error)
      
      // If regular extraction failed, try OCR as fallback
      try {
        console.log('Standard PDF extraction failed, trying OCR fallback...');
        return await extractTextWithOCR(file);
      } catch (ocrError) {
        console.error('OCR fallback also failed:', ocrError);
        throw new Error('Failed to extract text from PDF. This may be a scanned document. Please try a different file or check if the PDF contains readable text.');
      }
    }
  }

  const extractTextFromDocx = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value.trim()
    } catch (error) {
      console.error('Error extracting text from DOCX:', error)
      throw new Error('Failed to extract text from DOCX file. Please make sure the file is a valid Word document and try again.')
    }
  }

  const extractTextFromTxt = async (file: File): Promise<string> => {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          resolve(text.trim())
        }
        reader.onerror = () => {
          reject(new Error('Failed to read text file.'))
        }
        reader.readAsText(file)
      })
    } catch (error) {
      console.error('Error reading text file:', error)
      throw new Error('Failed to read text file. Please make sure the file is a valid text file and try again.')
    }
  }

  const processFile = async (file: File) => {
    // Track file upload event
    trackEvent('file_upload', 'file_processing', file.type || 'unknown');
    
    // Check if file is PDF, DOCX, TXT, MD, or SRT
    if (file.type !== 'application/pdf' && 
        file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
        file.type !== 'text/plain' &&
        file.type !== 'text/markdown' &&
        file.type !== 'application/x-subrip' &&
        !file.name.toLowerCase().endsWith('.md') &&
        !file.name.toLowerCase().endsWith('.srt')) {
      setFileError('Please select a valid PDF, DOCX, TXT, MD, or SRT file.')
      trackEvent('file_upload_error', 'file_processing', 'invalid_file_type');
      return
    }

    // Clear previous file data before processing new file
    setText('')
    setResults(null)
    setFileName(null)
    setFileError(null)
    setUrlError(null)

    setIsLoading(true)
    setFileName(file.name)

    try {
      let extractedText = ''
      
      if (file.type === 'application/pdf') {
        extractedText = await extractTextFromPDF(file)
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        extractedText = await extractTextFromDocx(file)
      } else if (file.type === 'text/plain' || 
                 file.type === 'text/markdown' || 
                 file.type === 'application/x-subrip' ||
                 file.name.toLowerCase().endsWith('.md') ||
                 file.name.toLowerCase().endsWith('.srt')) {
        extractedText = await extractTextFromTxt(file)
      }

      if (!extractedText.trim()) {
        setFileError('No text could be extracted from this file. It may be a scanned document or contain only images, which cannot be processed for text. Please try another file.')
        setText('')
        setResults(null)
        setFileName(null)
        return
      }

      setText(extractedText)
      // Auto-count the extracted text
      countWordsAndCharacters(extractedText)
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'An error occurred while processing the file.')
      setFileName(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilesDrop = async (files: FileList) => {
    if (files.length === 0) return
    
    // Process only the first file for now
    const file = files[0]
    await processFile(file)
  }

  const countWordsAndCharacters = (textToCount?: string) => {
    const textContent = textToCount || text
    if (!textContent.trim()) {
      setResults(null)
      return
    }

    // Count words (split by spaces and line breaks, filter out empty strings)
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0)
    const wordCount = words.length

    // Count characters excluding spaces
    const charCountExcludingSpaces = textContent.replace(/\s/g, '').length

    // Count characters including spaces
    const charCountIncludingSpaces = textContent.length

    // Always analyze repeated words
    const repeatedWordsAnalysis = analyzeRepeatedWords(textContent, filterStopWords)

    setResults({
      wordCount,
      charCountExcludingSpaces,
      charCountIncludingSpaces,
      repeatedWordsAnalysis
    })
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    // Clear filename when user manually types
    if (fileName) {
      setFileName(null)
    }
    // Clear errors when user starts typing
    setFileError(null)
    setUrlError(null)
  }

  const copyToClipboard = async () => {
    if (!text.trim()) {
      setError('No text to copy.')
      trackEvent('copy_error', 'user_action', 'no_text_to_copy');
      return
    }
    
    trackEvent('copy_to_clipboard', 'user_action', 'text_copied');

    try {
      await navigator.clipboard.writeText(text)
      // Show a brief success message (you could add a toast notification here)
      setError(null)
    } catch (error) {
      console.error('Failed to copy text:', error)
      setError('Failed to copy text to clipboard.')
    }
  }

  const [url, setUrl] = useState('')
  const [isUrlLoading, setIsUrlLoading] = useState(false)

  const extractTextFromWebpage = async (url: string) => {
    try {
      // First, try the serverless function (most reliable for Vercel)
      try {
        console.log('Attempting serverless function fetch...');
        const serverlessResponse = await fetch(`/api/fetch-content?url=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (serverlessResponse.ok) {
          const data = await serverlessResponse.json();
          if (data.content) {
            console.log('Serverless function successful, parsing content...');
            return parseHTML(data.content);
          }
        } else {
          console.log(`Serverless function failed with status: ${serverlessResponse.status}`);
        }
      } catch (serverlessError) {
        console.log('Serverless function failed, trying proxy services:', serverlessError);
      }

      // Fallback to proxy services
      const proxyServices = [
        // Primary services
        `https://thingproxy.freeboard.io/fetch/${url}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://proxy6.ga/?url=${encodeURIComponent(url)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://jsonp.afeld.me/?url=${encodeURIComponent(url)}`,
        // Additional fallback services
        `https://cors-anywhere.herokuapp.com/${url}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}&apikey=test`,
        `https://thingproxy.freeboard.io/fetch/${url}?bypass-cache=true`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
      ];

      // Helper function to add timeout to fetch requests
      const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs: number = 15000) => {
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

      // Try direct fetch first for sites that don't have CORS restrictions
      try {
        console.log('Attempting direct fetch...');
        const directResponse = await fetchWithTimeout(url, {
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
        }, 10000); // 10 second timeout for direct fetch
        
        if (directResponse.ok) {
          const html = await directResponse.text();
          console.log('Direct fetch successful, parsing content...');
          return parseHTML(html);
        } else {
          console.log(`Direct fetch failed with status: ${directResponse.status}`);
        }
      } catch (directError) {
        console.log('Direct fetch failed, trying proxy services:', directError);
      }

      // Try proxy services one by one
      for (let i = 0; i < proxyServices.length; i++) {
        try {
          const proxyUrl = proxyServices[i];
          console.log(`Trying proxy service ${i + 1}: ${proxyUrl}`);
          
          const response = await fetchWithTimeout(proxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Cache-Control': 'no-cache',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
          }, 20000); // 20 second timeout for proxy services
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          let html: string;
          
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
          
          console.log(`Successfully fetched content using proxy service ${i + 1}`);
          return parseHTML(html);
          
        } catch (error) {
          console.error(`Proxy service ${i + 1} failed:`, error);
          
          // If this was the last proxy service, don't continue
          if (i === proxyServices.length - 1) {
            break;
          }
        }
      }
      
      // If all proxy services failed, throw a comprehensive error
      throw new Error('All proxy services failed to fetch the webpage. This might be due to:\n• The website blocking automated requests\n• All proxy services being temporarily unavailable\n• The website requiring authentication\n• Network connectivity issues\n\nAlternatives:\n• Copy and paste the text manually\n• Use the file upload option\n• Try a different URL from the same website');
      
    } catch (error) {
      console.error('Error fetching webpage:', error);
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          throw new Error('Network request failed. Please check your internet connection and try again, or use the file upload option instead.');
        }
        
        if (error.message.includes('CORS') || error.message.includes('cors')) {
          throw new Error('Website access blocked by security restrictions. Try copying and pasting the text manually or use the file upload option.');
        }
        
        if (error.message.includes('404')) {
          throw new Error('The webpage could not be found (404 error). Please check the URL and try again.');
        }
        
        if (error.message.includes('403')) {
          throw new Error('Access to this webpage is forbidden. The website may be blocking automated requests. Try copying the text manually.');
        }
        
        if (error.message.includes('500')) {
          throw new Error('The website server returned an error (500). Please try again later or use the file upload option.');
        }
        
        if (error.message.includes('aborted') || error.message.includes('timeout')) {
          throw new Error('Request timed out. The website may be slow or unresponsive. Please try again or use the file upload option.');
        }
        
        // If it's our custom error message, throw it as-is
        if (error.message.includes('All proxy services failed') || error.message.includes('alternatives:')) {
          throw error;
        }
        
        throw new Error(`Unable to fetch webpage: ${error.message}`);
      }
      
      throw new Error('An unexpected error occurred while fetching the webpage. Please try again or use the file upload option.');
    }
  };

  const parseHTML = (html: string): string => {
    // Parse HTML and extract text from body
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove script, style, head, and other non-content elements
    const elementsToRemove = doc.querySelectorAll('script, style, head, nav, footer, header, aside, noscript, iframe, img, video, audio, canvas, svg, meta, link, title');
    elementsToRemove.forEach(el => el.remove());
    
    // Extract text from body
    const body = doc.body;
    if (!body) {
      throw new Error('No body content found on the webpage.');
    }
    
    // Get text content and clean it up
    let text = body.textContent || body.innerText || '';
    
    // Clean up the text: remove extra whitespace, normalize line breaks
    text = text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple line breaks with single
      .trim();
    
    if (!text) {
      throw new Error('No readable text content found on the webpage.');
    }
    
    return text;
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      setUrlError('Please enter a valid URL.')
      return
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      setUrlError('Please enter a valid URL (e.g., https://example.com)')
      return
    }

    setIsUrlLoading(true)
    setUrlError(null)
    setFileError(null)

    try {
      const extractedText = await extractTextFromWebpage(url)
      
      if (!extractedText.trim()) {
        setUrlError('No text content could be extracted from this webpage.')
        // Clear previous content when extraction fails
        setText('')
        setResults(null)
        setFileName(null)
        return
      }

      // Clear previous file data and set new text
      setText(extractedText)
      setResults(null)
      setFileName(null)
      
      // Auto-count the extracted text
      countWordsAndCharacters(extractedText)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching the webpage.'
      setUrlError(errorMessage)
      
      // Clear previous content when fetch fails
      setText('')
      setResults(null)
      setFileName(null)
    } finally {
      setIsUrlLoading(false)
    }
  }

  const clearAll = () => {
    trackEvent('clear_all', 'user_action', 'content_cleared');
    setText('')
    setResults(null)
    setFileName(null)
    setError(null)
    setFileError(null)
    setUrlError(null)
    setUrl('')
    setIsOcrProcessing(false)
    setOcrProgress(0)
  }

  // Track page view on component mount
  useEffect(() => {
    trackPageView();
  }, []);

  // Realtime counting: useEffect on text
  useEffect(() => {
    if (text.trim()) {
      countWordsAndCharacters(text)
    } else {
      setResults(null)
    }
  }, [text])

  return (
    <div className="min-h-screen bg-background p-4">
      <GoogleAnalyticsDebug />
      {/* Header */}
      <header className="w-full flex items-center justify-between border-b border-muted-foreground/10 px-2 py-2 mb-6">
        <div className="flex flex-row items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo"
            style={{ maxHeight: 36, maxWidth: 36 }}
            className="block"
          />
          <div className="flex flex-col gap-0.5 text-left">
            <span className="font-bold text-lg leading-tight">Word & Character Counter</span>
            <span className="text-xs text-muted-foreground leading-tight text-left">
              Online free word counter, character counter, PDF, DOCX, TXT, SRT, Markdown, website text analyzer
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://github.com/Jharilela/word-counter" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-primary"><FaGithub size={20} /></a>
          <a href="https://discord.com/users/jym.god" target="_blank" rel="noopener noreferrer" aria-label="Discord (@jym.god)" className="hover:text-primary"><FaDiscord size={20} /></a>
          <a href="mailto:tools@emp0.com" aria-label="Email" className="hover:text-primary"><FaEnvelope size={20} /></a>
          <a href="https://emp0.com" target="_blank" rel="noopener noreferrer" aria-label="emp0 website" className="hover:text-primary"><FaGlobe size={20} /></a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Left: Textarea (spans 2 columns on desktop) */}
        <div className="md:col-span-2 flex flex-col h-full">
          <Card className="flex-1 h-full">
            <CardContent className="flex flex-col h-full p-0">
              <Textarea
                placeholder="Enter or paste your text here, upload a file, or fetch from a webpage..."
                value={text}
                onChange={handleTextChange}
                className="flex-1 min-h-[300px] h-full resize-none text-base rounded-b-lg border-none focus:ring-0 focus:outline-none"
                disabled={isLoading || isUrlLoading}
                style={{ minHeight: '300px', height: '100%', maxHeight: '100%', boxSizing: 'border-box' }}
              />
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mt-4">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Controls and Results */}
        <div className="flex flex-col gap-6">
          {/* Copy & Clear Buttons (2 columns) */}
          <div className="grid grid-cols-2 gap-2 items-start">
            <div className="flex flex-col">
              <Button 
                onClick={copyToClipboard}
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading || !text.trim()}
              >
                Copy Text
              </Button>
              {error && (
                <div className="text-xs text-destructive bg-destructive/10 p-1 rounded mt-1 text-center">
                  {error}
                </div>
              )}
            </div>
            <Button 
              onClick={clearAll}
              size="lg"
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              Clear All
            </Button>
          </div>

          {/* Results Section (always visible, compact, 3 columns) */}
          <Card className="shadow-none border border-muted-foreground/10">
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center rounded-lg bg-muted py-4">
                  <div className="text-2xl font-bold text-primary">{results ? results.wordCount : 0}</div>
                  <div className="text-sm text-muted-foreground">Words</div>
                </div>
                <div className="text-center rounded-lg bg-muted py-4">
                  <div className="text-2xl font-bold text-primary">{results ? results.charCountExcludingSpaces : 0}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line">Characters{'\n'}(no spaces)</div>
                </div>
                <div className="text-center rounded-lg bg-muted py-4">
                  <div className="text-2xl font-bold text-primary">{results ? results.charCountIncludingSpaces : 0}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line">Characters{'\n'}(with spaces)</div>
                </div>
              </div>
              

            </CardContent>
          </Card>

          {/* Repeated Words Analysis Section */}
          {results?.repeatedWordsAnalysis && (
            <Card className="shadow-none border border-muted-foreground/10">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Word Frequency Analysis</h3>
                  <Button
                    onClick={() => setFilterStopWords(!filterStopWords)}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2"
                  >
                    {filterStopWords ? 'Include' : 'Filter'} Common Words
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center rounded-lg bg-muted py-2">
                    <div className="text-lg font-bold text-primary">{results.repeatedWordsAnalysis.totalUniqueWords}</div>
                    <div className="text-xs text-muted-foreground">Unique Words</div>
                  </div>
                  <div className="text-center rounded-lg bg-muted py-2">
                    <div className="text-lg font-bold text-primary">
                      {results.repeatedWordsAnalysis.mostRepeatedWord?.count || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Most Frequent</div>
                  </div>
                </div>

                {results.repeatedWordsAnalysis.topWords.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Top 5 Words:</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {results.repeatedWordsAnalysis.topWords.slice(0, 5).map((wordFreq, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                          <span className="text-xs font-medium truncate max-w-20">{wordFreq.word}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{wordFreq.count}</span>
                            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ width: `${Math.min(wordFreq.percentage * 2, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* File Upload Section (minimized, compact) */}
          <Card className="shadow-none border border-muted-foreground/10">
            <CardContent className="p-2">
              {fileName ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-muted rounded px-2 py-1">
                    <span className="text-sm text-muted-foreground truncate max-w-[140px] flex items-center gap-1" aria-label={fileName}>
                      {(() => {
                        const lower = fileName.toLowerCase()
                        if (lower.endsWith('.pdf')) return <FaFilePdf size={18} className="text-red-500" />
                        if (lower.endsWith('.docx') || lower.endsWith('.doc')) return <FaFileWord size={18} className="text-blue-500" />
                        if (lower.endsWith('.md')) return <FaFileCode size={18} className="text-green-500" />
                        if (lower.endsWith('.txt')) return <FaFileAlt size={18} className="text-gray-500" />
                        if (lower.endsWith('.srt')) return <FaFileAlt size={18} className="text-purple-500" />
                        return <FaFile size={18} className="text-gray-400" />
                      })()} {fileName}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove file"
                      className="ml-2 text-destructive hover:text-destructive/80 text-lg font-bold px-2 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-destructive"
                      onClick={() => {
                        setFileName(null)
                        setText('')
                        setResults(null)
                        setFileError(null)
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* OCR Progress */}
                  {isOcrProcessing && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">OCR Processing...</span>
                        <span className="text-xs text-muted-foreground">{Math.round(ocrProgress)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1">
                        <div 
                          className="bg-primary h-1 rounded-full transition-all duration-300" 
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <DropZone
                    onFilesDrop={handleFilesDrop}
                    disabled={isLoading || isOcrProcessing}
                    className="p-4 rounded-md"
                  />
                  
                  {/* OCR Language Selection */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">OCR Language:</label>
                    <select
                      value={ocrLanguage}
                      onChange={(e) => setOcrLanguage(e.target.value)}
                      className="text-xs bg-background border border-input rounded px-2 py-1 flex-1"
                      disabled={isLoading || isOcrProcessing}
                    >
                      <option value="eng">English</option>
                      <option value="spa">Spanish</option>
                      <option value="fra">French</option>
                      <option value="deu">German</option>
                      <option value="ita">Italian</option>
                      <option value="por">Portuguese</option>
                      <option value="rus">Russian</option>
                      <option value="chi_sim">Chinese (Simplified)</option>
                      <option value="jpn">Japanese</option>
                      <option value="kor">Korean</option>
                    </select>
                  </div>
                </div>
              )}
              {fileError && (
                <div className="text-xs text-destructive bg-destructive/10 p-1 rounded mt-1">
                  {fileError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* URL Input Section (minimized, compact) */}
          <Card className="shadow-none border border-muted-foreground/10">
            <CardContent className="p-2">
              <div className="flex items-center gap-1">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isUrlLoading || isLoading}
                  className="flex-1 h-9 px-2 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUrlSubmit()
                    }
                  }}
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={isUrlLoading || isLoading || !url.trim()}
                  size="sm"
                  className="h-9 px-4 text-sm font-semibold"
                >
                  {isUrlLoading ? 'Fetching...' : 'Fetch'}
                </Button>
              </div>
              {urlError && (
                <div className="text-xs text-destructive bg-destructive/10 p-1 rounded mt-1">
                  {urlError}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* PWA Install Button */}
      <PWAInstall />
    </div>
  )
}
 
export default App