require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testQuery(label, model, prompt) {
  const start = Date.now();
  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    const elapsed = Date.now() - start;
    console.log(`\n--- ${label} [${model}] (${elapsed}ms) ---`);
    console.log('Response:', (response.text || '').substring(0, 300));
    return { ok: true, elapsed };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`\n--- ${label} [${model}] FAILED (${elapsed}ms) ---`);
    console.log('Error:', err.message?.substring(0, 200));
    return { ok: false, elapsed };
  }
}

(async () => {
  // Test with gemini-2.5-flash (the cheapest/fastest available model)
  const t1 = await testQuery('Greeting', 'gemini-2.5-flash', 'Hello!');
  
  const t2 = await testQuery('Medical Q', 'gemini-2.5-flash', 'I feel like vomiting and have a headache');
  
  const t3 = await testQuery('Intent classify', 'gemini-2.5-flash', 
    `Classify this user message. Reply with ONLY one word: MEDICAL, GREETING, or CHITCHAT.
User message: "yo whats up"
Category:`);

  const t4 = await testQuery('Intent classify medical', 'gemini-2.5-flash', 
    `Classify this user message. Reply with ONLY one word: MEDICAL, GREETING, or CHITCHAT.
User message: "I have severe stomach pain and nausea"
Category:`);

  // Test embedding
  try {
    const start = Date.now();
    const embResponse = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: 'I have a headache',
    });
    const elapsed = Date.now() - start;
    const values = embResponse?.embeddings?.[0]?.values;
    console.log(`\n--- Embedding [gemini-embedding-001] (${elapsed}ms) ---`);
    console.log('Embedding dimension:', values?.length);
  } catch (err) {
    console.log('\n--- Embedding FAILED ---');
    console.log('Error:', err.message?.substring(0, 200));
  }

  // Test gemini-3.5-flash too
  const t5 = await testQuery('Greeting (3.5-flash)', 'gemini-3.5-flash', 'Hello!');

  console.log('\n=== SUMMARY ===');
  console.log(`Greeting (2.5-flash): ${t1.ok ? 'PASS' : 'FAIL'} (${t1.elapsed}ms)`);
  console.log(`Medical (2.5-flash): ${t2.ok ? 'PASS' : 'FAIL'} (${t2.elapsed}ms)`);
  console.log(`Intent casual: ${t3.ok ? 'PASS' : 'FAIL'} (${t3.elapsed}ms)`);
  console.log(`Intent medical: ${t4.ok ? 'PASS' : 'FAIL'} (${t4.elapsed}ms)`);
  console.log(`Greeting (3.5-flash): ${t5.ok ? 'PASS' : 'FAIL'} (${t5.elapsed}ms)`);
})();
