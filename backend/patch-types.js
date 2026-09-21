const fs = require('fs');
const file = 'backend/src/services/ai/types.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'translateToEnglish(text: string, sourceLanguage?: string): Promise<TranslateResult>;',
  "translateToEnglish(text: string, sourceLanguage?: string): Promise<TranslateResult>;\n  classifyIntent?(text: string): Promise<'MEDICAL' | 'GREETING' | 'CHITCHAT' | 'UNCLEAR'>;"
);

fs.writeFileSync(file, code);
