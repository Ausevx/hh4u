/**
 * Chatbot Engine Configuration.
 * Configurable via environment variables with production homeopathic defaults.
 */

export const DEFAULT_MATCH_CONFIDENCE_THRESHOLD = 0.75;
export const DEFAULT_TOP_CANDIDATES_COUNT = 5;
export const DEFAULT_FALLBACK_MESSAGE =
  'We could not find a confident match for your query. Our medical team has been notified to review this question. You may also consult Dr. Anjali Jariwala directly at Healing Hands4U clinic.';

export interface IChatbotConfig {
  matchConfidenceThreshold: number;
  topCandidatesCount: number;
  fallbackMessage: string;
}

/**
 * Dynamically resolves chatbot configuration to support runtime process.env modifications in tests.
 */
export function getChatbotConfig(): IChatbotConfig {
  const envThreshold = process.env.MATCH_CONFIDENCE_THRESHOLD;
  const matchConfidenceThreshold = DEFAULT_MATCH_CONFIDENCE_THRESHOLD;

  const envTopK = process.env.TOP_CANDIDATES_COUNT;
  const topCandidatesCount = envTopK !== undefined ? parseInt(envTopK, 10) : DEFAULT_TOP_CANDIDATES_COUNT;

  const fallbackMessage = process.env.CHATBOT_FALLBACK_MESSAGE || DEFAULT_FALLBACK_MESSAGE;

  return {
    matchConfidenceThreshold,
    topCandidatesCount,
    fallbackMessage,
  };
}

export const MATCH_CONFIDENCE_THRESHOLD = DEFAULT_MATCH_CONFIDENCE_THRESHOLD;
export const TOP_CANDIDATES_COUNT = parseInt(
  process.env.TOP_CANDIDATES_COUNT || `${DEFAULT_TOP_CANDIDATES_COUNT}`,
  10
);
export const FALLBACK_MESSAGE = DEFAULT_FALLBACK_MESSAGE;

export default getChatbotConfig;
