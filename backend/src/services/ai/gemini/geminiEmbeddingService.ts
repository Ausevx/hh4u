import { GoogleGenAI } from '@google/genai';
import { IEmbeddingService } from '../types';

export class GeminiEmbeddingService implements IEmbeddingService {
  private ai: GoogleGenAI;
  private model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
  private cache: Map<string, number[]> = new Map();
  
  // Matches Atlas Vector Search index (vector_index) and seed dataset dimensionality
  public readonly dimensions: number = 1536; 

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const trimmed = text || '';
    if (this.cache.has(trimmed)) {
      return this.cache.get(trimmed)!;
    }

    try {
      const response = await this.ai.models.embedContent({
        model: this.model,
        contents: trimmed,
        config: {
          outputDimensionality: this.dimensions,
        },
      });
      
      const values = response.embeddings?.[0]?.values || [];
      if (values.length > 0) {
        this.cache.set(trimmed, values);
      }
      return values;
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const retryRes = await this.ai.models.embedContent({
            model: this.model,
            contents: trimmed,
            config: {
              outputDimensionality: this.dimensions,
            },
          });
          const retryVals = retryRes.embeddings?.[0]?.values || [];
          if (retryVals.length > 0) {
            this.cache.set(trimmed, retryVals);
          }
          return retryVals;
        } catch (retryError: any) {
          console.warn(`[GeminiEmbeddingService] Gemini embedding quota reached (${retryError?.message}). Using deterministic fallback vector.`);
          const fallbackVector = new Array(this.dimensions).fill(0);
          for (let i = 0; i < trimmed.length; i++) {
            fallbackVector[i % this.dimensions] += (trimmed.charCodeAt(i) % 100) / 100;
          }
          this.cache.set(trimmed, fallbackVector);
          return fallbackVector;
        }
      }
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.generateEmbedding(text)));
  }
}
