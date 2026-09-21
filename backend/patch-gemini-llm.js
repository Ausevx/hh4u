const fs = require('fs');
const file = 'backend/src/services/ai/gemini/geminiLLMService.ts';
let code = fs.readFileSync(file, 'utf8');

const classifyIntentCode = `
  async classifyIntent(text: string): Promise<'MEDICAL' | 'GREETING' | 'CHITCHAT' | 'UNCLEAR'> {
    // Fast path: pure regex for extremely common greetings to save API quota
    const trimmed = text.trim().toLowerCase();
    if (/^(hi|hello|hey|yo|greetings|good morning|good afternoon|good evening|sup|what\\'s up|whats up)[!?]*$/.test(trimmed)) {
      return 'GREETING';
    }

    const prompt = \`Classify the following user message into exactly one of these four categories:
- "MEDICAL": The user is asking about health, symptoms, diseases, treatments, or homeopathic remedies.
- "GREETING": The user is simply saying hello, hi, hey, or a similar greeting.
- "CHITCHAT": The user is making casual conversation unrelated to health (e.g., asking about the weather, telling a joke).
- "UNCLEAR": The message is too vague to determine the intent.

User message: "\${text}"

Respond with a JSON object containing a single field "intent" with one of the four category strings. Do not include markdown formatting.\`;

    try {
      // Use the lightest, fastest model for classification
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }
          ]
        }
      });
      
      const responseText = response.text || '{}';
      try {
        const data = JSON.parse(responseText);
        const intent = (data.intent || 'UNCLEAR').toUpperCase();
        if (['MEDICAL', 'GREETING', 'CHITCHAT', 'UNCLEAR'].includes(intent)) {
          return intent as any;
        }
      } catch (parseError) {
        // Regex fallback if JSON parse fails
        if (responseText.toUpperCase().includes('GREETING')) return 'GREETING';
        if (responseText.toUpperCase().includes('MEDICAL')) return 'MEDICAL';
        if (responseText.toUpperCase().includes('CHITCHAT')) return 'CHITCHAT';
      }
      return 'UNCLEAR';
    } catch (e) {
      console.warn('[GeminiLLMService] Intent classification failed, defaulting to MEDICAL to allow vector search', e);
      return 'MEDICAL'; // Default to medical so it still tries to search the DB
    }
  }

  async translateToEnglish`;

code = code.replace('async translateToEnglish', classifyIntentCode);
fs.writeFileSync(file, code);
