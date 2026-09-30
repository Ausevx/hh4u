export class TranslationUnavailableError extends Error {
  readonly statusCode = 503;
  readonly code = 'TRANSLATION_UNAVAILABLE';
  constructor(message = 'Translation is temporarily unavailable. Please retry.') { super(message); }
}
export class SearchUnavailableError extends Error {
  readonly statusCode = 503;
  readonly code = 'SEARCH_UNAVAILABLE';
  constructor() { super('Search is temporarily unavailable. Please retry.'); }
}
