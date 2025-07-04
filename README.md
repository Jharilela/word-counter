# Word & Character Counter

A modern, privacy-friendly, and free online tool to count words and characters in text, PDF, DOCX, TXT, SRT, Markdown, and even website content. Built with React, TypeScript, Vite, and Tailwind, with PWA support and Google Analytics integration.

---

## ✨ Features
- **Instant word & character counting** (realtime as you type, upload, or fetch)
- **Drag & drop or click to upload**: PDF, DOCX, TXT, SRT, Markdown (.md)
- **OCR for scanned PDFs**: Extract text from image-based PDFs using Tesseract.js with multiple language support
- **Paste or type text** directly
- **Fetch and analyze webpage text** by URL with CORS proxy fallback
- **Repeated words analysis**: Show most frequent words with customizable stop-word filtering
- **Copy results** to clipboard
- **Clear all** with one click
- **Beautiful, responsive UI** (ShadeCN, Tailwind)
- **PWA**: Installable, works offline
- **Google Analytics** (optional, privacy-respecting)

## 📝 Recently Added Features
[✅] **OCR for PDF:** Extract text from scanned PDFs using Optical Character Recognition (OCR) with Tesseract.js

[✅] **CORS Proxy for Websites:** Bypass CORS restrictions with multiple proxy services for robust website text extraction

[✅] **Repeated Words Analysis:** Show most repeated words and their counts for deeper text analysis with stop-word filtering

## 📝 Future Features
[ ] **Puppeteer Scraper for Websites:** Use Puppeteer for even more robust website text extraction (handle complex dynamic content)

---

## 📂 Supported File Types
- PDF (.pdf)
- Word (.docx, .doc)
- Text (.txt)
- Markdown (.md)
- SubRip Subtitle (.srt)

---

## 🚀 Getting Started

1. **Clone the repo:**
   ```sh
   git clone https://github.com/Jharilela/word-counter.git
   cd word-counter
   ```
2. **Install dependencies:**
   ```sh
   pnpm install
   # or
   npm install
   ```
3. **Run the app locally:**
   ```sh
   pnpm dev
   # or
   npm run dev
   ```
4. **Build for production:**
   ```sh
   pnpm build
   # or
   npm run build
   ```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and set your Google Analytics key (optional):

```
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

If not set, analytics is disabled and a warning is logged in the console.

---

## 📱 PWA & SEO
- **PWA:** Installable on desktop/mobile, works offline, manifest and icons included
- **SEO:**
  - Meta tags, Open Graph, Twitter Card, and manifest are set up in `index.html`
  - Keywords: word counter, character counter, PDF, DOCX, TXT, SRT, Markdown, website, online, free, PWA, privacy, emp0

---

## 🖼️ Logos & Icons
- Place your logo and icons in the `public/` directory (see `public/logo.png`, `public/logo-192x192.png`, etc.)
- Favicon and PWA icons are referenced in `index.html` and manifest

---

## 🛠️ Tech Stack
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [react-icons](https://react-icons.github.io/react-icons/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [shadecn/ui](https://ui.shadcn.com/)

---

## 👤 Credits & Socials
- **Developer:** [emp0](https://emp0.com)
- **GitHub:** [Jharilela/word-counter](https://github.com/Jharilela/word-counter)
- **Discord:** [@jym.god](https://discord.com/users/jym.god)
- **Email:** tools@emp0.com
- **Website:** [emp0.com](https://emp0.com)

---

## 📄 License
BUSL


