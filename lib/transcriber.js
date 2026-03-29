// ============================================================================
// Transcriber Module — OpenAI Whisper Integration
// Handles audio transcription with word-level timestamps
// ============================================================================

import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Transcribe an audio file using OpenAI Whisper API with word-level timestamps.
 * Returns an array of subtitle segments: { start, end, text }
 *
 * @param {string} audioPath - Path to the audio file
 * @param {function} onProgress - Progress callback (0-1)
 * @returns {Promise<Array<{start: number, end: number, text: string}>>}
 */
export async function transcribeAudio(audioPath, onProgress = () => {}) {
  onProgress(0.1);

  // Use verbose_json response format for word-level timestamps
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
    language: 'en'
  });

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
  const wordsPerSecond = words.length / totalDuration;

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
