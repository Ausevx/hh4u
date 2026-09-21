const fs = require('fs');
const file = 'backend/src/services/ai/mock/mockLLMService.ts';
let code = fs.readFileSync(file, 'utf8');

const mockClassifyIntent = `
  public async classifyIntent(text: string): Promise<'MEDICAL' | 'GREETING' | 'CHITCHAT' | 'UNCLEAR'> {
    const lower = text.toLowerCase();
    if (lower.match(/^(hi|hello|hey|yo)/)) return 'GREETING';
    if (lower.includes('weather') || lower.includes('joke')) return 'CHITCHAT';
    return 'MEDICAL';
  }

  public async translateToEnglish`;

code = code.replace('public async translateToEnglish', mockClassifyIntent);
fs.writeFileSync(file, code);
