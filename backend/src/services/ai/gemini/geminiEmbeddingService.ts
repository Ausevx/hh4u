import { GoogleGenAI } from '@google/genai';
import { IEmbeddingService } from '../types';

export class GeminiEmbeddingService implements IEmbeddingService {
  private ai: GoogleGenAI;
  private model = 'text-embedding-004';
  
  // Gemini text-embedding-004 output dimension is typically 768. 
  // Make sure this matches what the rest of the application expects, or adjust if needed.
  // Mongoose schema might need adjusting if it was strictly expecting 1536 (OpenAI).
  public readonly dimensions: number = 768; 

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: this.model,
      contents: text,
    });
    
    return response.embeddings?.[0]?.values || [];
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.ai.models.embedContent({
      model: this.model,
      contents: texts,
    });

    return response.embeddings?.map(e => e.values || []) || [];
  }
}
