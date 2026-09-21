const fs = require('fs');
const file = 'backend/src/services/ai/gemini/geminiLLMService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'console.warn(`[GeminiLLMService] Model ${model} failed (${err.message}). Trying next candidate...`);',
  `console.warn(\`[GeminiLLMService] Model \${model} failed (\${err.message}).\`);
          if (err.status === 403 || err.status === 429 || err.status === 400 || (err.message && err.message.includes('429'))) {
             throw err; // Do not retry on permanent or quota errors
          }`
);

fs.writeFileSync(file, code);
