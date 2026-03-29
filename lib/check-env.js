// ============================================================================
// Environment Check — Pre-flight validation
// Run with: npm run check
// Also called automatically on server startup
// ============================================================================

import { checkFfmpeg } from './media.js';

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

/**
 * Run all environment checks and return { ok, messages }.
 * Does NOT throw — just reports what's wrong.
 */
export async function runChecks() {
  const messages = [];
  let ok = true;

  // 1. Node.js version
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0]);
  if (major >= 18) {
    messages.push(`${PASS} Node.js v${nodeVersion}`);
  } else {
    messages.push(`${FAIL} Node.js v${nodeVersion} — requires v18+`);
    ok = false;
  }

  // 2. Platform info (helpful for debugging WSL issues)
  const platform = process.platform;
  const arch = process.arch;
  messages.push(`${PASS} Platform: ${platform} (${arch})`);

  // 3. Check if running Windows Node inside WSL (common mistake)
  if (platform === 'win32' && process.env.WSL_DISTRO_NAME) {
    messages.push(`${FAIL} Detected Windows Node.js inside WSL!`);
    messages.push(`     You need to install Node.js natively in your Linux distro:`);
    messages.push(`     → curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`);
    messages.push(`     → sudo apt-get install -y nodejs`);
    ok = false;
  }

  // 4. OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && !apiKey.startsWith('sk-your')) {
    messages.push(`${PASS} OpenAI API key configured`);
  } else {
    messages.push(`${WARN} OpenAI API key not set (required for processing)`);
    messages.push(`     → cp .env.example .env && nano .env`);
  }

  // 5. FFmpeg
  const hasFfmpeg = await checkFfmpeg();
  if (hasFfmpeg) {
    messages.push(`${PASS} FFmpeg available`);
  } else {
    messages.push(`${WARN} FFmpeg not found (required for video files)`);
    if (platform === 'linux') {
      messages.push(`     → sudo apt install ffmpeg`);
    } else if (platform === 'darwin') {
      messages.push(`     → brew install ffmpeg`);
    } else {
      messages.push(`     → winget install ffmpeg`);
    }
  }

  return { ok, messages };
}

// If run directly as a script: npm run check
const isDirectRun = process.argv[1] && process.argv[1].includes('check-env');
if (isDirectRun) {
  console.log('\n  🔍 SubtitleForge Environment Check\n');

  // Load dotenv manually when run as standalone script
  const { config } = await import('dotenv');
  config();

  const { ok, messages } = await runChecks();
  messages.forEach(m => console.log(`  ${m}`));
  console.log('');

  if (ok) {
    console.log('  ✅ All checks passed! Run: npm start\n');
  } else {
    console.log('  ❌ Some checks failed. Fix the issues above and try again.\n');
    process.exit(1);
  }
}
