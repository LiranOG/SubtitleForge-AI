// ============================================================================
// Media Module — Audio Extraction via FFmpeg
// Extracts audio tracks from video files for transcription
// ============================================================================

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

// Point fluent-ffmpeg to the bundled ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Extract audio from a video file, saving as M4A (AAC).
 *
 * @param {string} inputPath - Path to the video file (.mp4, .webm)
 * @param {string} outputPath - Path for the extracted audio file
 * @returns {Promise<void>}
 */
export function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('aac')
      .audioBitrate('128k')
      .audioChannels(1) // Mono for better transcription quality
      .audioFrequency(16000) // 16kHz — optimal for Whisper
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('  FFmpeg started:', cmd);
      })
      .on('error', (err) => {
        console.error('  FFmpeg error:', err.message);
        reject(new Error(`Audio extraction failed: ${err.message}`));
      })
      .on('end', () => {
        console.log('  Audio extracted successfully');
        resolve();
      })
      .run();
  });
}
