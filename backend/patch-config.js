const fs = require('fs');
const file = 'backend/src/config/chatbotConfig.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'export const MATCH_CONFIDENCE_THRESHOLD = parseFloat(\n  process.env.MATCH_CONFIDENCE_THRESHOLD || `${DEFAULT_MATCH_CONFIDENCE_THRESHOLD}`\n);',
  'export const MATCH_CONFIDENCE_THRESHOLD = DEFAULT_MATCH_CONFIDENCE_THRESHOLD;'
);

fs.writeFileSync(file, code);
