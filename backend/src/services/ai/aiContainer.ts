import dotenv from 'dotenv';
dotenv.config();

import { ILLMService, IEmbeddingService, ISTTService, ITTSService } from './types';
import { MockLLMService } from './mock/mockLLMService';
import { MockEmbeddingService } from './mock/mockEmbeddingService';
import { MockSTTService } from './mock/mockSTTService';
import { MockTTSService } from './mock/mockTTSService';
import { GeminiLLMService } from './gemini/geminiLLMService';
import { GeminiEmbeddingService } from './gemini/geminiEmbeddingService';

export interface AIServices {
  llm: ILLMService;
  embedding: IEmbeddingService;
  stt: ISTTService;
  tts: ITTSService;
}

export function createDefaultAIServices(): AIServices {
  const apiKey = process.env.GEMINI_API_KEY;
  if (process.env.USE_MOCK_AI === 'true') {
    return {
      llm: new MockLLMService(),
      embedding: new MockEmbeddingService(),
      stt: new MockSTTService(),
      tts: new MockTTSService(),
    };
  }

  if (apiKey) {
    console.log("Using Google Gemini AI services");
    return {
      llm: new GeminiLLMService(apiKey),
      embedding: new GeminiEmbeddingService(apiKey),
      stt: new MockSTTService(), // Keep mocks for STT/TTS until implemented
      tts: new MockTTSService(),
    };
  }

  console.log("Using Mock AI services (No GEMINI_API_KEY found)");
  return {
    llm: new MockLLMService(),
    embedding: new MockEmbeddingService(),
    stt: new MockSTTService(),
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!isCustomInjected && apiKey && process.env.USE_MOCK_AI !== 'true' && (activeServices.llm instanceof MockLLMService || activeServices.embedding instanceof MockEmbeddingService)) {
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

