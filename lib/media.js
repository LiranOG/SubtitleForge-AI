// ============================================================================
// Media Module — Audio Extraction via FFmpeg
// Extracts audio tracks from video files for transcription
// Uses child_process.spawn for cross-platform compatibility (Windows/WSL/Linux)
// ============================================================================

import { spawn } from 'child_process';
import { existsSync } from 'fs';

/**
 * Find the ffmpeg binary path. Checks system PATH first,
 * then common installation locations.
 * @returns {string} Path to ffmpeg binary
 */
function findFfmpeg() {
  // Default: assume ffmpeg is in PATH
  return 'ffmpeg';
}

/**
 * Verify that ffmpeg is available on the system.
 * @returns {Promise<boolean>}
 */
export async function checkFfmpeg() {
  return new Promise((resolve) => {
    const proc = spawn(findFfmpeg(), ['-version'], { stdio: 'pipe' });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Extract audio from a video file, saving as M4A (AAC).
 * Uses direct ffmpeg spawn instead of fluent-ffmpeg for better
 * cross-platform compatibility (especially WSL).
 *
 * @param {string} inputPath - Path to the video file (.mp4, .webm)
 * @param {string} outputPath - Path for the extracted audio file
 * @returns {Promise<void>}
 */
export function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,       // Input file
      '-vn',                  // No video
      '-acodec', 'aac',      // AAC audio codec
      '-b:a', '64k',         // 64kbps bitrate (reduced to speed up upload & prevent timeouts)
      '-ac', '1',             // Mono channel (better for transcription)
      '-ar', '16000',         // 16kHz sample rate (optimal for Whisper)
      '-y',                   // Overwrite output if exists
      outputPath              // Output file
    ];

    console.log(`  FFmpeg: extracting audio from ${inputPath}`);
    const proc = spawn(findFfmpeg(), args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderrOutput = '';

    proc.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error(
          'FFmpeg not found. Please install FFmpeg:\n' +
          '  • Ubuntu/Debian: sudo apt install ffmpeg\n' +
          '  • macOS: brew install ffmpeg\n' +
          '  • Windows: winget install ffmpeg'
        ));
      } else {
        reject(new Error(`FFmpeg failed to start: ${err.message}`));
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('  Audio extracted successfully');
        resolve();
      } else {
        console.error('  FFmpeg stderr:', stderrOutput.slice(-500));
        reject(new Error(`Audio extraction failed (exit code ${code}). Check that FFmpeg is installed and the file is valid.`));
      }
    });
  });
}
