const fs = require('fs');
const file = 'backend/src/services/ai/gemini/geminiLLMService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'if (context?.homeRemedyText) advice += `Home Care: ${context.homeRemedyText}\\n`;',
  'if (context?.homeRemedyText && context.homeRemedyText !== context.remedy) advice += `Home Care: ${context.homeRemedyText}\\n`;'
);

code = code.replace(
  'return `Personalized Homeopathic Plan for "${params.originalQuery}": ${params.templateText}`;',
  'return `Personalized Homeopathic Plan for "${params.originalQuery}":\\n${params.templateText}`;'
);

fs.writeFileSync(file, code);
