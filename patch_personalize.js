const fs = require('fs');
const file = 'backend/src/services/ai/gemini/geminiLLMService.ts';
let code = fs.readFileSync(file, 'utf8');

const oldPrompt = `Ensure the response begins with "Personalized Homeopathic Plan" and is compassionate, medically safe (include a disclaimer if necessary), and accurately reflects the standard template advice in the requested language.`;
const newPrompt = `Your task is simply to map the user's specific context to the provided 'Standard Template Answer'. Briefly (in 1-2 sentences) acknowledge their symptoms, and then present the template answer exactly as provided. Do NOT hallucinate long extra medical advice.`;

if (code.includes(oldPrompt)) {
  code = code.replace(oldPrompt, newPrompt);
  fs.writeFileSync(file, code);
  console.log("Success");
} else {
  console.log("Failed to find prompt");
}
