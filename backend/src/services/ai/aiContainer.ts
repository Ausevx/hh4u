import dotenv from 'dotenv';
dotenv.config();

import { ILLMService, IEmbeddingService, ISTTService, ITTSService } from './types';
import { MockLLMService } from './mock/mockLLMService';
import { MockEmbeddingService } from './mock/mockEmbeddingService';
import { MockSTTService } from './mock/mockSTTService';
import { MockTTSService } from './mock/mockTTSService';
import { CloudTranslationService } from './cloudTranslationService';
import { GeminiEmbeddingService } from './gemini/geminiEmbeddingService';
import { GroqLLMService } from './groq/groqLLMService';
import { GeminiLLMService } from './gemini/geminiLLMService';

export interface AIServices {
  llm: ILLMService;
  embedding: IEmbeddingService;
  stt: ISTTService;
  tts: ITTSService;
}

export function createDefaultAIServices(): AIServices {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (process.env.USE_MOCK_AI === 'true') {
    return {
      llm: new MockLLMService(),
      embedding: new MockEmbeddingService(),
      stt: new MockSTTService(),
      tts: new MockTTSService(),
    };
  }

  let llmService: ILLMService = new MockLLMService();
  if (groqApiKey) {
    console.log("Using Groq AI for LLM (Llama 3.1 70B)");
    llmService = new GroqLLMService(groqApiKey);
  } else if (geminiApiKey) {
    console.log("Using Google Gemini AI for LLM");
    llmService = new GeminiLLMService(geminiApiKey);
  } else {
    console.log("Using MockLLMService for LLM (Fallback)");
    llmService = new MockLLMService();
  }

  let embeddingService: IEmbeddingService = new MockEmbeddingService();
  if (geminiApiKey) {
    console.log("Using Google Gemini AI for Embeddings");
    embeddingService = new GeminiEmbeddingService(geminiApiKey);
  } else {
    console.log("Using Mock AI for Embeddings (Fallback)");
  }

  return {
    llm: llmService,
    embedding: embeddingService,
    stt: new MockSTTService(), // Keep mocks for STT/TTS until implemented
    tts: new MockTTSService(),
  };
}

let activeServices: AIServices = createDefaultAIServices();
let isCustomInjected = false;

/**
 * Returns currently active AI service instances.
 * Dynamically re-evaluates process.env.GEMINI_API_KEY if currently mocked.
 */
export function getAIServices(): AIServices {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const hasKey = geminiApiKey || groqApiKey;
  
  if (!isCustomInjected && hasKey && process.env.USE_MOCK_AI !== 'true' && (activeServices.llm instanceof MockLLMService || activeServices.embedding instanceof MockEmbeddingService)) {
    activeServices = createDefaultAIServices();
  }
  return activeServices;
}

/**
 * Swaps in custom or mocked AI services for testing or vendor switching.
 */
export function setAIServices(customServices: Partial<AIServices>): void {
  isCustomInjected = true;
  activeServices = {
    ...activeServices,
    ...customServices,
  };
}

/**
 * Resets AI services back to default implementations.
 */
export function resetAIServices(): void {
  isCustomInjected = false;
  activeServices = createDefaultAIServices();
}

