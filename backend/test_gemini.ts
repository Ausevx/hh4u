import { config } from 'dotenv';
config();
import { GeminiLLMService } from './src/services/ai/gemini/geminiLLMService';
import { GeminiEmbeddingService } from './src/services/ai/gemini/geminiEmbeddingService';

async function test() {
  console.log('Testing Gemini API...');
  
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const llm = new GeminiLLMService(apiKey);
    console.log('LLM Service initialized');
    
    console.log('\n--- Conversational Test (Greeting) ---');
    const resp1 = await llm.generateConversationalResponse('yo');
    console.log('Response:', resp1);

    console.log('\n--- Conversational Test (Non-medical) ---');
    const resp2 = await llm.generateConversationalResponse('how is the weather?');
    console.log('Response:', resp2);

    console.log('\n--- Conversational Test (Vague medical) ---');
    const resp3 = await llm.generateConversationalResponse('I feel sick');
    console.log('Response:', resp3);
    
    const embed = new GeminiEmbeddingService(apiKey);
    console.log('\n--- Embedding Test ---');
    const emb1 = await embed.generateEmbedding('vomiting');
    console.log(`Embedding generated, length: ${emb1.length}`);
    
  } catch (err: any) {
    console.error('Error testing Gemini API:', err);
  }
}

test();
