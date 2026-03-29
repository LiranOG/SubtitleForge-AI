<div align="center">

# ⚡ SubtitleForge

### AI-Powered Subtitle Generator for NotebookLM

*Generate pixel-perfect, word-for-word synchronized subtitles in English and Hebrew — automatically.*

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Whisper%20%2B%20GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-A29BFE?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-00CEC9?style=for-the-badge)](CONTRIBUTING.md)

<br />

[**Getting Started**](#-getting-started) · [**Features**](#-features) · [**Architecture**](#-architecture) · [**API Reference**](#-api-reference) · [**Contributing**](#-contributing)

<br />

---

</div>

## 🎯 What is SubtitleForge?

SubtitleForge is a full-stack web application designed specifically for [Google NotebookLM](https://notebooklm.google.com/) users who create **Audio Overviews** and **Video Overviews**. It takes your generated media files and automatically produces:

- 🎙️ **Precise English transcription** using OpenAI's Whisper model with word-level timestamps
- 🇮🇱 **High-quality Hebrew translation** using GPT-4o, calibrated for natural subtitle length
- 📝 **Standard subtitle files** in both `.SRT` and `.VTT` formats
- ▶️ **Live preview** with a built-in media player and real-time synced subtitles

> **Why?** NotebookLM generates incredible audio/video summaries, but provides no subtitle support. SubtitleForge bridges that gap — making your content accessible in multiple languages with zero manual effort.

<br />

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎬 Media Support
- Drag & Drop upload interface
- Supports `.m4a`, `.mp4`, and `.webm` files
- Automatic audio extraction from video via FFmpeg
- Handles files up to 500MB (configurable)

</td>
<td width="50%">

### 🤖 AI Processing
- OpenAI Whisper API with `verbose_json` format
- Word-level + segment-level timestamp granularity
- Intelligent long-segment splitting (~7 words per line)
- GPT-4o translation with subtitle-specific prompting

</td>
</tr>
<tr>
<td width="50%">

### 🌍 Dual-Language Output
- English and Hebrew subtitle generation
- `.SRT` format (universal compatibility)
- `.VTT` format (web-native, HTML5 players)
- UTF-8 BOM encoding for Hebrew player support

</td>
<td width="50%">

### 🎨 Premium Dark UI
- Glassmorphism design with ambient light orbs
- Animated processing pipeline visualization
- Built-in media player with subtitle overlay
- Real-time EN / עב / Dual language toggle

</td>
</tr>
</table>

<br />

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| [Node.js](https://nodejs.org/) | 18+ (recommended 20+) | Runtime environment |
| [OpenAI API Key](https://platform.openai.com/api-keys) | — | Whisper transcription + GPT-4o translation |

> **Note:** FFmpeg is **not** required as a system dependency. SubtitleForge bundles it automatically via [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static).

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/subtitle-forge.git
cd subtitle-forge

# Install dependencies
npm install

# Create your environment configuration
cp .env.example .env    # macOS/Linux
copy .env.example .env  # Windows
```

### Configuration

Edit the `.env` file and add your OpenAI API key:

```env
# Required — Get yours at https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-your-key-here

# Optional
PORT=3000              # Server port (default: 3000)
MAX_FILE_SIZE_MB=500   # Upload size limit in MB (default: 500)
```

### Launch

```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

Open your browser at **http://localhost:3000** — you're ready to go! 🎉

<br />

## 🏗️ Architecture

### Why Full-Stack?

| Concern | Approach | Rationale |
|---------|----------|-----------|
| **API Key Security** | Server-side only | Keys never touch the browser — no client exposure risk |
| **Media Processing** | Server-side FFmpeg | Audio extraction from video requires binary execution |
| **Large Files** | Multer streaming | Handles multipart uploads with size validation |
| **Pipeline** | Async job model | Prevents HTTP timeouts; enables real-time progress polling |

### Project Structure

```
subtitle-forge/
│
├── server.js                    # Express server
│   ├── POST /api/upload         #   File upload → job creation
│   ├── GET  /api/job/:id        #   Job status polling
│   ├── GET  /api/media/:file    #   Serve uploaded media
│   └── GET  /api/download/...   #   SRT/VTT file download
│
├── lib/
│   ├── transcriber.js           # Whisper API integration
│   │   ├── transcribeAudio()    #   verbose_json + word/segment timestamps
│   │   └── splitLongSegment()   #   Smart chunking for readability
│   │
│   ├── translator.js            # GPT-4o translation pipeline
│   │   ├── translateSubtitles() #   Batch processing (20 segments/request)
│   │   └── parseNumberedLines() #   Robust response parsing
│   │
│   ├── formatter.js             # Subtitle file generation
│   │   ├── generateSRT()        #   SubRip format (HH:MM:SS,mmm)
│   │   └── generateVTT()        #   WebVTT format (HH:MM:SS.mmm)
│   │
│   └── media.js                 # FFmpeg audio extraction
│       └── extractAudio()       #   Video → mono 16kHz AAC (Whisper-optimal)
│
├── public/
│   ├── index.html               # Semantic HTML with ARIA accessibility
│   ├── styles.css               # CSS design system (~560 lines)
│   └── app.js                   # Client-side application logic
│
├── .env.example                 # Environment template
├── .gitignore                   # Excludes .env, node_modules, uploads
├── package.json                 # Dependencies and scripts
├── LICENSE                      # MIT License
├── CONTRIBUTING.md              # Contribution guidelines
├── CHANGELOG.md                 # Version history
└── README.md                    # This file
```

### Processing Pipeline

```
┌──────────────┐     ┌───────────────┐     ┌─────────────────┐     ┌────────────┐
│   Upload     │────▶│ Audio Extract │────▶│ Whisper API     │────▶│ GPT-4o     │
│  .m4a/.mp4/  │     │ (FFmpeg)      │     │ Transcription   │     │ Translation│
│  .webm       │     │ mono 16kHz    │     │ EN + timestamps │     │ EN → HE    │
└──────────────┘     └───────────────┘     └─────────────────┘     └────────────┘
                                                                          │
                           ┌─────────────────────────────────────────────┘
                           ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  SRT / VTT   │     │ Live Preview │
                    │  Generation  │     │   Player     │
                    │  EN + HE     │     │  EN/HE/Dual  │
                    └──────────────┘     └──────────────┘
```

<br />

## 📡 API Reference

### `POST /api/upload`

Upload a media file to start processing.

| Parameter | Type | Description |
|-----------|------|-------------|
| `media` | `File` (multipart) | `.m4a`, `.mp4`, or `.webm` file |

**Response** `200 OK`
```json
{
  "jobId": "job-1711734000-a1b2c3",
  "mediaUrl": "/api/media/1711734000-a1b2c3.m4a"
}
```

---

### `GET /api/job/:jobId`

Poll the processing status of a job.

**Response** `200 OK`
```json
{
  "status": "processing",       // "processing" | "complete" | "error"
  "progress": 45,               // 0-100
  "stage": "Transcribing audio with Whisper AI...",
  "result": null,               // Populated when status=complete
  "error": null                 // Populated when status=error
}
```

**When `status: "complete"`:**
```json
{
  "status": "complete",
  "progress": 100,
  "stage": "Complete!",
  "result": {
    "english": [
      { "start": 0.0, "end": 3.24, "text": "Welcome to today's deep dive." },
      { "start": 3.24, "end": 7.12, "text": "We're going to explore something fascinating." }
    ],
    "hebrew": [
      { "start": 0.0, "end": 3.24, "text": "ברוכים הבאים לצלילה העמוקה של היום." },
      { "start": 3.24, "end": 7.12, "text": "אנחנו הולכים לחקור משהו מרתק." }
    ]
  }
}
```

---

### `GET /api/download/:jobId/:lang/:format`

Download subtitle files.

| Parameter | Values | Description |
|-----------|--------|-------------|
| `lang` | `en`, `he` | Subtitle language |
| `format` | `srt`, `vtt` | Subtitle file format |

**Response:** File download with appropriate headers.

---

### `GET /api/media/:filename`

Stream the uploaded media file (used by the built-in player).

---

### `GET /api/health`

Health check endpoint.

```json
{ "status": "ok", "timestamp": "2026-03-29T16:25:00.000Z" }
```

<br />

## 🔧 Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 20+ | JavaScript server environment |
| **Framework** | Express | 4.21+ | HTTP routing, middleware, static serving |
| **Upload** | Multer | 1.4+ | Multipart file upload with validation |
| **AI — Speech** | OpenAI Whisper | whisper-1 | Speech-to-text with word-level timestamps |
| **AI — Translation** | OpenAI GPT-4o | gpt-4o | Context-aware English → Hebrew translation |
| **Media** | fluent-ffmpeg | 2.1+ | Node.js FFmpeg wrapper |
| **FFmpeg Binary** | ffmpeg-static | 5.2+ | Bundled FFmpeg (no system install needed) |
| **Config** | dotenv | 16.4+ | Environment variable management |
| **Frontend** | Vanilla HTML/CSS/JS | — | Zero-dependency client |
| **Typography** | Inter + JetBrains Mono | — | Google Fonts |

<br />

## 🎨 Design System

SubtitleForge uses a custom **glassmorphism dark-mode** design system built from scratch:

- **Color Palette:** Deep charcoals (`#0a0a0f`, `#12121a`) with purple (`#6C5CE7`) and cyan (`#00CEC9`) accents
- **Glass Effects:** `backdrop-filter: blur(20px) saturate(150%)` with semi-transparent backgrounds
- **Ambient Background:** Three floating gradient orbs with CSS `@keyframes float` animation
- **Typography:** Inter (UI) + JetBrains Mono (code/timestamps) via Google Fonts
- **Micro-animations:** Fade-in-up sections, pulse indicators, hover transforms, progress bar glow
- **Responsive:** Mobile-first breakpoints at 768px and 480px

<br />

## 🤔 FAQ

<details>
<summary><strong>Does this work with any audio/video, or only NotebookLM?</strong></summary>
<br />
It works with any English-language audio or video in <code>.m4a</code>, <code>.mp4</code>, or <code>.webm</code> format. However, it's specifically optimized for the conversational style of NotebookLM Audio/Video Overviews.
</details>

<details>
<summary><strong>How much does it cost per file?</strong></summary>
<br />
Costs depend on your file length:

- **Whisper API:** ~$0.006 per minute of audio
- **GPT-4o Translation:** ~$0.01–0.05 depending on transcript length

A typical 10-minute NotebookLM overview costs approximately **$0.10–0.15** to process.
</details>

<details>
<summary><strong>Can I add more languages beyond Hebrew?</strong></summary>
<br />
Yes! The translation module (<code>lib/translator.js</code>) can be extended to support any language. You would modify the system prompt and add a new language option to the frontend. See <a href="CONTRIBUTING.md">CONTRIBUTING.md</a> for guidance.
</details>

<details>
<summary><strong>Is there a file size limit?</strong></summary>
<br />
Default is 500MB, configurable via <code>MAX_FILE_SIZE_MB</code> in your <code>.env</code> file. Note that the OpenAI Whisper API has a 25MB audio limit — for larger files, the server extracts and compresses audio before sending.
</details>

<details>
<summary><strong>Can I self-host this?</strong></summary>
<br />
Absolutely. SubtitleForge is a standard Node.js app. You can deploy it on any VPS, cloud instance, or container platform. Just set your <code>OPENAI_API_KEY</code> environment variable and expose port 3000.
</details>

<br />

## 🗺️ Roadmap

- [ ] 🌐 Additional language support (Arabic, Russian, Spanish, etc.)
- [ ] 📊 Audio waveform visualization with Web Audio API
- [ ] 🔄 Batch processing for multiple files
- [ ] ✏️ In-browser subtitle editor with manual corrections
- [ ] 🐳 Docker container for one-command deployment
- [ ] 🔌 WebSocket for real-time progress (replace polling)
- [ ] 📱 PWA support for mobile usage
- [ ] 🎛️ Advanced settings (model selection, temperature, segment length)

<br />

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Setting up your development environment
- Code style and conventions
- Submitting pull requests
- Reporting bugs and requesting features

<br />

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br />

---

<div align="center">

**Built with ❤️ using [OpenAI Whisper](https://openai.com/research/whisper) & [GPT-4o](https://openai.com/gpt-4o)**

⭐ Star this repo if you find it useful!

</div>
