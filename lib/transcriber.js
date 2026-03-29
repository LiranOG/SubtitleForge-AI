// ============================================================================
// Transcriber Module — OpenAI Whisper Integration
// Handles audio transcription with word-level timestamps
// ============================================================================

import OpenAI, { toFile } from 'openai';
import fs from 'fs';

const WHISPER_MAX_BYTES = 25 * 1024 * 1024; // 25MB — OpenAI hard limit
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000; // Wait 3s between retries

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 5 * 60 * 1000, // 5 minutes timeout for large file uploads
  fetch: globalThis.fetch  // Use Node.js 18+ native fetch — avoids node-fetch ECONNRESET bug on Windows
});

/**
 * Wait for a given number of milliseconds.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call the Whisper API with manual retry logic for network-level errors
 * (like ECONNRESET) that the SDK's built-in maxRetries doesn't catch.
 */
async function callWhisperWithRetry(audioPath, attempt = 1) {
  try {
    console.log(`  Whisper API: attempt ${attempt}/${MAX_RETRIES}...`);

    // Load the entire file into memory as a Buffer.
    // This avoids ECONNRESET errors caused by streaming multipart uploads on Windows.
    const audioBuffer = fs.readFileSync(audioPath);
    const audioFile = await toFile(audioBuffer, 'audio.m4a', { type: 'audio/m4a' });

    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
      language: 'en'
    });
    return result;
  } catch (err) {
    // Detect quota / billing errors immediately — no point retrying
    if (err.status === 429) {
      throw new Error(
        'OpenAI API quota exceeded (429). Your account has run out of credits. ' +
        'Please add credits at: https://platform.openai.com/settings/billing'
      );
    }

    const isNetworkError = err.cause?.code === 'ECONNRESET' ||
                           err.cause?.code === 'ECONNREFUSED' ||
                           err.cause?.code === 'ETIMEDOUT' ||
                           err.message?.includes('Connection error');

    if (isNetworkError && attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * attempt; // exponential backoff: 3s, 6s, 9s
      console.warn(`  Network error on attempt ${attempt}. Retrying in ${delay / 1000}s...`);
      await sleep(delay);
      return callWhisperWithRetry(audioPath, attempt + 1);
    }

    // Final failure — enrich error message
    if (isNetworkError) {
      throw new Error(
        `Connection to OpenAI failed after ${MAX_RETRIES} attempts (ECONNRESET). ` +
        'Possible causes: file too large (>25MB), firewall/antivirus blocking TLS, or unstable internet connection.'
      );
    }

    throw err; // Re-throw non-network errors as-is
  }
}

/**
 * Transcribe an audio file using OpenAI Whisper API with word-level timestamps.
 * Returns an array of subtitle segments: { start, end, text }
 *
 * @param {string} audioPath - Path to the audio file
 * @param {function} onProgress - Progress callback (0-1)
 * @returns {Promise<Array<{start: number, end: number, text: string}>>}
 */
export async function transcribeAudio(audioPath, onProgress = () => {}) {
  // Check file size before uploading — Whisper API limit is 25MB
  const stats = fs.statSync(audioPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);
  console.log(`  Audio file size: ${fileSizeMB}MB`);

  if (stats.size > WHISPER_MAX_BYTES) {
    throw new Error(
      `Audio file is ${fileSizeMB}MB, which exceeds the Whisper API limit of 25MB. ` +
      'Please use a shorter audio clip or reduce the file size.'
    );
  }

  onProgress(0.1);

  const transcription = await callWhisperWithRetry(audioPath);

  onProgress(0.8);

  // The API returns segments with start/end times
  // We use segments (sentence-level) as our base, since they make better subtitles
  const segments = transcription.segments || [];

  if (segments.length === 0) {
    throw new Error('No speech detected in the audio file.');
  }

  // Build subtitle segments — split long segments for readability
  const subtitleSegments = [];

  for (const seg of segments) {
    const words = seg.text.trim();
    if (!words) continue;

    // If a segment is too long (>10 seconds), try to split it
    const duration = seg.end - seg.start;
    if (duration > 10 && words.split(' ').length > 15) {
      const splitSegments = splitLongSegment(seg);
      subtitleSegments.push(...splitSegments);
    } else {
      subtitleSegments.push({
        start: seg.start,
        end: seg.end,
        text: words
      });
    }
  }

  onProgress(1.0);
  return subtitleSegments;
}

/**
 * Split a long segment into smaller chunks for better subtitle readability.
 * Uses simple heuristics to break on natural pauses.
 */
function splitLongSegment(segment) {
  const words = segment.text.trim().split(/\s+/);
  const totalDuration = segment.end - segment.start;

  // Aim for ~5-8 words per subtitle line
  const targetWordsPerChunk = 7;
  const chunks = [];
  let currentChunk = [];
  let chunkStartIdx = 0;

  for (let i = 0; i < words.length; i++) {
    currentChunk.push(words[i]);

    const isEndOfSentence = /[.!?]$/.test(words[i]);
    const isLongEnough = currentChunk.length >= targetWordsPerChunk;
    const isLast = i === words.length - 1;

    if ((isEndOfSentence && currentChunk.length >= 3) || isLongEnough || isLast) {
      const startFrac = chunkStartIdx / words.length;
      const endFrac = (i + 1) / words.length;

      chunks.push({
        start: +(segment.start + startFrac * totalDuration).toFixed(3),
        end: +(segment.start + endFrac * totalDuration).toFixed(3),
        text: currentChunk.join(' ')
      });

      currentChunk = [];
      chunkStartIdx = i + 1;
    }
  }

  return chunks;
}
