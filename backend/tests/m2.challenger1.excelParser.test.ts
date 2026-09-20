import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import {
  parseExcelBuffer,
  parseExcelFile,
  ExcelValidationError,
  extractVideoUrl,
  EXPECTED_SHEETS,
  EXPECTED_HEADERS,
  YOUTUBE_URL_REGEX,
} from '../src/services/excelParserService';

/**
 * Helper to build an in-memory .xlsx Buffer from sheet definitions.
 */
function createWorkbookBuffer(sheets: Record<string, any[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

describe('Milestone M2 Challenger 1: Adversarial Excel Parser & Boundary Suite', () => {
  const DUMMY_EXCEL_PATH = path.resolve(__dirname, '../../database-dummy.xlsx');

  // =========================================================================
  // 1. CORRUPTED, TRUNCATED & MALFORMED FILE BUFFER STRESS
  // =========================================================================
  describe('Category 1: Corrupted, Truncated & Malformed Buffer Stress', () => {
    it('1.1: Rejects null, undefined, empty, and non-buffer types with ExcelValidationError (400)', async () => {
      const invalidInputs: any[] = [
        null,
        undefined,
        Buffer.alloc(0),
        'string-data-not-buffer',
        12345,
        {},
        [],
        true,
      ];

      for (const input of invalidInputs) {
        await expect(parseExcelBuffer(input)).rejects.toThrow(ExcelValidationError);
        try {
          await parseExcelBuffer(input);
          fail('Should have thrown ExcelValidationError');
        } catch (err: any) {
          expect(err).toBeInstanceOf(ExcelValidationError);
          expect(err.statusCode).toBe(400);
          expect(err.name).toBe('ExcelValidationError');
        }
      }
    });

    it('1.2: Rejects truncated buffer headers (< 4 bytes) missing ZIP magic bytes', async () => {
      const truncatedHeaders = [
        Buffer.from([]),
        Buffer.from([0x50]),
        Buffer.from([0x50, 0x4b]),
        Buffer.from([0x50, 0x4b, 0x03]),
      ];

      for (const buf of truncatedHeaders) {
        try {
          await parseExcelBuffer(buf);
          fail('Should have rejected buffer with missing ZIP header');
        } catch (err: any) {
          expect(err).toBeInstanceOf(ExcelValidationError);
          expect(err.statusCode).toBe(400);
          expect(err.message).toMatch(/corrupted or invalid.*missing ZIP header|empty file buffer/i);
        }
      }
    });

    it('1.3: Rejects fake ZIP prefix (PK) with truncated or garbage payload', async () => {
      const fakeZips = [
        Buffer.from([0x50, 0x4b, 0x00, 0x00]),
        Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]),
        Buffer.concat([
          Buffer.from([0x50, 0x4b, 0x03, 0x04]),
          Buffer.from('NON_ZIP_CORRUPT_BYTES_DATA_STREAM'),
        ]),
        Buffer.concat([
          Buffer.from([0x50, 0x4b, 0x05, 0x06]),
          Buffer.alloc(20, 0x00),
        ]),
      ];

      for (const buf of fakeZips) {
        try {
          await parseExcelBuffer(buf);
          fail('Should have rejected corrupted ZIP payload');
        } catch (err: any) {
          expect(err).toBeInstanceOf(ExcelValidationError);
          expect(err.statusCode).toBe(400);
          expect(err.message).toMatch(/corrupted or invalid/i);
        }
      }
    });

    it('1.4: Rejects real Excel file truncated at various boundary offsets (10%, 50%, 90%, 98%)', async () => {
      const realBuffer = fs.readFileSync(DUMMY_EXCEL_PATH);
      const cuts = [0.05, 0.25, 0.5, 0.75, 0.9, 0.98];

      for (const ratio of cuts) {
        const truncatedLen = Math.max(4, Math.floor(realBuffer.length * ratio));
        const truncatedBuf = realBuffer.subarray(0, truncatedLen);

        try {
          await parseExcelBuffer(truncatedBuf);
          fail(`Should have failed on truncated buffer at ${ratio * 100}%`);
        } catch (err: any) {
          expect(err).toBeInstanceOf(ExcelValidationError);
          expect(err.statusCode).toBe(400);
          expect(err.message).toMatch(/corrupted or invalid/i);
        }
      }
    });

    it('1.5: Rejects non-xlsx binary formats with clear 400 error', async () => {
      const nonXlsxBuffers = [
        { name: 'GZIP', buf: Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]) },
        { name: 'PDF', buf: Buffer.from('%PDF-1.7 header string followed by binary objects') },
        { name: 'PNG', buf: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
        { name: 'CSV', buf: Buffer.from('Questions,Reason,Remedy\nWhy pain?,Injury,Arnica\n') },
        { name: 'JSON', buf: Buffer.from('{"questions": ["Why fever?"]}') },
      ];

      for (const { name, buf } of nonXlsxBuffers) {
        try {
          await parseExcelBuffer(buf);
          fail(`Should have rejected ${name} format`);
        } catch (err: any) {
          expect(err).toBeInstanceOf(ExcelValidationError);
          expect(err.statusCode).toBe(400);
          expect(err.message).toMatch(/missing ZIP header/i);
        }
      }
    });
  });

  // =========================================================================
  // 2. SHEET EXISTENCE, CASE SENSITIVITY & NORMALIZATION BOUNDARIES
  // =========================================================================
  describe('Category 2: Sheet Existence & Normalization Boundaries', () => {
    it('2.1: Rejects workbook missing "level1" sheet with structured 400 error', async () => {
      const buf = createWorkbookBuffer({
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q?', 'Reason', 'Remedy']],
      });

      try {
        await parseExcelBuffer(buf);
        fail('Should have rejected missing level1 sheet');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ExcelValidationError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toMatch(/missing required sheet.*level1/i);
        expect(err.details).toEqual({ sheet: 'level1' });
      }
    });

    it('2.2: Rejects workbook missing "ConsultationQueries" sheet with structured 400 error', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        Answers: [['Question', 'Reason', 'Remedy'], ['Q?', 'Reason', 'Remedy']],
      });

      try {
        await parseExcelBuffer(buf);
        fail('Should have rejected missing ConsultationQueries sheet');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ExcelValidationError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toMatch(/missing required sheet.*ConsultationQueries/i);
        expect(err.details).toEqual({ sheet: 'ConsultationQueries' });
      }
    });

    it('2.3: Rejects workbook missing "Answers" sheet with structured 400 error', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
      });

      try {
        await parseExcelBuffer(buf);
        fail('Should have rejected missing Answers sheet');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ExcelValidationError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toMatch(/missing required sheet.*Answers/i);
        expect(err.details).toEqual({ sheet: 'Answers' });
      }
    });

    it('2.4: Accepts sheet names with mixed casing and trims surrounding whitespace', async () => {
      const buf = createWorkbookBuffer({
        '  LEVEL1  ': [['Questions'], ['Is headache treatable?']],
        ' consultationqueries ': [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Is headache treatable?', 'Is it throbbing?', 'Is it one-sided?', 'Worse in sunlight?'],
        ],
        '  ANSWERS ': [
          ['Question', 'Reason', 'Remedy'],
          ['Is headache treatable?', 'Stress or vascular tension', 'Belladonna 30C'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions).toHaveLength(1);
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe('Is headache treatable?');
      expect(parsed.consultationQueries).toHaveLength(1);
      expect(parsed.consultationQueries[0].diagnosticQuestions).toHaveLength(3);
      expect(parsed.answers).toHaveLength(1);
      expect(parsed.answers[0].remedyText).toBe('Belladonna 30C');
    });

    it('2.5: Safely ignores extra unneeded sheets and metadata tabs', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Valid Question?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Valid Question?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Valid Question?', 'Reason', 'Remedy']],
        'Instructions & Guidelines': [['Read before editing']],
        RevisionHistory: [['Rev 1', 'Created by clinic admin']],
        Sheet4: [['Unused']],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions).toHaveLength(1);
      expect(parsed.stats.dataRows.level1).toBe(1);
      expect(parsed.stats.dataRows.consultation).toBe(1);
      expect(parsed.stats.dataRows.answers).toBe(1);
    });
  });

  // =========================================================================
  // 3. COLUMN HEADER VALIDATION & PERMUTATION ROBUSTNESS
  // =========================================================================
  describe('Category 3: Column Header Validation & Permutation Robustness', () => {
    it('3.1: Rejects missing "Questions" header in level1 sheet with 400 and details', async () => {
      const buf = createWorkbookBuffer({
        level1: [['QueryTitle'], ['Some question?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Some question?', 'D1', 'D2', 'D3'],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Some question?', 'R', 'Rem']],
      });

      try {
        await parseExcelBuffer(buf);
        fail('Should have rejected missing Questions header');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ExcelValidationError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toMatch(/sheet 'level1' missing required header.*Questions/i);
        expect(err.details).toMatchObject({ sheet: 'level1', missingHeader: 'Questions' });
      }
    });

    it('3.2: Rejects missing individual diagnostic question headers in ConsultationQueries', async () => {
      const requiredDiagHeaders = [
        'Questions',
        'Diagnostic Question 1',
        'Diagnostic Question 2',
        'Diagnostic Question 3',
      ];

      for (const headerToCorrupt of requiredDiagHeaders) {
        const testHeaders = requiredDiagHeaders.map((h) =>
          h === headerToCorrupt ? 'CorruptedHeader' : h
        );

        const buf = createWorkbookBuffer({
          level1: [['Questions'], ['Q?']],
          ConsultationQueries: [testHeaders, ['Q?', 'D1', 'D2', 'D3']],
          Answers: [['Question', 'Reason', 'Remedy'], ['Q?', 'R', 'Rem']],
        });

        try {
          await parseExcelBuffer(buf);
          fail(`Should have rejected missing header: ${headerToCorrupt}`);
        } catch (err: any) {
          expect(err).toBeInstanceOf(ExcelValidationError);
          expect(err.statusCode).toBe(400);
          expect(err.message).toMatch(
            new RegExp(`sheet 'ConsultationQueries' missing required header.*${headerToCorrupt}`, 'i')
          );
        }
      }
    });

    it('3.3: Rejects missing individual headers in Answers sheet', async () => {
      const requiredAnsHeaders = ['Question', 'Reason', 'Remedy'];

      for (const headerToCorrupt of requiredAnsHeaders) {
        const testHeaders = requiredAnsHeaders.map((h) =>
          h === headerToCorrupt ? 'CorruptedHeader' : h
        );

        const buf = createWorkbookBuffer({
          level1: [['Questions'], ['Q?']],
          ConsultationQueries: [
            ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
            ['Q?', 'D1', 'D2', 'D3'],
          ],
          Answers: [testHeaders, ['Q?', 'R', 'Rem']],
        });

        try {
          await parseExcelBuffer(buf);
          fail(`Should have rejected missing Answers header: ${headerToCorrupt}`);
        } catch (err: any) {
          expect(err).toBeInstanceOf(ExcelValidationError);
          expect(err.statusCode).toBe(400);
          expect(err.message).toMatch(
            new RegExp(`sheet 'Answers' missing required header.*${headerToCorrupt}`, 'i')
          );
        }
      }
    });

    it('3.4: Permuted column orders parse accurately without mapping distortion', async () => {
      const buf = createWorkbookBuffer({
        level1: [
          ['Category', 'Questions', 'Priority'],
          ['ENT', 'Why ringing in ears?', 'High'],
        ],
        ConsultationQueries: [
          // Rearranged: Diag 3, Diag 1, Questions, Diag 2
          ['Diagnostic Question 3', 'Diagnostic Question 1', 'Questions', 'Diagnostic Question 2'],
          ['Is it pulsing?', 'Is hearing reduced?', 'Why ringing in ears?', 'Is there dizziness?'],
        ],
        Answers: [
          // Rearranged: Remedy, Question, ExtraCol, Reason
          ['Remedy', 'Question', 'ExtraCol', 'Reason'],
          ['Chininum Sulph 30C', 'Why ringing in ears?', 'ExtraVal', 'Tinnitus from acoustic nerve fatigue'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe('Why ringing in ears?');

      const cq = parsed.consultationQueries[0];
      expect(cq.questionText).toBe('Why ringing in ears?');
      expect(cq.diagnosticQuestions[0]).toBe('Is hearing reduced?');
      expect(cq.diagnosticQuestions[1]).toBe('Is there dizziness?');
      expect(cq.diagnosticQuestions[2]).toBe('Is it pulsing?');

      const ans = parsed.answers[0];
      expect(ans.questionText).toBe('Why ringing in ears?');
      expect(ans.reasonText).toBe('Tinnitus from acoustic nerve fatigue');
      expect(ans.remedyText).toBe('Chininum Sulph 30C');
    });
  });

  // =========================================================================
  // 4. DIRTY DATA, CELL TYPES, WHITESPACE & GHOST CELLS
  // =========================================================================
  describe('Category 4: Dirty Data, Cell Types, Whitespace & Ghost Cells', () => {
    it('4.1: Ghost and empty rows in sheets are filtered without throwing', async () => {
      const buf = createWorkbookBuffer({
        level1: [
          ['Questions'],
          ['Valid Q1?'],
          [null],
          ['   '],
          ['Valid Q2?'],
          [''],
          [undefined],
        ],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Valid Q1?', 'D1', 'D2', 'D3'],
          [null, null, null, null],
          ['   ', '   ', '   ', '   '],
          ['Valid Q2?', 'D1', 'D2', 'D3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          ['Valid Q1?', 'R1', 'Rem1'],
          ['', '', ''],
          [null, null, null],
          ['Valid Q2?', 'R2', 'Rem2'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions).toHaveLength(2);
      expect(parsed.consultationQueries).toHaveLength(2);
      expect(parsed.answers).toHaveLength(2);
      expect(parsed.level1Questions[0].rawRow).toBe(2);
      expect(parsed.level1Questions[1].rawRow).toBe(5);
    });

    it('4.2: Coerces numeric and boolean cells cleanly to strings', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], [101 as any], [true as any]],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          [101 as any, 1001 as any, 1002 as any, 1003 as any],
          [true as any, 'Diag T1', 'Diag T2', 'Diag T3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          [101 as any, 99.9 as any, 0 as any],
          [true as any, 'Boolean reason', false as any],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe('101');
      expect(parsed.level1Questions[1].canonicalQuestionText).toBe('true');
      expect(parsed.consultationQueries[0].diagnosticQuestions).toEqual(['1001', '1002', '1003']);
      expect(parsed.answers[0].reasonText).toBe('99.9');
      expect(parsed.answers[0].remedyText).toBe('0');
      expect(parsed.answers[1].remedyText).toBe('false');
    });

    it('4.3: Supports Unicode, multi-script questions, and emojis safely', async () => {
      const unicodeQ1 = 'কিভাবে শিশুদের সর্দি ভালো হবে?';
      const unicodeQ2 = 'क्या जोड़ों के दर्द में होम्योपैथी काम करती है?';
      const emojiQ3 = 'Severe chest tightness 🫁 with cold sweat 💦?';

      const buf = createWorkbookBuffer({
        level1: [['Questions'], [unicodeQ1], [unicodeQ2], [emojiQ3]],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          [unicodeQ1, 'জ্বর আছে কি?', 'কাশি কি শুকনা?', 'শ্বাসকষ্ট আছে?'],
          [unicodeQ2, 'दर्द कब बढ़ता है?', 'सूजन है क्या?', 'चलने में परेशानी?'],
          [emojiQ3, 'Radiating to left arm?', 'Shortness of breath?', 'Nausea?'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          [unicodeQ1, 'ভাইরাল সংক্রমণ', 'অ্যাকোনাইট ৩০সি'],
          [unicodeQ2, 'वात रोग अथवा सूजन', 'रस टॉक्स ३०'],
          [emojiQ3, 'Potential cardiac emergency', 'Seek urgent ER care immediately'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.level1Questions).toHaveLength(3);
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe(unicodeQ1);
      expect(parsed.level1Questions[1].canonicalQuestionText).toBe(unicodeQ2);
      expect(parsed.level1Questions[2].canonicalQuestionText).toBe(emojiQ3);
      expect(parsed.answers[0].remedyText).toBe('অ্যাকোনাইট ৩০সি');
      expect(parsed.answers[1].remedyText).toBe('रस टॉक्स ३०');
    });

    it('4.4: Handles sparse diagnostic questions (fewer than 3) gracefully', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Sparse Diag Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Sparse Diag Q?', 'Only one question?', '', null],
        ],
        Answers: [['Question', 'Reason', 'Remedy'], ['Sparse Diag Q?', 'Reason', 'Remedy']],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.consultationQueries[0].diagnosticQuestions).toEqual(['Only one question?']);
    });
  });

  // =========================================================================
  // 5. YOUTUBE URL EXTRACTION EMPIRICAL HARNESS
  // =========================================================================
  describe('Category 5: YouTube URL Extraction Empirical Harness', () => {
    it('5.1: Extracts valid youtu.be short URLs and strips trailing punctuation', () => {
      const validCases = [
        { text: 'Remedy info https://youtu.be/IUy9hg8iT3Q', expected: 'https://youtu.be/IUy9hg8iT3Q' },
        { text: 'See video (https://youtu.be/L_F8VeK8VPQ)', expected: 'https://youtu.be/L_F8VeK8VPQ' },
        { text: 'Guidance: https://youtu.be/a5MQWTSoa6A.', expected: 'https://youtu.be/a5MQWTSoa6A' },
        { text: 'Check https://youtu.be/Be9GyqxlvhM, then rest.', expected: 'https://youtu.be/Be9GyqxlvhM' },
        { text: '<https://youtu.be/IUy9hg8iT3Q>', expected: 'https://youtu.be/IUy9hg8iT3Q' },
        { text: 'https://youtu.be/IUy9hg8iT3Q?si=abcdef1234567890', expected: 'https://youtu.be/IUy9hg8iT3Q?si=abcdef1234567890' },
      ];

      for (const { text, expected } of validCases) {
        expect(extractVideoUrl(text)).toBe(expected);
      }
    });

    it('5.2: Extracts standard youtube.com/watch?v=, embed, and v formats', () => {
      const cases = [
        {
          text: 'Watch at https://www.youtube.com/watch?v=IUy9hg8iT3Q',
          expected: 'https://www.youtube.com/watch?v=IUy9hg8iT3Q',
        },
        {
          text: 'Embed link http://youtube.com/embed/L_F8VeK8VPQ?rel=0',
          expected: 'http://youtube.com/embed/L_F8VeK8VPQ?rel=0',
        },
        {
          text: 'Direct v link www.youtube.com/v/a5MQWTSoa6A',
          expected: 'www.youtube.com/v/a5MQWTSoa6A',
        },
      ];

      for (const { text, expected } of cases) {
        expect(extractVideoUrl(text)).toBe(expected);
      }
    });

    it('5.3: Prioritizes Remedy video URL over Reason video URL', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          [
            'Q?',
            'Reason video https://youtu.be/ReasonVid01',
            'Remedy video https://youtu.be/RemedyVid02',
          ],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.answers[0].videoUrl).toBe('https://youtu.be/RemedyVid02');
    });

    it('5.4: Falls back to Reason video URL when Remedy has no video URL', async () => {
      const buf = createWorkbookBuffer({
        level1: [['Questions'], ['Q?']],
        ConsultationQueries: [
          ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
          ['Q?', 'D1', 'D2', 'D3'],
        ],
        Answers: [
          ['Question', 'Reason', 'Remedy'],
          ['Q?', 'Reason video https://youtu.be/ReasonVid01', 'Plain remedy text without URL'],
        ],
      });

      const parsed = await parseExcelBuffer(buf);
      expect(parsed.answers[0].videoUrl).toBe('https://youtu.be/ReasonVid01');
    });

    it('5.5: Non-video and invalid links return undefined', () => {
      const nonVideoCases = [
        '',
        null,
        undefined,
        'Plain text advice with no links',
        'https://example.com/article/homeopathy',
        'https://vimeo.com/123456789',
        'https://youtu.be/shortId', // < 11 chars
        'https://youtube.com/user/channelName',
      ];

      for (const text of nonVideoCases) {
        expect(extractVideoUrl(text as any)).toBeUndefined();
      }
    });

    it('5.6: Empirical observation: YouTube URLs with query params before v= (e.g. feature=share)', () => {
      // Documenting exact behavior for watch URLs where v= is not the first parameter
      const preParamUrl = 'https://www.youtube.com/watch?feature=share&v=IUy9hg8iT3Q';
      const extracted = extractVideoUrl(preParamUrl);
      // Because regex requires `watch?v=`, URLs with other params before v return undefined
      expect(extracted).toBeUndefined();
    });

    it('5.7: Empirical observation: YouTube Shorts URLs (youtube.com/shorts/)', () => {
      // Documenting exact behavior for YouTube Shorts
      const shortsUrl = 'https://www.youtube.com/shorts/IUy9hg8iT3Q';
      const extracted = extractVideoUrl(shortsUrl);
      // Because regex does not include `shorts/`, shorts URLs return undefined
      expect(extracted).toBeUndefined();
    });
  });

  // =========================================================================
  // 6. REAL DATASET VERIFICATION (database-dummy.xlsx)
  // =========================================================================
  describe('Category 6: Real Dataset Verification (database-dummy.xlsx)', () => {
    it('6.1: Parses database-dummy.xlsx with zero errors and matches exact invariant specifications', async () => {
      expect(fs.existsSync(DUMMY_EXCEL_PATH)).toBe(true);

      const parsed = await parseExcelFile(DUMMY_EXCEL_PATH);

      // Verify row counts
      expect(parsed.level1Questions).toHaveLength(184);
      expect(parsed.consultationQueries).toHaveLength(184);
      expect(parsed.answers).toHaveLength(220);

      // Verify stats
      expect(parsed.stats.totalRows.level1).toBe(185);
      expect(parsed.stats.totalRows.consultation).toBe(185);
      expect(parsed.stats.totalRows.answers).toBe(221);

      expect(parsed.stats.dataRows.level1).toBe(184);
      expect(parsed.stats.dataRows.consultation).toBe(184);
      expect(parsed.stats.dataRows.answers).toBe(220);

      // Verify answer partition
      const l1Answers = parsed.answers.filter((a) => a.answerType === 'level1');
      const diagAnswers = parsed.answers.filter((a) => a.answerType === 'diagnostic');
      expect(l1Answers).toHaveLength(184);
      expect(diagAnswers).toHaveLength(36);

      // Verify all 195 YouTube URLs in the dataset are valid youtu.be links
      const answersWithVideo = parsed.answers.filter((a) => a.videoUrl !== undefined);
      expect(answersWithVideo).toHaveLength(195);
      for (const a of answersWithVideo) {
        expect(a.videoUrl).toMatch(/^https:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/);
      }
    });

    it('6.2: Rejects non-existent file path with 404 ExcelValidationError', async () => {
      const nonExistentPath = '/tmp/non_existent_knowledge_base_file_xyz.xlsx';
      try {
        await parseExcelFile(nonExistentPath);
        fail('Should have thrown 404 for missing file');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ExcelValidationError);
        expect(err.statusCode).toBe(404);
        expect(err.message).toMatch(/not found/i);
      }
    });
  });
});
