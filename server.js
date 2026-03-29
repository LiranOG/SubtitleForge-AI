// ============================================================================
// SubtitleForge — Main Server
// Express server handling file upload, transcription, translation, and serving
// ============================================================================

import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { transcribeAudio } from './lib/transcriber.js';
import { translateSubtitles } from './lib/translator.js';
import { generateSRT, generateVTT } from './lib/formatter.js';
import { extractAudio } from './lib/media.js';
import { runChecks } from './lib/check-env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 500) * 1024 * 1024;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['.m4a', '.mp4', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`));
    }
  }
});

// ---------------------------------------------------------------------------
// In-memory job store (production would use Redis/DB)
// ---------------------------------------------------------------------------
const jobs = new Map();

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload & start processing
app.post('/api/upload', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate API key before starting job
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-your')) {
      // Cleanup uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(500).json({
        error: 'OpenAI API key not configured. Please add your key to the .env file.'
      });
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Create job entry
    jobs.set(jobId, {
      status: 'processing',
      progress: 0,
      stage: 'Initializing...',
      filePath,
      originalName: req.file.originalname,
      mediaUrl: `/api/media/${path.basename(filePath)}`,
      result: null,
      error: null
    });

    res.json({ jobId, mediaUrl: `/api/media/${path.basename(filePath)}` });

    // --- Run pipeline asynchronously ---
    processJob(jobId, filePath, ext).catch(err => {
      console.error(`Job ${jobId} failed:`, err);
      const job = jobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = err.message;
      }
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Poll job status
app.get('/api/job/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    result: job.result,
    error: job.error
  });
});

// Serve uploaded media for the player
app.get('/api/media/:filename', (req, res) => {
  // Sanitize filename to prevent path traversal
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(filePath);
});

// Download subtitles
app.get('/api/download/:jobId/:lang/:format', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || !job.result) return res.status(404).json({ error: 'Subtitles not ready' });

  const { lang, format } = req.params;

  // Validate params
  if (!['en', 'he'].includes(lang)) return res.status(400).json({ error: 'Invalid language. Use: en, he' });
  if (!['srt', 'vtt'].includes(format)) return res.status(400).json({ error: 'Invalid format. Use: srt, vtt' });

  const segments = lang === 'he' ? job.result.hebrew : job.result.english;

  if (!segments) return res.status(400).json({ error: `Language '${lang}' not available` });

  let content, mime, ext;
  if (format === 'vtt') {
    content = generateVTT(segments);
    mime = 'text/vtt';
    ext = '.vtt';
  } else {
    content = generateSRT(segments);
    mime = 'application/x-subrip';
    ext = '.srt';
  }

  // Use BOM for Hebrew to ensure proper encoding in players
  const bom = lang === 'he' ? '\uFEFF' : '';
  const baseName = path.basename(job.originalName, path.extname(job.originalName));

  res.setHeader('Content-Type', `${mime}; charset=utf-8`);
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}_${lang}${ext}"`);
  res.send(bom + content);
});

// ---------------------------------------------------------------------------
// Processing Pipeline
// ---------------------------------------------------------------------------
async function processJob(jobId, filePath, ext) {
  const job = jobs.get(jobId);

  // Step 1: Extract audio if video
  let audioPath = filePath;
  if (ext === '.mp4' || ext === '.webm') {
    job.stage = 'Extracting audio from video...';
    job.progress = 5;
    audioPath = filePath.replace(ext, '.m4a');
    await extractAudio(filePath, audioPath);
  }

  // Step 2: Transcribe with Whisper
  job.stage = 'Transcribing audio with Whisper AI...';
  job.progress = 15;
  const englishSegments = await transcribeAudio(audioPath, (p) => {
    job.progress = 15 + Math.round(p * 45); // 15-60%
  });

  // Step 3: Translate to Hebrew
  job.stage = 'Translating to Hebrew...';
  job.progress = 60;
  const hebrewSegments = await translateSubtitles(englishSegments, (p) => {
    job.progress = 60 + Math.round(p * 30); // 60-90%
  });

  // Step 4: Done
  job.stage = 'Complete!';
  job.progress = 100;
  job.status = 'complete';
  job.result = {
    english: englishSegments,
    hebrew: hebrewSegments
  };

  // Cleanup extracted audio if separate from original
  if (audioPath !== filePath && fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }
}

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Maximum size: ${MAX_SIZE / (1024*1024)}MB` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function start() {
  // Run environment checks
  console.log('\n  🔍 Environment Check:');
  const { ok, messages } = await runChecks();
  messages.forEach(m => console.log(`     ${m}`));
  console.log('');

  if (!ok) {
    console.error('  ❌ Critical issues detected. Fix them before running.\n');
    process.exit(1);
  }

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`  ⚡ SubtitleForge running at http://localhost:${PORT}\n`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n  Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      // Cleanup any uploaded files from incomplete jobs
      console.log('  Server closed.');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
