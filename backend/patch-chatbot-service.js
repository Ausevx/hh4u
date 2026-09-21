const fs = require('fs');
const file = 'backend/src/services/chatbotService.ts';
let code = fs.readFileSync(file, 'utf8');

const injection = `
    if (!originalQueryText) {
      throw new Error('Query text or voiceData is required');
    }

    // 3.5 Intent Classification (Pre-processing)
    const userIntent = ai.llm.classifyIntent ? await ai.llm.classifyIntent(originalQueryText) : 'MEDICAL';
    
    if (userIntent === 'GREETING' || userIntent === 'CHITCHAT') {
      // Fast path: skip vector search entirely for casual chat
      const fallbackText = await ai.llm.generateConversationalResponse(originalQueryText);
      const session = new ChatbotSession({
        userId,
        originalQueryText,
        intent: input.intent,
        matchConfident: false,
        inputMode,
      });
      await session.save();
      
      return {
        success: true,
        sessionId: session._id.toString(),
        matchConfident: false,
        confidenceScore: 0,
        intent: input.intent,
        fallback: true,
        message: fallbackText,
        matchCandidates: [],
      };
    }

    // 4. Multilingual Translation to English`;

code = code.replace(`
    if (!originalQueryText) {
      throw new Error('Query text or voiceData is required');
    }

    // 4. Multilingual Translation to English`, injection);

fs.writeFileSync(file, code);
