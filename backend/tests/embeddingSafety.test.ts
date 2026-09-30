jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));
import { GoogleGenAI } from '@google/genai';
import { GeminiEmbeddingService } from '../src/services/ai/gemini/geminiEmbeddingService';
describe('Embedding failures never create fake semantic vectors', () => {
  it('quota errors do not retry or create a deterministic vector', async () => {
    const embedContent = jest.fn().mockRejectedValue({ status: 429 });
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({ models: { embedContent } }));
    await expect(new GeminiEmbeddingService('test').generateEmbedding('headache')).rejects.toMatchObject({ code: 'SEARCH_UNAVAILABLE' });
    expect(embedContent).toHaveBeenCalledTimes(1);
  });
  it('invalid dimensions are rejected', async () => {
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({ models: { embedContent: jest.fn().mockResolvedValue({ embeddings: [{ values: [1, 2] }] }) } }));
    await expect(new GeminiEmbeddingService('test').generateEmbedding('headache')).rejects.toMatchObject({ code: 'SEARCH_UNAVAILABLE' });
  });
  it('original non-English input is embedded and cached', async () => {
    const embedContent = jest.fn().mockResolvedValue({ embeddings: [{ values: Array(1536).fill(0.1) }] });
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({ models: { embedContent } }));
    const service = new GeminiEmbeddingService('test');
    await Promise.all([service.generateEmbedding('mujhe dard hai'), service.generateEmbedding('mujhe dard hai')]);
    expect(embedContent).toHaveBeenCalledTimes(1);
    expect(embedContent.mock.calls[0][0].contents).toBe('mujhe dard hai');
  });
});
