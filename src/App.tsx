import { useState, useRef, useEffect } from 'react'
import './App.css'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropZone } from "@/components/ui/drop-zone"

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist'
// Import mammoth for .docx processing
import mammoth from 'mammoth'

// Use the local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'

interface CountResults {
  wordCount: number;
  charCountExcludingSpaces: number;
  charCountIncludingSpaces: number;
}
 
function App() {
  const [text, setText] = useState('')
  const [results, setResults] = useState<CountResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

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

      return fullText.trim()
    } catch (error) {
      console.error('Error extracting text from PDF:', error)
      throw new Error('Failed to extract text from PDF. Please make sure the file is a valid PDF and try again.')
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
    // Check if file is PDF, DOCX, TXT, MD, or SRT
    if (file.type !== 'application/pdf' && 
        file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
        file.type !== 'text/plain' &&
        file.type !== 'text/markdown' &&
        file.type !== 'application/x-subrip' &&
        !file.name.toLowerCase().endsWith('.md') &&
        !file.name.toLowerCase().endsWith('.srt')) {
      setFileError('Please select a valid PDF, DOCX, TXT, MD, or SRT file.')
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

    setResults({
      wordCount,
      charCountExcludingSpaces,
      charCountIncludingSpaces
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
      return
    }

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
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const html = await response.text()
      
      // Parse HTML and extract text from body
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      // Remove script, style, head, and other non-content elements
      const elementsToRemove = doc.querySelectorAll('script, style, head, nav, footer, header, aside, noscript, iframe, img, video, audio, canvas, svg, meta, link, title')
      elementsToRemove.forEach(el => el.remove())
      
      // Extract text from body
      const body = doc.body
      if (!body) {
        throw new Error('No body content found on the webpage.')
      }
      
      // Get text content and clean it up
      let text = body.textContent || body.innerText || ''
      
      // Clean up the text: remove extra whitespace, normalize line breaks
      text = text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Replace multiple line breaks with single
        .trim()
      
      return text
    } catch (error) {
      console.error('Error fetching webpage:', error)
      
      // Check for CORS or network errors
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          throw new Error('Cannot access this site due to browser security restrictions (CORS). Try a different website or use the file upload option.')
        }
      }
      
      // Check for other network errors
      if (error instanceof Error) {
        if (error.message.includes('ERR_FAILED') || error.message.includes('ERR_NETWORK')) {
          throw new Error('Network error: Cannot access this website. It may be blocked by browser security restrictions.')
        }
      }
      
      throw new Error(`Failed to fetch webpage: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

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
    setText('')
    setResults(null)
    setFileName(null)
    setError(null)
    setFileError(null)
    setUrlError(null)
    setUrl('')
  }

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
      {/* Header */}
      <header className="w-full flex items-center justify-between border-b border-muted-foreground/10 px-2 py-2 mb-6">
        <div className="flex flex-col gap-0.5 text-left">
          <span className="font-bold text-lg leading-tight">Word & Character Counter</span>
          <span className="text-xs text-muted-foreground leading-tight text-left">
            Online free word counter, character counter, PDF, DOCX, TXT, SRT, Markdown, website text analyzer
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://github.com/emp0/word-counter" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-primary"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .267.18.578.688.48C19.138 20.203 22 16.447 22 12.021 22 6.484 17.523 2 12 2z"/></svg></a>
          <a href="https://discord.gg/emp0" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="hover:text-primary"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.369A19.791 19.791 0 0 0 16.885 3.1a.074.074 0 0 0-.078.037c-.34.607-.719 1.396-.984 2.013a18.524 18.524 0 0 0-5.59 0 12.51 12.51 0 0 0-.988-2.013.077.077 0 0 0-.078-.037A19.736 19.736 0 0 0 3.684 4.369a.069.069 0 0 0-.032.027C1.605 7.092.322 9.68.076 12.229c-.002.02.006.04.019.055a19.911 19.911 0 0 0 5.993 3.058.077.077 0 0 0 .084-.027c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.104 13.108 13.108 0 0 1-1.872-.893.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.245.197.372.291a.077.077 0 0 1-.006.128 12.64 12.64 0 0 1-1.873.893.076.076 0 0 0-.04.105c.36.699.772 1.364 1.225 1.993a.076.076 0 0 0 .084.028 19.888 19.888 0 0 0 6.002-3.058.077.077 0 0 0 .019-.054c-.264-2.549-1.547-5.137-3.608-7.833a.061.061 0 0 0-.03-.028zM8.02 14.331c-1.183 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.955 2.419-2.156 2.419zm7.974 0c-1.183 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.946 2.419-2.156 2.419z"/></svg></a>
          <a href="mailto:contact@emp0.com" aria-label="Email" className="hover:text-primary"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 2v.01L12 13 4 6.01V6h16zM4 20V8.99l7.71 6.93c.18.16.43.16.61 0L20 8.99V20H4z"/></svg></a>
          <a href="https://emp0.com" target="_blank" rel="noopener noreferrer" aria-label="emp0 website" className="hover:text-primary"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg></a>
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

          {/* Results Section (always visible, compact, 2 columns) */}
          <Card className="shadow-none border border-muted-foreground/10">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center rounded-lg bg-muted py-4">
                  <div className="text-2xl font-bold text-primary">{results ? results.wordCount : 0}</div>
                  <div className="text-sm text-muted-foreground">Words</div>
                </div>
                <div className="text-center rounded-lg bg-muted py-4">
                  <div className="text-2xl font-bold text-primary">{results ? results.charCountExcludingSpaces : 0}</div>
                  <div className="text-sm text-muted-foreground">Characters (no spaces)</div>
                </div>
                <div className="col-span-2 text-center rounded-lg bg-muted py-4 mt-1">
                  <div className="text-2xl font-bold text-primary">{results ? results.charCountIncludingSpaces : 0}</div>
                  <div className="text-sm text-muted-foreground">Characters (with spaces)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload Section (minimized, compact) */}
          <Card className="shadow-none border border-muted-foreground/10">
            <CardContent className="p-2">
              {fileName ? (
                <div className="flex items-center justify-between bg-muted rounded px-2 py-1">
                  <span className="text-sm text-muted-foreground truncate max-w-[140px]">�� {fileName}</span>
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
              ) : (
                <DropZone
                  onFilesDrop={handleFilesDrop}
                  disabled={isLoading}
                  className="p-4 rounded-md"
                />
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
    </div>
  )
}
 
export default App