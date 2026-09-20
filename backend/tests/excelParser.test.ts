import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import {
  parseExcelBuffer,
  parseExcelFile,
  ExcelValidationError,
  ParsedExcelData,
  YOUTUBE_URL_REGEX,
} from '../src/services/excelParserService';

/**
 * In-memory test workbook generator helper.
 */
function createWorkbookBuffer(sheets: Record<string, any[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Minimal valid workbook buffer generator.
 */
function createValidWorkbookBuffer(qCount: number = 2): Buffer {
  const level1Rows: any[][] = [['Questions']];
  const consultRows: any[][] = [
    ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
  ];
  const answerRows: any[][] = [['Question', 'Reason', 'Remedy']];

  for (let i = 1; i <= qCount; i++) {
    const q = `Is symptom ${i} treatable?`;
    level1Rows.push([q]);
    consultRows.push([q, `Diag A${i}?`, `Diag B${i}?`, `Diag C${i}?`]);
    answerRows.push([
      q,
      `Reason pathology ${i}`,
      `Remedy herb ${i} https://youtu.be/IUy9hg8iT3Q`,
    ]);
  }

  return createWorkbookBuffer({
    level1: level1Rows,
    ConsultationQueries: consultRows,
    Answers: answerRows,
  });
}

describe('Excel Parser Service & Boundary Validation Unit Test Suite', () => {
  const DUMMY_EXCEL_PATH = path.resolve(__dirname, '../../database-dummy.xlsx');

  // =========================================================================
  // 1. Buffer Input Boundaries
  // =========================================================================
  describe('1. Buffer Input Boundaries', () => {
    it('should reject null buffer with ExcelValidationError and statusCode 400', async () => {
      await expect(parseExcelBuffer(null as any)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(null as any)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Empty file buffer provided',
      });
    });

    it('should reject undefined buffer with statusCode 400', async () => {
      await expect(parseExcelBuffer(undefined as any)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(undefined as any)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should reject 0-byte buffer with "Empty file buffer provided"', async () => {
      const emptyBuf = Buffer.alloc(0);
      await expect(parseExcelBuffer(emptyBuf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(emptyBuf)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Empty file buffer provided',
      });
    });

    it('should reject non-buffer object input', async () => {
      await expect(parseExcelBuffer({} as any)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer({} as any)).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  // =========================================================================
  // 2. Binary Signature & Format Verification (Magic Bytes 0x50, 0x4B)
  // =========================================================================
  describe('2. Binary Signature & Format Verification (ZIP magic bytes)', () => {
    it('should reject short buffer (< 4 bytes) with missing ZIP header error', async () => {
      const shortBuf = Buffer.from([0x50, 0x4b]);
      await expect(parseExcelBuffer(shortBuf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(shortBuf)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/missing ZIP header/i),
      });
    });

    it('should reject plain text buffer without ZIP magic bytes', async () => {
      const textBuf = Buffer.from('This is a plain text file, not an Excel workbook.');
      await expect(parseExcelBuffer(textBuf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(textBuf)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/corrupted or invalid.*missing ZIP header/i),
      });
    });

    it('should reject CSV file disguised with .xlsx content', async () => {
      const csvBuf = Buffer.from('Questions,Reason,Remedy\nWhy cough?,Dust,Warm tea\n');
      await expect(parseExcelBuffer(csvBuf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(csvBuf)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should reject PDF file header (%PDF / 0x25, 0x50)', async () => {
      const pdfBuf = Buffer.from('%PDF-1.5 fake binary content for testing');
      await expect(parseExcelBuffer(pdfBuf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(pdfBuf)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should reject PNG image header (0x89, 0x50, 0x4E, 0x47)', async () => {
      const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      await expect(parseExcelBuffer(pngBuf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(pngBuf)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should reject buffer with 0x50, 0x4B prefix but corrupted payload', async () => {
      // Starts with PK magic bytes, but subsequent content is corrupted junk
      const fakeZipBuf = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from('CORRUPTED_STREAM_THAT_CANNOT_BE_DECOMPRESSED_AS_ZIP'),
      ]);
      await expect(parseExcelBuffer(fakeZipBuf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(fakeZipBuf)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/corrupted or invalid/i),
      });
    });
  });

  // =========================================================================
  // 3. File Path Ingestion Boundaries (parseExcelFile)
  // =========================================================================
  describe('3. File Path Ingestion Boundaries (parseExcelFile)', () => {
    it('should reject empty or whitespace-only file path with 400', async () => {
      await expect(parseExcelFile('')).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelFile('   ')).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/non-empty string/i),
      });
    });

    it('should reject non-existent file path with 404', async () => {
      const nonExistent = '/tmp/non_existent_knowledge_base_file_9999.xlsx';
      await expect(parseExcelFile(nonExistent)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelFile(nonExistent)).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringMatching(/not found/i),
      });
    });

    it('should reject non-string filePath argument', async () => {
      await expect(parseExcelFile(12345 as any)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelFile(null as any)).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // =========================================================================
  // 4. Mandatory Sheets Existence & Normalization
  // =========================================================================
  describe('4. Mandatory Sheets Existence & Normalization', () => {
    it('should reject workbook missing "level1" sheet with descriptive 400 error', async () => {
      const buf = createWorkbookBuffer({
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q1?', 'D1?', 'D2?', 'D3?'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q1?', 'R1', 'Rem1']],
      });
      await expect(parseExcelBuffer(buf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(buf)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/missing required sheet.*level1/i),
      });
    });

    it('should reject workbook missing "ConsultationQueries" sheet with descriptive 400 error', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q1?']],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q1?', 'R1', 'Rem1']],
      });
      await expect(parseExcelBuffer(buf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(buf)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/missing required sheet.*ConsultationQueries/i),
      });
    });

    it('should reject workbook missing "Answers" sheet with descriptive 400 error', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q1?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q1?', 'D1?', 'D2?', 'D3?'],
        ],
      });
      await expect(parseExcelBuffer(buf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(buf)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/missing required sheet.*Answers/i),
      });
    });

    it('should reject workbook with no sheets / empty workbook', async () => {
      const wb = XLSX.utils.book_new();
      const emptySheetWs = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, emptySheetWs, 'EmptyOnly');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(buf)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should accept sheets with casing variations (e.g. "Level1", "consultationqueries", "ANSWERS")', async () => {
      const buf = createWorkbookBuffer({
        Level1: [['Questions'], ['Q with different case?']],
        consultationqueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q with different case?', 'D1?', 'D2?', 'D3?'],
        ],
        ANSWERS: [['Question', 'Reason', 'Remedy'], ['Q with different case?', 'Reason', 'Remedy']],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions).toHaveLength(1);
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe('Q with different case?');
      expect(parsed.consultationQueries).toHaveLength(1);
      expect(parsed.answers).toHaveLength(1);
    });

    it('should safely ignore extra extraneous sheets', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Valid Question?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Valid Question?', 'D1?', 'D2?', 'D3?'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Valid Question?', 'Reason', 'Remedy']],
        Sheet1: [['Unused column'], ['Some unused data']],
        Metadata: [['Author', 'Aditya'], ['Version', '1.0']],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions).toHaveLength(1);
      expect(parsed.stats.dataRows.level1).toBe(1);
    });
  });

  // =========================================================================
  // 5. Mandatory Column Header Validation
  // =========================================================================
  describe('5. Mandatory Column Header Validation', () => {
    it('should reject "level1" sheet with empty header row', async () => {
      const buf = createWorkbookBuffer({
        level1: [],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
        ],
        Answers: [['Question', 'Reason', 'Remedy']],
      });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/sheet 'level1' missing required header.*Questions/i),
        })
      );
    });

    it('should reject "level1" sheet missing "Questions" column header', async () => {
      const buf = createWorkbookBuffer({
        level1: [['IncorrectHeaderName'], ['Question text?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Question text?', 'D1?', 'D2?', 'D3?'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Question text?', 'R', 'Rem']],
      });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/sheet 'level1' missing required header.*Questions/i),
        })
      );
    });

    it('should reject "ConsultationQueries" sheet missing "Questions" header', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['WrongCol', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q?', 'R', 'Rem']],
      });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/sheet 'ConsultationQueries' missing required header.*Questions/i),
        })
      );
    });

    it('should reject "ConsultationQueries" sheet missing "Diagnostic Question 1" header', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diag 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q?', 'R', 'Rem']],
      });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/sheet 'ConsultationQueries' missing required header.*Diagnostic Question 1/i),
        })
      );
    });

    it('should reject "ConsultationQueries" sheet missing "Diagnostic Question 2" header', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'MissingDiag2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q?', 'R', 'Rem']],
      });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/sheet 'ConsultationQueries' missing required header.*Diagnostic Question 2/i),
        })
      );
    });

    it('should reject "ConsultationQueries" sheet missing "Diagnostic Question 3" header', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'MissingDiag3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q?', 'R', 'Rem']],
      });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/sheet 'ConsultationQueries' missing required header.*Diagnostic Question 3/i),
        })
      );
    });

    it('should reject "Answers" sheet missing "Question" header (e.g. plural "Questions")', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Questions', 'Reason', 'Remedy'], ['Q?', 'R', 'Rem']], // Note plural 'Questions' is invalid here
      });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/sheet 'Answers' missing required header.*Question/i),
        })
      );
    });

    it('should reject "Answers" sheet missing "Reason" header', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Explanation', 'Remedy'], ['Q?', 'R', 'Rem']],
      });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/sheet 'Answers' missing required header.*Reason/i),
        })
      );
    });

    it('should reject "Answers" sheet missing "Remedy" header', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Reason', 'Treatment'], ['Q?', 'R', 'Rem']],
      });

      await expect(parseExcelBuffer(buf)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/sheet 'Answers' missing required header.*Remedy/i),
        })
      );
    });

    it('should accept headers with leading or trailing whitespace', async () => {
      const buf = createWorkbookBuffer({
        level1: [['   Questions   '], ['Q?']],
        ConsultationQueries: [
          [' Questions ', ' Diagnostic Question 1 ', ' Diagnostic Question 2 ', ' Diagnostic Question 3 '],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [[' Question ', ' Reason ', ' Remedy '], ['Q?', 'R', 'Rem']],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions).toHaveLength(1);
      expect(parsed.consultationQueries).toHaveLength(1);
      expect(parsed.answers).toHaveLength(1);
    });

    it('should correctly parse columns even when arranged in non-standard column order', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          // Order swapped: Diag 3 before Diag 1
          ['Questions', 'Diagnostic Question 3', 'Diagnostic Question 1', 'Diagnostic Question 2'],
          ['Q?', 'Diag3_Val', 'Diag1_Val', 'Diag2_Val'],
        ],
        Answers: [
          // Order swapped: Remedy before Reason
          ['Question', 'Remedy', 'Reason'],
          ['Q?', 'Remedy_Val', 'Reason_Val'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.consultationQueries[0].diagnosticQuestions).toEqual([
        'Diag1_Val',
        'Diag2_Val',
        'Diag3_Val',
      ]);
      expect(parsed.answers[0].remedyText).toBe('Remedy_Val');
      expect(parsed.answers[0].reasonText).toBe('Reason_Val');
    });
  });

  // =========================================================================
  // 6. Row Parsing, Sanitization, and Boundary Data
  // =========================================================================
  describe('6. Row Parsing, Sanitization, and Boundary Data', () => {
    it('should trim leading/trailing whitespace and trailing newlines from all cells', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['   Is fever dangerous in infants?   \n\n\t']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          [
            '   Is fever dangerous in infants?   \n\n\t',
            '  Is temperature over 102? \n',
            ' Is there lethargy? \r\n',
            ' Refusing fluids?   ',
          ],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          [
            '   Is fever dangerous in infants?   \n\n\t',
            '  High fever can indicate infection.\n\n',
            ' Keep infant hydrated. Sponge with lukewarm water.\n\n',
          ],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe('Is fever dangerous in infants?');
      expect(parsed.consultationQueries[0].diagnosticQuestions[0]).toBe('Is temperature over 102?');
      expect(parsed.consultationQueries[0].diagnosticQuestions[1]).toBe('Is there lethargy?');
      expect(parsed.consultationQueries[0].diagnosticQuestions[2]).toBe('Refusing fluids?');
      expect(parsed.answers[0].reasonText).toBe('High fever can indicate infection.');
      expect(parsed.answers[0].remedyText).toBe(
        'Keep infant hydrated. Sponge with lukewarm water.'
      );
    });

    it('should safely skip ghost/blank rows in the middle or end of worksheets', async () => {
      const buf = createWorkbookBuffer({
        level1: [
          ['Questions'],
          ['Valid Q1?'],
          ['   '], // blank row
          [null],   // null row
          ['Valid Q2?'],
          [''],     // empty string row
        ],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Valid Q1?', 'D1', 'D2', 'D3'],
          ['', '', '', ''],
          ['Valid Q2?', 'D1', 'D2', 'D3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          ['Valid Q1?', 'R1', 'Rem1'],
          [null, null, null],
          ['Valid Q2?', 'R2', 'Rem2'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions).toHaveLength(2);
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe('Valid Q1?');
      expect(parsed.level1Questions[1].canonicalQuestionText).toBe('Valid Q2?');
      expect(parsed.consultationQueries).toHaveLength(2);
      expect(parsed.answers).toHaveLength(2);
      expect(parsed.stats.dataRows.level1).toBe(2);
    });

    it('should coerce numeric and non-string cell values to trimmed strings', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], [12345 as any]],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          [12345 as any, 100 as any, 200 as any, 300 as any],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], [12345 as any, 999 as any, 888 as any]],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe('12345');
      expect(parsed.consultationQueries[0].diagnosticQuestions).toEqual(['100', '200', '300']);
      expect(parsed.answers[0].reasonText).toBe('999');
      expect(parsed.answers[0].remedyText).toBe('888');
    });

    it('should accurately track 1-indexed rawRow coordinates', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q on row 2?'], ['Q on row 3?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q on row 2?', 'D1', 'D2', 'D3'],
          ['Q on row 3?', 'D1', 'D2', 'D3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          ['Q on row 2?', 'R1', 'Rem1'],
          ['Q on row 3?', 'R2', 'Rem2'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions[0].rawRow).toBe(2);
      expect(parsed.level1Questions[1].rawRow).toBe(3);
      expect(parsed.consultationQueries[0].rawRow).toBe(2);
      expect(parsed.answers[0].rawRow).toBe(2);
    });

    it('should handle rows with fewer than 3 diagnostic questions gracefully', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q with only 1 diag?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q with only 1 diag?', 'Only Diag 1?', '', null],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q with only 1 diag?', 'Reason', 'Remedy']],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.consultationQueries[0].diagnosticQuestions).toHaveLength(1);
      expect(parsed.consultationQueries[0].diagnosticQuestions[0]).toBe('Only Diag 1?');
    });

    it('should handle answers with empty Reason or Remedy gracefully', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q?', '', '']],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.answers[0].reasonText).toBe('');
      expect(parsed.answers[0].remedyText).toBe('');
      expect(parsed.answers[0].videoUrl).toBeUndefined();
    });

    it('should handle extremely long strings (8000+ chars) safely', async () => {
      const longText = 'A'.repeat(8000) + '?';
      const buf = createWorkbookBuffer({
        level1: [['Questions'], [longText]],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          [longText, 'D1?', 'D2?', 'D3?'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], [longText, 'Reason text', 'Remedy text']],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions[0].canonicalQuestionText).toHaveLength(8001);
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe(longText);
    });
  });

  // =========================================================================
  // 7. Media & YouTube URL Extraction
  // =========================================================================
  describe('7. Media & YouTube URL Extraction', () => {
    it('should extract youtu.be short URL from Remedy cell', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q1?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q1?', 'D1', 'D2', 'D3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          ['Q1?', 'Pathology details', 'Take turmeric. https://youtu.be/IUy9hg8iT3Q?si=abcdef12345'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.answers[0].videoUrl).toBe('https://youtu.be/IUy9hg8iT3Q?si=abcdef12345');
    });

    it('should extract youtube.com/watch?v= URL from Reason cell when absent in Remedy', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q1?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q1?', 'D1', 'D2', 'D3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          ['Q1?', 'See video https://www.youtube.com/watch?v=L_F8VeK8VPQ for mechanism', 'Simple tea'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.answers[0].videoUrl).toBe('https://www.youtube.com/watch?v=L_F8VeK8VPQ');
    });

    it('should prioritize Remedy video URL when both Reason and Remedy contain video links', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q1?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q1?', 'D1', 'D2', 'D3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          [
            'Q1?',
            'Reason link https://youtu.be/Reason12345',
            'Remedy link https://youtu.be/Remedy12345',
          ],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.answers[0].videoUrl).toBe('https://youtu.be/Remedy12345');
    });

    it('should set videoUrl to undefined when no YouTube link exists', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q1?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q1?', 'D1', 'D2', 'D3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          ['Q1?', 'No video link in reason', 'No video link in remedy either'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.answers[0].videoUrl).toBeUndefined();
    });

    it('should correctly match YouTube video ID format via YOUTUBE_URL_REGEX', () => {
      const testUrls = [
        { url: 'https://youtu.be/IUy9hg8iT3Q', id: 'IUy9hg8iT3Q' },
        { url: 'https://www.youtube.com/watch?v=L_F8VeK8VPQ&feature=share', id: 'L_F8VeK8VPQ' },
        { url: 'http://youtube.com/embed/Be9GyqxlvhM', id: 'Be9GyqxlvhM' },
        { url: 'https://youtu.be/jbYbeU9TG80?si=test1234', id: 'jbYbeU9TG80' },
      ];

      for (const item of testUrls) {
        const match = item.url.match(YOUTUBE_URL_REGEX);
        expect(match).not.toBeNull();
        expect(match![1]).toBe(item.id);
      }
    });
  });

  // =========================================================================
  // 8. Answer Type Classification ('level1' vs 'diagnostic')
  // =========================================================================
  describe('8. Answer Type Classification', () => {
    it('should classify answers corresponding to level1 questions as "level1" and additional answers as "diagnostic"', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Top Level Q1?'], ['Top Level Q2?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Top Level Q1?', 'Diag A?', 'Diag B?', 'Diag C?'],
          ['Top Level Q2?', 'Diag D?', 'Diag E?', 'Diag F?'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          ['Top Level Q1?', 'Reason 1', 'Remedy 1'], // L1 answer
          ['Top Level Q2?', 'Reason 2', 'Remedy 2'], // L1 answer
          ['Diag A?', 'Diag Reason A', 'Diag Remedy A'], // Diagnostic answer
          ['Diag D?', 'Diag Reason D', 'Diag Remedy D'], // Diagnostic answer
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.answers).toHaveLength(4);
      expect(parsed.answers[0].answerType).toBe('level1');
      expect(parsed.answers[1].answerType).toBe('level1');
      expect(parsed.answers[2].answerType).toBe('diagnostic');
      expect(parsed.answers[3].answerType).toBe('diagnostic');
    });
  });

  // =========================================================================
  // 9. Custom ExcelValidationError Architecture
  // =========================================================================
  describe('9. Custom ExcelValidationError Architecture', () => {
    it('should inherit from Error and maintain correct prototype chain', () => {
      const err = new ExcelValidationError('Test validation failure', 400);
      expect(err).toBeInstanceOf(ExcelValidationError);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ExcelValidationError');
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Test validation failure');
    });

    it('should support custom statusCode (e.g. 404) and structured details', () => {
      const err = new ExcelValidationError('File not found', 404, { sheet: 'level1' });
      expect(err.statusCode).toBe(404);
      expect(err.details).toEqual({ sheet: 'level1' });
    });

    it('should serialize cleanly to JSON via toJSON()', () => {
      const err = new ExcelValidationError('Invalid column', 400, { missingHeader: 'Questions' });
      const json = err.toJSON();
      expect(json).toEqual({
        name: 'ExcelValidationError',
        message: 'Invalid column',
        statusCode: 400,
        details: { missingHeader: 'Questions' },
      });
    });
  });

  // =========================================================================
  // 10. Real Dataset Verification (database-dummy.xlsx)
  // =========================================================================
  describe('10. Real Dataset Verification (database-dummy.xlsx)', () => {
    it('should parse database-dummy.xlsx extracting exactly 184 level1 questions, 184 consultation queries, and 220 answers', async () => {
      expect(fs.existsSync(DUMMY_EXCEL_PATH)).toBe(true);

      const parsed = await parseExcelFile(DUMMY_EXCEL_PATH);

      // Verify extracted data counts
      expect(parsed.level1Questions).toHaveLength(184);
      expect(parsed.consultationQueries).toHaveLength(184);
      expect(parsed.answers).toHaveLength(220);

      // Verify stats object
      expect(parsed.stats.totalRows.level1).toBe(185);
      expect(parsed.stats.totalRows.consultation).toBe(185);
      expect(parsed.stats.totalRows.answers).toBe(221);

      expect(parsed.stats.dataRows.level1).toBe(184);
      expect(parsed.stats.dataRows.consultation).toBe(184);
      expect(parsed.stats.dataRows.answers).toBe(220);

      // Verify first Level 1 Question
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe(
        'Are antibiotics safe for children?'
      );
      expect(parsed.level1Questions[0].rawRow).toBe(2);

      // Verify last Level 1 Question
      expect(parsed.level1Questions[183].canonicalQuestionText).toBe(
        "Why is my child's cough not going away?"
      );
      expect(parsed.level1Questions[183].rawRow).toBe(185);

      // Verify all 184 Level 1 questions end with '?'
      for (const q of parsed.level1Questions) {
        expect(q.canonicalQuestionText.endsWith('?')).toBe(true);
      }

      // Verify all 184 consultation queries have exactly 3 non-empty diagnostic questions
      for (const cq of parsed.consultationQueries) {
        expect(cq.diagnosticQuestions).toHaveLength(3);
        for (const dq of cq.diagnosticQuestions) {
          expect(dq.length).toBeGreaterThan(0);
          expect(dq.endsWith('?')).toBe(true);
        }
      }

      // Verify answer type partition: first 184 are 'level1', last 36 are 'diagnostic'
      const l1Answers = parsed.answers.filter((a) => a.answerType === 'level1');
      const diagAnswers = parsed.answers.filter((a) => a.answerType === 'diagnostic');
      expect(l1Answers).toHaveLength(184);
      expect(diagAnswers).toHaveLength(36);

      // Verify YouTube video URLs extracted (195 out of 220 records contain video links)
      const answersWithVideo = parsed.answers.filter((a) => a.videoUrl !== undefined);
      expect(answersWithVideo.length).toBe(195);
      for (const a of answersWithVideo) {
        expect(a.videoUrl).toMatch(/youtu\.be\/[a-zA-Z0-9_-]{11}/);
      }
    });
  });
});
