// Quick diagnostic: tests if OpenAI API is reachable at all
// Run with: node test-api.mjs
import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetch: globalThis.fetch
});

console.log('\n🔍 Testing OpenAI API connectivity...\n');

try {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say "API OK" and nothing else.' }],
    max_tokens: 10
  });
  console.log('✅ API connection WORKS!');
  console.log('   Response:', res.choices[0].message.content);
  console.log('\n📌 Conclusion: The API key is valid and the network reaches OpenAI.');
  console.log('   The ECONNRESET is specific to FILE UPLOADS (Whisper multipart).');
  console.log('   This is almost certainly ANTIVIRUS / Windows Defender SSL inspection.\n');
  console.log('👉 Fix: Temporarily disable "Real-time protection" or add an exception for:');
  console.log('   Process: node.exe');
  console.log('   Domain:  api.openai.com\n');
} catch (err) {
  console.log('❌ API connection FAILED:', err.message);
  if (err.message.includes('ECONNRESET') || err.message.includes('Connection error')) {
    console.log('\n📌 Conclusion: Even basic API calls fail.');
    console.log('   The entire openai.com domain is being blocked.');
    console.log('\n👉 Possible fixes:');
    console.log('   1. Try a different network (mobile hotspot)');
    console.log('   2. Check Windows Defender Firewall for outbound blocks on node.exe');
    console.log('   3. Try: netsh winhttp set proxy <your_proxy_address>');
  } else {
    console.log('📌 Error type:', err.constructor.name);
  }
}
