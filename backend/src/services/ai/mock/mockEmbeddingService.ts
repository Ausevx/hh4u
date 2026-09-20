import { IEmbeddingService } from '../types';

export class MockEmbeddingService implements IEmbeddingService {
  public readonly dimensions: number = 1536;
  private customEmbeddings: Map<string, number[]> = new Map();

  // Clinical topic clusters for realistic domain similarity
  private static readonly TOPIC_CLUSTERS: Array<{ name: string; keywords: string[]; weight: number }> = [
    {
      name: 'headache_remedies',
      keywords: ['headache', 'headaches', 'migraine', 'migraines', 'tension', 'throbbing', 'head'],
      weight: 3.0,
    },
    {
      name: 'allergy_respiratory',
      keywords: ['allergy', 'allergic', 'rhinitis', 'sneezing', 'cold', 'cough', 'respiratory'],
      weight: 3.0,
    },
    {
      name: 'digestive_health',
      keywords: ['stomach', 'gastric', 'abdominal', 'digestion', 'acid', 'constipation'],
      weight: 3.0,
    },
  ];

  /**
   * Register a custom embedding vector for a specific exact text.
   */
  public registerEmbedding(text: string, vector: number[]): void {
    if (vector.length !== this.dimensions) {
      const padded = new Array(this.dimensions).fill(0);
      for (let i = 0; i < Math.min(vector.length, this.dimensions); i++) {
        padded[i] = vector[i];
      }
      this.customEmbeddings.set(text.trim().toLowerCase(), this.normalize(padded));
    } else {
      this.customEmbeddings.set(text.trim().toLowerCase(), this.normalize(vector));
    }
  }

  /**
   * Mulberry32 seeded pseudo-random number generator.
   */
  private mulberry32(seed: number): () => number {
    return () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Deterministic string hash to 32-bit integer.
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) || 1;
  }

  /**
   * Normalize an array of numbers to unit length (L2 norm = 1.0).
   */
  public normalize(vec: number[]): number[] {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
      sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq);
    if (norm === 0) {
      const fallback = new Array(vec.length).fill(0);
      fallback[0] = 1.0;
      return fallback;
    }
    return vec.map((val) => val / norm);
  }

  /**
   * Normalize word: remove plural 's' or 'ies' for simple semantic stemming.
   */
  private stem(word: string): string {
    if (word.endsWith('ies') && word.length > 4) {
      return word.slice(0, -3) + 'y'; // remedies -> remedy
    }
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
      return word.slice(0, -1); // headaches -> headache
    }
    return word;
  }

  /**
   * Generates a deterministic 1536-dimensional unit vector based on word semantics
   * and clinical topic clusters.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    const trimmed = (text || '').trim().toLowerCase();
    if (this.customEmbeddings.has(trimmed)) {
      return this.customEmbeddings.get(trimmed)!;
    }

    const rawWords = trimmed.match(/[a-z0-9]+/g) || [];
    // Filter common stop words
    const stopWords = new Set(['what', 'is', 'the', 'for', 'and', 'to', 'a', 'an', 'in', 'of', 'i', 'have', 'with', 'help']);
    const words = rawWords.filter((w) => !stopWords.has(w)).map((w) => this.stem(w));

    if (words.length === 0) {
      const zero = new Array(this.dimensions).fill(0);
      zero[0] = 1.0;
      return zero;
    }

    const vector = new Array(this.dimensions).fill(0);

    // 1. Topic Cluster Embeddings
    for (const cluster of MockEmbeddingService.TOPIC_CLUSTERS) {
      const clusterMatched = words.some((w) => cluster.keywords.some((k) => this.stem(k) === w));
      if (clusterMatched) {
        const clusterSeed = this.hashString(`cluster:${cluster.name}`);
        const prng = this.mulberry32(clusterSeed);
        for (let i = 0; i < this.dimensions; i++) {
          vector[i] += (prng() * 2 - 1) * cluster.weight;
        }
      }
    }

    // 2. Word Token Embeddings
    for (const word of words) {
      const seed = this.hashString(`word:${word}`);
      const prng = this.mulberry32(seed);
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] += (prng() * 2 - 1) * 0.8;
      }
    }

    return this.normalize(vector);
  }

  public async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }
}
