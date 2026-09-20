/**
 * Vendor-Agnostic AI Service Interfaces for Healing Hands4U Chatbot Engine.
 * Supports swappable providers (OpenAI, Gemini, Whisper, ElevenLabs, or Mocks).
 */

export interface TranslateResult {
  translatedText: string;
  detectedLanguage: string;
}

export interface PersonalizeAnswerParams {
  originalQuery: string;
  templateText: string;
  userLanguage?: string;
  additionalContext?: Record<string, any>;
}

export interface ILLMService {
  /**
   * Translates non-English or multilingual query text into canonical English.
   */
  translateToEnglish(text: string, sourceLanguage?: string): Promise<TranslateResult>;

  /**
   * Generates a standard answer or summary from a prompt and context.
   */
  generateAnswer(prompt: string, context?: Record<string, any>): Promise<string>;

  /**
   * Synthesizes a personalized homeopathic answer combining the matched answer template,
   * the user's original query context, and diagnostic questionnaire responses.
   */
  generatePersonalizedAnswer(params: PersonalizeAnswerParams): Promise<string>;
}

export interface IEmbeddingService {
  readonly dimensions: number;

  /**
   * Generates a dense vector embedding for the input text (default 1536-dim).
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generates batch dense vector embeddings for multiple texts.
   */
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface TranscribeResult {
  text: string;
  language?: string;
}

export interface ISTTService {
  /**
   * Transcribes speech audio (Buffer or base64-encoded string) to text.
   */
  transcribeAudio(audioData: Buffer | string, mimeType?: string): Promise<TranscribeResult>;
}

export interface SynthesizeResult {
  audioBuffer: Buffer;
  mimeType: string;
}

export interface ITTSService {
  /**
   * Synthesizes text into spoken audio buffer.
   */
  synthesizeSpeech(text: string, voiceOptions?: Record<string, any>): Promise<SynthesizeResult>;
}
