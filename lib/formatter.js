// ============================================================================
// Formatter Module — SRT and VTT Subtitle Generation
// Converts segment arrays to standard subtitle file formats
// ============================================================================

/**
 * Format seconds into SRT timestamp: HH:MM:SS,mmm
 */
function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return (
    String(h).padStart(2, '0') + ':' +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0') + ',' +
    String(ms).padStart(3, '0')
  );
}

/**
 * Format seconds into VTT timestamp: HH:MM:SS.mmm
 */
function formatVTTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return (
    String(h).padStart(2, '0') + ':' +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0') + '.' +
    String(ms).padStart(3, '0')
  );
}

/**
 * Generate an SRT subtitle file from an array of segments.
 *
 * @param {Array<{start: number, end: number, text: string}>} segments
 * @returns {string} SRT file content
 */
export function generateSRT(segments) {
  return segments.map((seg, i) => {
    return `${i + 1}\n${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}\n${seg.text}\n`;
  }).join('\n');
}

/**
 * Generate a WebVTT subtitle file from an array of segments.
 *
 * @param {Array<{start: number, end: number, text: string}>} segments
 * @returns {string} VTT file content
 */
export function generateVTT(segments) {
  const header = 'WEBVTT\n\n';
  const cues = segments.map((seg, i) => {
    return `${i + 1}\n${formatVTTTime(seg.start)} --> ${formatVTTTime(seg.end)}\n${seg.text}\n`;
  }).join('\n');

  return header + cues;
}
