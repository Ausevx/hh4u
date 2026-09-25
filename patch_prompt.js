const fs = require('fs');
const file = 'backend/src/services/ai/gemini/geminiLLMService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'accurately reflects the standard template advice in the requested language.`',
  'accurately reflects the standard template advice in the requested language.\n\nCRITICAL INSTRUCTION: Do NOT use any markdown formatting (no hashes, no asterisks for bolding). Use plain text suitable for a standard mobile chat bubble. Keep the response very concise (max 3 sentences) and include 1 or 2 friendly emojis.`'
);

fs.writeFileSync(file, code);
