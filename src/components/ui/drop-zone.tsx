import * as React from "react"
import { cn } from "@/lib/utils"

export interface DropZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onFilesDrop: (files: FileList) => void
  acceptedFileTypes?: string[]
  disabled?: boolean
}

const DropZone = React.forwardRef<HTMLDivElement, DropZoneProps>(
  ({ className, onFilesDrop, acceptedFileTypes = ['.pdf', '.docx', '.txt'], disabled = false, ...props }, ref) => {
    const [isDragOver, setIsDragOver] = React.useState(false)
    const [isDragValid, setIsDragValid] = React.useState(false)
    const dragCounter = React.useRef(0)

    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return

      dragCounter.current++
      
      const files = e.dataTransfer.files
      const hasValidFiles = Array.from(files).some(file => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()
        return acceptedFileTypes.includes(extension)
      })

      setIsDragValid(hasValidFiles)
      setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      dragCounter.current--
      
      // Only reset drag state when we've completely left the drop zone
      if (dragCounter.current === 0) {
        setIsDragOver(false)
        setIsDragValid(false)
      }
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return

      dragCounter.current = 0
      setIsDragOver(false)
      setIsDragValid(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        onFilesDrop(files)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        triggerFileBrowser()
      }
    }

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      if (!disabled) {
        triggerFileBrowser()
      }
    }

    const triggerFileBrowser = () => {
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = acceptedFileTypes.join(',')
      fileInput.multiple = false
      fileInput.onchange = (event) => {
        const target = event.target as HTMLInputElement
        if (target.files && target.files.length > 0) {
          onFilesDrop(target.files)
        }
      }
      fileInput.click()
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "hover:border-primary/50 hover:bg-muted/50",
          isDragOver && isDragValid && "border-primary bg-primary/5",
          isDragOver && !isDragValid && "border-destructive bg-destructive/5",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer",
          className
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Drop files here or click to browse"
        {...props}
      >
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <svg
              className="w-6 h-6 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragOver && isDragValid && "Drop files here"}
              {isDragOver && !isDragValid && "Invalid file type"}
              {!isDragOver && "Drag and drop files here"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse files
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: {acceptedFileTypes.join(', ')}
            </p>
          </div>
        </div>

        {isDragOver && (
          <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium">
                {isDragValid ? "Drop to upload" : "Invalid file type"}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }
)

DropZone.displayName = "DropZone"

export { DropZone } 