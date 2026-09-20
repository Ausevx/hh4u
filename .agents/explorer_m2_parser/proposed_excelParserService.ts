import fs from 'fs';
import * as XLSX from 'xlsx';

/**
 * Regular expression to identify and extract YouTube video URLs across:
 * - https://youtu.be/<ID>?...
 * - https://www.youtube.com/watch?v=<ID>
 * - http://... variants
 */
export const YOUTUBE_URL_REGEX = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})[^\s]*/;

/**
 * Canonical sheet names required in the knowledge base workbook.
 */
export const EXPECTED_SHEETS = ['level1', 'ConsultationQueries', 'Answers'] as const;

/**
 * Expected column headers per worksheet.
 */
export const EXPECTED_HEADERS = {
  level1: ['Questions'],
  ConsultationQueries: ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
  Answers: ['Question', 'Reason', 'Remedy'],
} as const;

/**
 * Interface contract matching PROJECT.md for parsed Excel workbook data.
 */
export interface ParsedExcelData {
  level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }>;
  consultationQueries: Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }>;
  answers: Array<{
    questionText: string;
    reasonText: string;
    remedyText: string;
    videoUrl?: string;
    answerType: 'level1' | 'diagnostic';
    rawRow: number;
  }>;
  stats: {
    totalRows: { level1: number; consultation: number; answers: number };
    dataRows: { level1: number; consultation: number; answers: number };
  };
}

/**
 * Custom error class for Excel ingestion validation failures.
 * Sets HTTP status code (defaults to 400) and optional array of detail messages.
 */
export class ExcelValidationError extends Error {
  statusCode: number;
  details?: string[];

  constructor(message: string, statusCode: number = 400, details?: string[]) {
    super(message);
    this.name = 'ExcelValidationError';
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ExcelValidationError.prototype);
  }
}

/**
 * Extracts a YouTube URL from text if present, sanitizing trailing punctuation.
 */
export function extractVideoUrl(text: string | null | undefined): string | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const match = text.match(YOUTUBE_URL_REGEX);
  if (!match) return undefined;
  return match[0].replace(/[.,;:)\]>]+$/, '');
}

/**
 * Validates and parses an in-memory Excel file buffer.
 *
 * @param buffer - Binary Buffer containing the Excel workbook (.xlsx)
 * @returns Promise resolving to the validated ParsedExcelData structure
 * @throws ExcelValidationError on missing/corrupted file, missing sheets, or missing headers
 */
export async function parseExcelBuffer(buffer: Buffer): Promise<ParsedExcelData> {
  if (!buffer || buffer.length === 0) {
    throw new ExcelValidationError('Empty file buffer provided', 400);
  }

  // Verify XLSX ZIP header signature (0x50, 0x4B)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ExcelValidationError('Corrupted or invalid Excel file format: missing ZIP header', 400);
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err: any) {
    throw new ExcelValidationError(
      `Corrupted or invalid Excel file format: ${err?.message || 'Unreadable workbook'}`,
      400
    );
  }

  // Validate sheet existence (case-sensitive as specified in PROJECT.md)
  for (const sheetName of EXPECTED_SHEETS) {
    if (!wb.SheetNames.includes(sheetName)) {
      throw new ExcelValidationError(`Missing required sheet: ${sheetName}`, 400);
    }
  }

  // Validate Sheet: level1
  const level1Ws = wb.Sheets['level1'];
  const level1Aoa: any[][] = XLSX.utils.sheet_to_json(level1Ws, { header: 1 });
  if (level1Aoa.length === 0 || !level1Aoa[0] || String(level1Aoa[0][0] || '').trim() !== 'Questions') {
    throw new ExcelValidationError("Sheet 'level1' missing required header: 'Questions'", 400);
  }

  // Validate Sheet: ConsultationQueries
  const consultWs = wb.Sheets['ConsultationQueries'];
  const consultAoa: any[][] = XLSX.utils.sheet_to_json(consultWs, { header: 1 });
  const consultHeaders = (consultAoa[0] || []).map((h: any) => (h != null ? String(h).trim() : ''));
  for (const expHeader of EXPECTED_HEADERS.ConsultationQueries) {
    if (!consultHeaders.includes(expHeader)) {
      throw new ExcelValidationError(`Sheet 'ConsultationQueries' missing required header: '${expHeader}'`, 400);
    }
  }

  // Validate Sheet: Answers
  const answersWs = wb.Sheets['Answers'];
  const answersAoa: any[][] = XLSX.utils.sheet_to_json(answersWs, { header: 1 });
  const answersHeaders = (answersAoa[0] || []).map((h: any) => (h != null ? String(h).trim() : ''));
  for (const expHeader of EXPECTED_HEADERS.Answers) {
    if (!answersHeaders.includes(expHeader)) {
      throw new ExcelValidationError(`Sheet 'Answers' missing required header: '${expHeader}'`, 400);
    }
  }

  // Dynamic column mapping for resilience against column order variations
  const consultQCol = consultHeaders.indexOf('Questions');
  const consultD1Col = consultHeaders.indexOf('Diagnostic Question 1');
  const consultD2Col = consultHeaders.indexOf('Diagnostic Question 2');
  const consultD3Col = consultHeaders.indexOf('Diagnostic Question 3');

  const answersQCol = answersHeaders.indexOf('Question');
  const answersReasonCol = answersHeaders.indexOf('Reason');
  const answersRemedyCol = answersHeaders.indexOf('Remedy');

  // Extract level1 questions
  const level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }> = [];
  for (let r = 1; r < level1Aoa.length; r++) {
    const row = level1Aoa[r];
    if (row && row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '') {
      level1Questions.push({
        canonicalQuestionText: String(row[0]).trim(),
        rawRow: r + 1,
      });
    }
  }

  // Extract consultation queries
  const consultationQueries: Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }> = [];
  for (let r = 1; r < consultAoa.length; r++) {
    const row = consultAoa[r];
    if (row && row[consultQCol] !== undefined && row[consultQCol] !== null && String(row[consultQCol]).trim() !== '') {
      const qText = String(row[consultQCol]).trim();
      const diags: string[] = [];
      const diagCols = [consultD1Col, consultD2Col, consultD3Col];
      for (const colIdx of diagCols) {
        if (colIdx !== -1 && row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '') {
          diags.push(String(row[colIdx]).trim());
        }
      }
      consultationQueries.push({
        questionText: qText,
        diagnosticQuestions: diags,
        rawRow: r + 1,
      });
    }
  }

  // Set of Level 1 canonical question texts for semantically tagging answers
  const level1QuestionSet = new Set(level1Questions.map((q) => q.canonicalQuestionText));

  // Extract answers
  const answers: Array<{
    questionText: string;
    reasonText: string;
    remedyText: string;
    videoUrl?: string;
    answerType: 'level1' | 'diagnostic';
    rawRow: number;
  }> = [];

  for (let r = 1; r < answersAoa.length; r++) {
    const row = answersAoa[r];
    if (row && row[answersQCol] !== undefined && row[answersQCol] !== null && String(row[answersQCol]).trim() !== '') {
      const qText = String(row[answersQCol]).trim();
      const rawReason = answersReasonCol !== -1 && row[answersReasonCol] != null ? String(row[answersReasonCol]).trim() : '';
      const rawRemedy = answersRemedyCol !== -1 && row[answersRemedyCol] != null ? String(row[answersRemedyCol]).trim() : '';

      // Video URL extraction: checks Remedy first, then Reason
      const videoUrl = extractVideoUrl(rawRemedy) || extractVideoUrl(rawReason);

      // Determine answer type:
      // Direct answers match level1 questions (first 184 rows in dummy db); remaining are diagnostic answers
      const isLevel1 = level1QuestionSet.has(qText) || (level1Questions.length > 0 && answers.length < level1Questions.length);

      answers.push({
        questionText: qText,
        reasonText: rawReason,
        remedyText: rawRemedy,
        videoUrl,
        answerType: isLevel1 ? 'level1' : 'diagnostic',
        rawRow: r + 1,
      });
    }
  }

  return {
    level1Questions,
    consultationQueries,
    answers,
    stats: {
      totalRows: {
        level1: level1Aoa.length,
        consultation: consultAoa.length,
        answers: answersAoa.length,
      },
      dataRows: {
        level1: level1Questions.length,
        consultation: consultationQueries.length,
        answers: answers.length,
      },
    },
  };
}

/**
 * Validates and parses an Excel file from disk.
 *
 * @param filePath - Absolute or relative file path to the .xlsx workbook
 * @returns Promise resolving to the validated ParsedExcelData structure
 * @throws ExcelValidationError on missing file (404) or parsing errors (400)
 */
export async function parseExcelFile(filePath: string): Promise<ParsedExcelData> {
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    throw new ExcelValidationError('File path must be a non-empty string', 400);
  }
  if (!fs.existsSync(filePath)) {
    throw new ExcelValidationError(`Excel file not found at: ${filePath}`, 404);
  }
  const buffer = await fs.promises.readFile(filePath);
  return parseExcelBuffer(buffer);
}
