import { useState } from 'react'
import './App.css'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CountResults {
  wordCount: number;
  charCountExcludingSpaces: number;
  charCountIncludingSpaces: number;
}

function App() {
  const [text, setText] = useState('')
  const [results, setResults] = useState<CountResults | null>(null)

  const countWordsAndCharacters = () => {
    if (!text.trim()) {
      setResults(null)
      return
    }

    // Count words (split by spaces and line breaks, filter out empty strings)
    const words = text.trim().split(/\s+/).filter(word => word.length > 0)
    const wordCount = words.length

    // Count characters excluding spaces
    const charCountExcludingSpaces = text.replace(/\s/g, '').length

    // Count characters including spaces
    const charCountIncludingSpaces = text.length

    setResults({
      wordCount,
      charCountExcludingSpaces,
      charCountIncludingSpaces
    })
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Word & Character Counter</h1>
          <p className="text-muted-foreground mt-2">
            Paste or type your text below to count words and characters
          </p>
        </div>

        <div className="space-y-4">
          <Textarea
            placeholder="Enter or paste your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[200px] resize-none"
          />

          <div className="flex justify-center">
            <Button 
              onClick={countWordsAndCharacters}
              size="lg"
              className="px-8"
            >
              Count Words and Characters
            </Button>
          </div>

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