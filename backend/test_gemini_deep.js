require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');

const ai = new GoogleGenAI({ apiKey });

async function testQuery(label, prompt) {
  const start = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    const elapsed = Date.now() - start;
    console.log(`\n--- ${label} (${elapsed}ms) ---`);
    console.log('Response:', (response.text || '').substring(0, 300));
    return true;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`\n--- ${label} FAILED (${elapsed}ms) ---`);
    console.log('Error:', err.message?.substring(0, 300));
    return false;
  }
}

(async () => {
  // Test 1: Simple greeting
  const t1 = await testQuery('Test 1: Greeting', 'Hello, how are you?');
  
  // Test 2: Medical question
  const t2 = await testQuery('Test 2: Medical', 'I have a headache and nausea, what should I do?');
  
  // Test 3: Intent classification - casual
  const t3 = await testQuery('Test 3: Intent - Casual', 
    `Classify the following user message into one of these categories:
- "medical": The user is asking about health, symptoms, diseases, treatments, or remedies
- "greeting": The user is saying hello, hi, hey, or similar greeting
- "chitchat": The user is making casual conversation unrelated to health
- "unclear": The message is too vague to determine intent

User message: "yo whats up"

Respond with ONLY a single JSON object: {"intent": "<category>", "confidence": <0-1>}`);

  // Test 4: Intent classification - medical
  const t4 = await testQuery('Test 4: Intent - Medical', 
    `Classify the following user message into one of these categories:
- "medical": The user is asking about health, symptoms, diseases, treatments, or remedies
- "greeting": The user is saying hello, hi, hey, or similar greeting  
- "chitchat": The user is making casual conversation unrelated to health
- "unclear": The message is too vague to determine intent

User message: "I feel like vomiting and have stomach pain"

Respond with ONLY a single JSON object: {"intent": "<category>", "confidence": <0-1>}`);

  // Test 5: Embedding generation
  try {
    const start = Date.now();
    const embResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: 'I have a headache',
    });
    const elapsed = Date.now() - start;
    const values = embResponse?.embeddings?.[0]?.values;
    console.log(`\n--- Test 5: Embedding (${elapsed}ms) ---`);
    console.log('Embedding length:', values?.length);
    console.log('First 5 values:', values?.slice(0, 5));
  } catch (err) {
    console.log('\n--- Test 5: Embedding FAILED ---');
    console.log('Error:', err.message?.substring(0, 300));
  }

  console.log('\n=== SUMMARY ===');
  console.log('Test 1 (Greeting):', t1 ? 'PASS' : 'FAIL');
  console.log('Test 2 (Medical):', t2 ? 'PASS' : 'FAIL');
  console.log('Test 3 (Intent casual):', t3 ? 'PASS' : 'FAIL');
  console.log('Test 4 (Intent medical):', t4 ? 'PASS' : 'FAIL');
})();
