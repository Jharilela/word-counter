import { useState, useRef } from 'react'
import './App.css'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('Please select a valid PDF file.')
      return
    }

    setIsLoading(true)
    setFileName(file.name)

    try {
      const extractedText = await extractTextFromPDF(file)
      setText(extractedText)
      // Auto-count the extracted text
      countWordsAndCharacters(extractedText)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred while processing the PDF.')
      setFileName(null)
    } finally {
      setIsLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
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
  }

  const clearAll = () => {
    setText('')
    setResults(null)
    setFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Word & Character Counter</h1>
          <p className="text-muted-foreground mt-2">
            Paste text, type manually, or upload a PDF to count words and characters
          </p>
        </div>

        <div className="space-y-4">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? 'Processing...' : 'Browse PDF'}
                </Button>
              </div>
              {fileName && (
                <div className="text-sm text-muted-foreground">
                  📄 Loaded: {fileName}
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
                placeholder="Enter or paste your text here, or upload a PDF above..."
                value={text}
                onChange={handleTextChange}
                className="min-h-[200px] resize-none"
                disabled={isLoading}
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
                  onClick={clearAll}
                  size="lg"
                  variant="outline"
                  disabled={isLoading}
                >
                  Clear All
                </Button>
              </div>
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