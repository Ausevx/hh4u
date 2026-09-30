import { GoogleGenAI } from '@google/genai';
import { IEmbeddingService } from '../types';
import { ContentCache } from '../../contentCache';
import { SearchUnavailableError } from '../serviceError';

export class GeminiEmbeddingService implements IEmbeddingService {
  private ai: GoogleGenAI | undefined;
  private model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
  private cache = new ContentCache('gemini-embedding-raw-v1', 24 * 60 * 60 * 1000, 500);
  public readonly dimensions = 1536;
  constructor(apiKey: string) { if (apiKey) this.ai = new GoogleGenAI({ apiKey }); }
  async generateEmbedding(text: string): Promise<number[]> {
    // Match the existing database input convention. Model changes require a complete rebuild.
    const input = text.trim();
    if (!input || !this.ai) throw new SearchUnavailableError();
    return this.cache.get([this.model, this.dimensions, input], async () => {
      const configured = Number(process.env.EMBEDDING_TIMEOUT_MS || 8000);
      const timeout = Number.isFinite(configured) ? Math.max(1000, Math.min(15000, configured)) : 8000;
      try {
        const response = await this.ai!.models.embedContent({ model: this.model, contents: input,
          config: { outputDimensionality: this.dimensions, httpOptions: { timeout, retryOptions: { attempts: 1 } } } });
        const values = response.embeddings?.[0]?.values;
        if (!values || values.length !== this.dimensions || values.some(v => !Number.isFinite(v)) || !values.some(v => v !== 0)) throw new SearchUnavailableError();
        return values;
      } catch { throw new SearchUnavailableError(); }
    });
  }
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += 5) results.push(...await Promise.all(texts.slice(i, i + 5).map(text => this.generateEmbedding(text))));
    return results;
  }
}
