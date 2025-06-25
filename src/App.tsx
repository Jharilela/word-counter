import { useState, useRef } from 'react'
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
    // Check if file is PDF, DOCX, or TXT
    if (file.type !== 'application/pdf' && 
        file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
        file.type !== 'text/plain') {
      setFileError('Please select a valid PDF, DOCX, or TXT file.')
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
      } else if (file.type === 'text/plain') {
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Word & Character Counter</h1>
          <p className="text-muted-foreground mt-2">
            Paste text, type manually, or upload a PDF, DOCX, or TXT file to count words and characters
          </p>
        </div>

        <div className="space-y-4">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DropZone
                onFilesDrop={handleFilesDrop}
                disabled={isLoading}
                className="mb-4"
              />
              
              {fileName && (
                <div className="text-sm text-muted-foreground">
                  📄 Loaded: {fileName}
                </div>
              )}

              {fileError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {fileError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* URL Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Fetch from Webpage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isUrlLoading || isLoading}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUrlSubmit()
                    }
                  }}
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={isUrlLoading || isLoading || !url.trim()}
                  size="lg"
                  className="px-8"
                >
                  {isUrlLoading ? 'Fetching...' : 'Fetch and Analyze'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Note: Some websites may not be accessible due to browser security restrictions (CORS).
              </p>

              {urlError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {urlError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Text Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Text Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter or paste your text here, upload a file above, or fetch from a webpage..."
                value={text}
                onChange={handleTextChange}
                className="min-h-[200px] resize-none"
                disabled={isLoading || isUrlLoading}
              />

              <div className="flex justify-center gap-4">
                <Button 
                  onClick={() => countWordsAndCharacters()}
                  size="lg"
                  className="px-8"
                  disabled={isLoading || !text.trim()}
                >
                  Count Words and Characters
                </Button>
                <Button 
                  onClick={copyToClipboard}
                  size="lg"
                  variant="outline"
                  disabled={isLoading || !text.trim()}
                >
                  Copy Text
                </Button>
                <Button 
                  onClick={clearAll}
                  size="lg"
                  variant="outline"
                  disabled={isLoading}
                >
                  Clear All
                </Button>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{results.wordCount}</div>
                    <div className="text-sm text-muted-foreground">Words</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{results.charCountExcludingSpaces}</div>
                    <div className="text-sm text-muted-foreground">Characters (no spaces)</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{results.charCountIncludingSpaces}</div>
                    <div className="text-sm text-muted-foreground">Characters (with spaces)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default App