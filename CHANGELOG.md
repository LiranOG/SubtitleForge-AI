# Changelog

All notable changes to SubtitleForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-03-29

### 🎉 Initial Release

#### Added

- **Media Upload** — Drag & Drop interface accepting `.m4a`, `.mp4`, and `.webm` files
- **Audio Extraction** — Automatic FFmpeg-based audio extraction from video files (mono 16kHz AAC, optimized for Whisper)
- **English Transcription** — OpenAI Whisper API integration with `verbose_json` format and word-level + segment-level timestamp granularity
- **Smart Segmentation** — Automatic splitting of long segments (>10s) into subtitle-friendly chunks (~7 words per line)
- **Hebrew Translation** — GPT-4o powered English → Hebrew translation with subtitle-specific system prompting and batch processing (20 segments per request)
- **SRT Generation** — Standard SubRip format output with `HH:MM:SS,mmm` timestamps
- **VTT Generation** — Standard WebVTT format output with `HH:MM:SS.mmm` timestamps
- **UTF-8 BOM** — Byte Order Mark prepended to Hebrew subtitle files for player compatibility
- **Live Preview Player** — Built-in media player (video + audio) with real-time synced subtitle overlay
- **Language Toggle** — EN / עב / Dual subtitle display modes on the player
- **Subtitle Panel** — Scrollable, clickable subtitle list with automatic highlighting of active segment
- **Audio Visualizer** — Animated wave bar visualization for audio-only files
- **Async Job System** — Non-blocking processing pipeline with progress polling (`POST /api/upload` → `GET /api/job/:id`)
- **Pipeline Visualization** — Four-step animated progress indicator (Extract → Transcribe → Translate → Format)
- **Download System** — One-click SRT/VTT download for both English and Hebrew
- **Dark Mode UI** — Glassmorphism design system with ambient floating orbs, gradient accents, and micro-animations
- **Responsive Design** — Mobile-first layout with breakpoints at 768px and 480px
- **Error Handling** — Toast notifications for upload errors, processing failures, and unsupported file types
- **Health Endpoint** — `GET /api/health` for monitoring
- **Security** — API keys server-side only; `.env` excluded via `.gitignore`
- **Bundled FFmpeg** — No system FFmpeg installation required (`ffmpeg-static` package)

#### Technical Details

- **Runtime:** Node.js 20+ with ES Modules (`"type": "module"`)
- **Framework:** Express 4.21+
- **Dependencies:** `openai`, `multer`, `fluent-ffmpeg`, `ffmpeg-static`, `dotenv`
- **Frontend:** Vanilla HTML/CSS/JS with Inter + JetBrains Mono fonts (Google Fonts)
- **Design:** ~560 lines of custom CSS with CSS Custom Properties design token system

---

## [Unreleased]

### Planned
- Additional language support (Arabic, Russian, Spanish)
- Docker containerization
- WebSocket for real-time progress (replace polling)
- In-browser subtitle editor
- Batch file processing
- PWA support
