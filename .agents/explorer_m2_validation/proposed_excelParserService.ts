import * as fs from 'fs';
import * as XLSX from 'xlsx';

/**
 * Interface contract for parsed Excel knowledge base data.
 * Adheres strictly to PROJECT.md § Interface Contracts.
 */
export interface ParsedExcelData {
  level1Questions: Array<{
    canonicalQuestionText: string;
    rawRow: number;
  }>;
  consultationQueries: Array<{
    questionText: string;
    diagnosticQuestions: string[];
    rawRow: number;
  }>;
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
 * Optional structured details for validation errors.
 */
export interface ExcelValidationErrorDetails {
  sheet?: string;
  missingHeader?: string;
  expectedHeaders?: string[];
  actualHeaders?: string[];
  row?: number;
  [key: string]: any;
}

/**
 * Custom validation error for Excel parsing failures.
 * Sets statusCode = 400 by default (or 404 for missing file).
 */
export class ExcelValidationError extends Error {
  public readonly statusCode: number;
  public readonly details?: string[] | ExcelValidationErrorDetails;

  constructor(
    message: string,
    statusCode: number = 400,
    details?: string[] | ExcelValidationErrorDetails
  ) {
    super(message);
    this.name = 'ExcelValidationError';
    this.statusCode = statusCode;
    this.details = details;

    // Ensure proper prototype chain inheritance across TypeScript / Jest VM environments
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Regular expression to detect and extract YouTube video URLs.
 * Handles youtu.be, youtube.com/watch?v=, youtube.com/embed/, and youtube.com/v/
 */
export const YOUTUBE_URL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?/i;

/**
 * Case-insensitive sheet finder.
 * Returns the exact sheet name as it appears in wb.SheetNames, or undefined if not found.
 */
function findCaseInsensitiveSheetName(wb: XLSX.WorkBook, targetSheet: string): string | undefined {
  const targetLower = targetSheet.trim().toLowerCase();
  return wb.SheetNames.find((name) => name.trim().toLowerCase() === targetLower);
}

/**
 * Cleans and trims cell values into strings.
 */
function cleanCellValue(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Parses an Excel (.xlsx) buffer and returns structured knowledge base data.
 * Validates file signature, required sheets, and column headers.
 * Throws ExcelValidationError (statusCode 400) on invalid inputs.
 */
export async function parseExcelBuffer(buffer: Buffer): Promise<ParsedExcelData> {
  // 1. Validate buffer presence and type
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ExcelValidationError('Empty file buffer provided', 400);
  }

  // 2. Validate ZIP magic bytes (0x50, 0x4B / 'PK')
  // Standard .xlsx files are OpenXML ZIP packages starting with 0x50, 0x4B
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ExcelValidationError(
      'Corrupted or invalid Excel file format: missing ZIP header',
      400
    );
  }

  // 3. Ingest workbook using xlsx library with error trapping
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err: any) {
    throw new ExcelValidationError(
      `Corrupted or invalid Excel file format: ${err?.message || 'unreadable workbook'}`,
      400
    );
  }

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new ExcelValidationError('Workbook contains no sheets', 400);
  }

  // 4. Validate presence of mandatory sheets (case-insensitive matching)
  const requiredSheets = ['level1', 'ConsultationQueries', 'Answers'];
  const sheetMap: Record<string, string> = {};

  for (const reqSheet of requiredSheets) {
    const actualSheetName = findCaseInsensitiveSheetName(wb, reqSheet);
    if (!actualSheetName) {
      throw new ExcelValidationError(
        `Missing required sheet: ${reqSheet}`,
        400,
        { sheet: reqSheet }
      );
    }
    sheetMap[reqSheet] = actualSheetName;
  }

  // 5. Parse and validate Sheet: 'level1'
  const level1Ws = wb.Sheets[sheetMap['level1']];
  const level1Aoa: any[][] = XLSX.utils.sheet_to_json(level1Ws, { header: 1 });
  if (level1Aoa.length === 0 || !level1Aoa[0] || level1Aoa[0].length === 0) {
    throw new ExcelValidationError(
      "Sheet 'level1' missing required header: 'Questions'",
      400,
      { sheet: 'level1', missingHeader: 'Questions' }
    );
  }

  const level1Headers = level1Aoa[0].map((h) => cleanCellValue(h));
  const level1QuestionCol = level1Headers.indexOf('Questions');
  if (level1QuestionCol === -1) {
    throw new ExcelValidationError(
      "Sheet 'level1' missing required header: 'Questions'",
      400,
      { sheet: 'level1', missingHeader: 'Questions', actualHeaders: level1Headers }
    );
  }

  // 6. Parse and validate Sheet: 'ConsultationQueries'
  const consultWs = wb.Sheets[sheetMap['ConsultationQueries']];
  const consultAoa: any[][] = XLSX.utils.sheet_to_json(consultWs, { header: 1 });
  if (consultAoa.length === 0 || !consultAoa[0] || consultAoa[0].length === 0) {
    throw new ExcelValidationError(
      "Sheet 'ConsultationQueries' missing required header: 'Questions'",
      400,
      { sheet: 'ConsultationQueries', missingHeader: 'Questions' }
    );
  }

  const consultHeaders = consultAoa[0].map((h) => cleanCellValue(h));
  const expectedConsultHeaders = [
    'Questions',
    'Diagnostic Question 1',
    'Diagnostic Question 2',
    'Diagnostic Question 3',
  ];

  for (const expHeader of expectedConsultHeaders) {
    if (!consultHeaders.includes(expHeader)) {
      throw new ExcelValidationError(
        `Sheet 'ConsultationQueries' missing required header: '${expHeader}'`,
        400,
        { sheet: 'ConsultationQueries', missingHeader: expHeader, actualHeaders: consultHeaders }
      );
    }
  }

  const consultQuestionCol = consultHeaders.indexOf('Questions');
  const diagCol1 = consultHeaders.indexOf('Diagnostic Question 1');
  const diagCol2 = consultHeaders.indexOf('Diagnostic Question 2');
  const diagCol3 = consultHeaders.indexOf('Diagnostic Question 3');

  // 7. Parse and validate Sheet: 'Answers'
  const answersWs = wb.Sheets[sheetMap['Answers']];
  const answersAoa: any[][] = XLSX.utils.sheet_to_json(answersWs, { header: 1 });
  if (answersAoa.length === 0 || !answersAoa[0] || answersAoa[0].length === 0) {
    throw new ExcelValidationError(
      "Sheet 'Answers' missing required header: 'Question'",
      400,
      { sheet: 'Answers', missingHeader: 'Question' }
    );
  }

  const answersHeaders = answersAoa[0].map((h) => cleanCellValue(h));
  const expectedAnswersHeaders = ['Question', 'Reason', 'Remedy'];

  for (const expHeader of expectedAnswersHeaders) {
    if (!answersHeaders.includes(expHeader)) {
      throw new ExcelValidationError(
        `Sheet 'Answers' missing required header: '${expHeader}'`,
        400,
        { sheet: 'Answers', missingHeader: expHeader, actualHeaders: answersHeaders }
      );
    }
  }

  const ansQuestionCol = answersHeaders.indexOf('Question');
  const reasonCol = answersHeaders.indexOf('Reason');
  const remedyCol = answersHeaders.indexOf('Remedy');

  // 8. Extract Level 1 Questions
  const level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }> = [];
  for (let r = 1; r < level1Aoa.length; r++) {
    const row = level1Aoa[r];
    if (!row) continue;
    const text = cleanCellValue(row[level1QuestionCol]);
    if (text !== '') {
      level1Questions.push({
        canonicalQuestionText: text,
        rawRow: r + 1,
      });
    }
  }

  // Create a lookup Set for fast answer type classification
  const level1QuestionSet = new Set(level1Questions.map((q) => q.canonicalQuestionText));

  // 9. Extract Consultation Queries
  const consultationQueries: Array<{
    questionText: string;
    diagnosticQuestions: string[];
    rawRow: number;
  }> = [];

  for (let r = 1; r < consultAoa.length; r++) {
    const row = consultAoa[r];
    if (!row) continue;
    const qText = cleanCellValue(row[consultQuestionCol]);
    if (qText !== '') {
      const diags: string[] = [];
      const d1 = cleanCellValue(row[diagCol1]);
      const d2 = cleanCellValue(row[diagCol2]);
      const d3 = cleanCellValue(row[diagCol3]);

      if (d1 !== '') diags.push(d1);
      if (d2 !== '') diags.push(d2);
      if (d3 !== '') diags.push(d3);

      consultationQueries.push({
        questionText: qText,
        diagnosticQuestions: diags,
        rawRow: r + 1,
      });
    }
  }

  // 10. Extract Answers with Video URLs and Type Classification
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
    if (!row) continue;
    const qText = cleanCellValue(row[ansQuestionCol]);
    if (qText !== '') {
      const reasonText = cleanCellValue(row[reasonCol]);
      const remedyText = cleanCellValue(row[remedyCol]);

      // Extract YouTube Video URL (prioritizing remedy, falling back to reason)
      let videoUrl: string | undefined;
      const remedyMatch = remedyText.match(YOUTUBE_URL_REGEX);
      const reasonMatch = reasonText.match(YOUTUBE_URL_REGEX);

      if (remedyMatch) {
        videoUrl = remedyMatch[0];
      } else if (reasonMatch) {
        videoUrl = reasonMatch[0];
      }

      // First rows matching level1 questions are 'level1', subsequent diagnostic questions are 'diagnostic'
      const isLevel1 = r <= level1Questions.length || level1QuestionSet.has(qText);

      answers.push({
        questionText: qText,
        reasonText,
        remedyText,
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
 * Reads an Excel file from disk and parses its content.
 * Throws ExcelValidationError with statusCode 404 if file does not exist,
 * or statusCode 400 if malformed.
 */
export async function parseExcelFile(filePath: string): Promise<ParsedExcelData> {
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    throw new ExcelValidationError('File path must be a non-empty string', 400);
  }

  if (!fs.existsSync(filePath)) {
    throw new ExcelValidationError(`Excel file not found at: ${filePath}`, 404);
  }

  const buffer = fs.readFileSync(filePath);
  return parseExcelBuffer(buffer);
}

export default {
  parseExcelBuffer,
  parseExcelFile,
  ExcelValidationError,
  YOUTUBE_URL_REGEX,
};
