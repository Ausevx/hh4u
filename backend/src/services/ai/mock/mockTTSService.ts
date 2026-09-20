import { ITTSService, SynthesizeResult } from '../types';

export class MockTTSService implements ITTSService {
  public async synthesizeSpeech(
    text: string,
    voiceOptions?: Record<string, any>
  ): Promise<SynthesizeResult> {
    if (!text) {
      throw new Error('Text is required for TTS synthesis');
    }

    const payload = `MOCK_AUDIO_PAYLOAD:[${text}]`;
    return {
      audioBuffer: Buffer.from(payload, 'utf-8'),
      mimeType: voiceOptions?.mimeType || 'audio/mpeg',
    };
  }
}
