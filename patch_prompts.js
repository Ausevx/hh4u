const fs = require('fs');
const file = 'backend/src/services/ai/gemini/geminiLLMService.ts';
let code = fs.readFileSync(file, 'utf8');

const strictInstruction = `\\n\\nCRITICAL INSTRUCTION: Do NOT use any markdown formatting (no hashes #, no asterisks ** for bolding, no bullet points). Use plain text suitable for a standard mobile chat bubble. Keep the response very concise (max 3 sentences) and include 1 or 2 friendly emojis.`;

code = code.replace(
  `IMPORTANT: You MUST generate your response in the following language: \${targetLanguage}.';`,
  `IMPORTANT: You MUST generate your response in the following language: \${targetLanguage}.${strictInstruction}\`;`
);

code = code.replace(
  `Respond directly (no JSON, no formatting):\`;`,
  `Respond directly (no JSON, no formatting):\${strictInstruction}\`;`
);

fs.writeFileSync(file, code);
