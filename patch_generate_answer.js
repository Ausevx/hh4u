const fs = require('fs');
const file = 'backend/src/services/ai/gemini/geminiLLMService.ts';
let code = fs.readFileSync(file, 'utf8');

const oldPrompt = "fullPrompt += `\\nProvide a clear, reassuring, and structured homeopathic recommendation incorporating the above clinical guidance. Include dosage and safety instructions where appropriate. IMPORTANT: You MUST generate your response in the following language: ${targetLanguage}.`;";
const newPrompt = "fullPrompt += `\\nYour task is simply to map the user's query to the provided clinical guidance. Briefly (in 1-2 sentences) acknowledge their specific problem, and then present the 'baseAnswer' exactly as provided in the guidance. Do NOT hallucinate long extra medical advice.\\n\\nCRITICAL INSTRUCTION: Do NOT use any markdown formatting (no hashes #, no asterisks **). Use plain text suitable for a standard mobile chat bubble with 1-2 friendly emojis.\\n\\nIMPORTANT: You MUST generate your response in the following language: ${targetLanguage}.`;";

if (code.includes(oldPrompt)) {
  code = code.replace(oldPrompt, newPrompt);
  fs.writeFileSync(file, code);
  console.log("Success");
} else {
  console.log("Failed to find prompt");
}
