import { ISTTService, TranscribeResult } from '../types';

export class MockSTTService implements ISTTService {
  private customTranscriptions: Map<string, TranscribeResult> = new Map();

  public registerTranscription(audioIdOrKey: string, text: string, language: string = 'en'): void {
    this.customTranscriptions.set(audioIdOrKey, { text, language });
  }

  public async transcribeAudio(audioData: Buffer | string, mimeType?: string): Promise<TranscribeResult> {
    if (!audioData) {
      throw new Error('No audio data provided to transcribeAudio');
    }

    // If custom audio mapping exists
    if (typeof audioData === 'string' && this.customTranscriptions.has(audioData)) {
      return this.customTranscriptions.get(audioData)!;
    }

    // Try decoding base64 if audioData is a base64 string
    if (typeof audioData === 'string') {
      try {
        const decoded = Buffer.from(audioData, 'base64').toString('utf-8').trim();
        // Check if decoded content looks like a plain text transcript
        if (decoded && /^[\p{L}\p{N}\p{P}\s]+$/u.test(decoded)) {
          return {
            text: decoded,
            language: 'en',
          };
        }
      } catch {
        // Fall through
      }

      // If string itself contains readable words
      if (/^[a-zA-Z0-9\s.,?!'-]+$/.test(audioData.trim()) && audioData.length < 200) {
        return {
          text: audioData.trim(),
          language: 'en',
        };
      }
    }

    // Buffer check
    if (Buffer.isBuffer(audioData)) {
      try {
        const str = audioData.toString('utf-8').trim();
        if (str && /^[\p{L}\p{N}\p{P}\s]+$/u.test(str)) {
          return {
            text: str,
            language: 'en',
          };
        }
      } catch {
        // Fall through
      }
    }

    // Deterministic default transcript for mock voice queries
    return {
      text: 'I have a severe throbbing headache and need homeopathic guidance',
      language: 'en',
    };
  }
}
