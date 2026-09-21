require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testQuery(label, model, prompt) {
  const start = Date.now();
  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    const elapsed = Date.now() - start;
    console.log(`\n--- ${label} [${model}] (${elapsed}ms) ---`);
    console.log('Response:', (response.text || '').substring(0, 400));
    return { ok: true, elapsed };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`\n--- ${label} [${model}] FAILED (${elapsed}ms) ---`);
    console.log('Error:', err.message?.substring(0, 200));
    return { ok: false, elapsed };
  }
}

(async () => {
  // Test working models
  const models = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
  
  for (const model of models) {
    await testQuery(`Simple greeting`, model, 'Hello!');
  }

  // Test intent classification with gemini-3.5-flash (confirmed working)
  console.log('\n========= INTENT CLASSIFICATION TESTS =========');
  
  const intentPrompt = (msg) => `Classify this user message. Reply with ONLY one word: MEDICAL, GREETING, or CHITCHAT.
User message: "${msg}"
Category:`;

  const tests = [
    'Hello', 'yo', 'hey whats up', 'good morning',
    'I have a headache', 'I feel like vomiting', 'my child has fever',
    'whats the weather today', 'tell me a joke', 'lol ok bye'
  ];

  for (const t of tests) {
    await testQuery(`Intent: "${t}"`, 'gemini-3.5-flash', intentPrompt(t));
  }

  // Test embedding dimension
  console.log('\n========= EMBEDDING TESTS =========');
  const embResponse = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: 'I have severe migraine',
  });
  console.log('Embedding model: gemini-embedding-001');
  console.log('Dimension:', embResponse?.embeddings?.[0]?.values?.length);
})();
