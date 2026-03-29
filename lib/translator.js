// ============================================================================
// Translator Module — OpenAI GPT Translation Pipeline
// Translates English subtitles to Hebrew while preserving timestamps
// ============================================================================

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Process in batches to manage context and cost
const BATCH_SIZE = 20;

/**
 * Translate an array of subtitle segments from English to Hebrew.
 * Preserves exact timestamps and ensures high-quality contextual translation.
 *
 * @param {Array<{start: number, end: number, text: string}>} englishSegments
 * @param {function} onProgress - Progress callback (0-1)
 * @returns {Promise<Array<{start: number, end: number, text: string}>>}
 */
export async function translateSubtitles(englishSegments, onProgress = () => {}) {
  const hebrewSegments = [];
  const totalBatches = Math.ceil(englishSegments.length / BATCH_SIZE);

  for (let i = 0; i < englishSegments.length; i += BATCH_SIZE) {
    const batch = englishSegments.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);

    // Build a numbered list of texts for the LLM
    const numberedTexts = batch.map((seg, idx) => `${idx + 1}. ${seg.text}`).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `You are a professional English-to-Hebrew subtitle translator. 

Rules:
- Translate each numbered line from English to Hebrew.
- Keep the same numbering format (e.g., "1. translated text").
- Maintain the meaning and tone precisely.
- Use natural, fluent Hebrew — not word-for-word translation.
- Keep proper nouns, brand names, and technical terms in their original form when commonly used in Hebrew tech/academic contexts.
- Each line corresponds to a subtitle segment with specific timing, so keep translations roughly the same length as the original.
- Do NOT add or remove lines. Output EXACTLY the same number of lines as the input.
- Output ONLY the numbered translations, nothing else.`
        },
        {
          role: 'user',
          content: `Translate these subtitle lines to Hebrew:\n\n${numberedTexts}`
        }
      ]
    });

    const translatedText = response.choices[0].message.content.trim();
    const translatedLines = parseNumberedLines(translatedText, batch.length);

    // Map translations back to segments with original timestamps
    for (let j = 0; j < batch.length; j++) {
      hebrewSegments.push({
        start: batch[j].start,
        end: batch[j].end,
        text: translatedLines[j] || batch[j].text // Fallback to English if parsing fails
      });
    }

    onProgress((batchIndex + 1) / totalBatches);
  }

  return hebrewSegments;
}

/**
 * Parse the numbered lines from GPT's response.
 * Handles various formatting styles the model might use.
 */
function parseNumberedLines(text, expectedCount) {
  const lines = text.split('\n').filter(l => l.trim());
  const results = [];

  for (const line of lines) {
    // Strip numbering: "1. text", "1) text", "1: text", etc.
    const match = line.match(/^\d+[\.\)\:\-]\s*(.+)/);
    if (match) {
      results.push(match[1].trim());
    }
  }

  // If parsing didn't get the right count, try raw lines
  if (results.length !== expectedCount) {
    const rawLines = text.split('\n').filter(l => l.trim());
    if (rawLines.length === expectedCount) {
      return rawLines.map(l => l.replace(/^\d+[\.\)\:\-]\s*/, '').trim());
    }
  }

  return results;
}
