import * as XLSX from 'xlsx';

/**
 * Creates an in-memory .xlsx Buffer from raw sheet data.
 */
export function createCustomWorkbookBuffer(sheets: Record<string, any[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Creates a minimal valid workbook with all 3 required sheets and valid headers.
 */
export function createValidMinimalWorkbookBuffer(questionCount: number = 2): Buffer {
  const level1Rows: any[][] = [['Questions']];
  const consultRows: any[][] = [['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3']];
  const answerRows: any[][] = [['Question', 'Reason', 'Remedy']];

  for (let i = 1; i <= questionCount; i++) {
    const qText = `Sample Medical Question ${i}?`;
    level1Rows.push([qText]);
    consultRows.push([qText, `Diagnostic A${i}?`, `Diagnostic B${i}?`, `Diagnostic C${i}?`]);
    answerRows.push([qText, `Reason explanation for question ${i}`, `Remedy guidance with video https://youtu.be/IUy9hg8iT3Q`]);
  }

  return createCustomWorkbookBuffer({
    level1: level1Rows,
    ConsultationQueries: consultRows,
    Answers: answerRows,
  });
}

/**
 * Creates a workbook missing one of the required sheets.
 */
export function createMissingSheetWorkbookBuffer(missingSheet: 'level1' | 'ConsultationQueries' | 'Answers'): Buffer {
  const validSheets: Record<string, any[][]> = {
    level1: [['Questions'], ['Is headache common?']],
    ConsultationQueries: [['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'], ['Is headache common?', 'Is it pulsing?', 'Is it behind eyes?', 'Does it worsen with light?']],
    Answers: [['Question', 'Reason', 'Remedy'], ['Is headache common?', 'Tension in cranial muscles.', 'Rest and hydration.']],
  };

  delete validSheets[missingSheet];
  return createCustomWorkbookBuffer(validSheets);
}

/**
 * Creates a workbook where a specific sheet has a missing column header.
 */
export function createMissingColumnWorkbookBuffer(
  targetSheet: 'level1' | 'ConsultationQueries' | 'Answers',
  missingColumnIndex: number
): Buffer {
  const sheets: Record<string, any[][]> = {
    level1: [['Questions'], ['Is headache common?']],
    ConsultationQueries: [['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'], ['Is headache common?', 'Diag 1', 'Diag 2', 'Diag 3']],
    Answers: [['Question', 'Reason', 'Remedy'], ['Is headache common?', 'Reason text', 'Remedy text']],
  };

  // Remove the specified column from the target sheet header
  sheets[targetSheet][0].splice(missingColumnIndex, 1);
  return createCustomWorkbookBuffer(sheets);
}

/**
 * Creates an empty workbook buffer (0 sheets or empty data).
 */
export function createEmptyWorkbookBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.book_append_sheet(wb, ws, 'EmptySheet');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Creates a completely corrupted buffer (non-zip/non-excel junk bytes).
 */
export function createCorruptedBuffer(): Buffer {
  return Buffer.from('NOT_A_VALID_EXCEL_FILE_CONTENT_JUST_RANDOM_TEXT_AND_CORRUPTED_BYTES_123456');
}

/**
 * Creates a workbook containing strings with extra leading/trailing whitespace and control chars.
 */
export function createWhitespaceWorkbookBuffer(): Buffer {
  return createCustomWorkbookBuffer({
    level1: [['Questions'], ['   Are natural remedies effective?   \n\t']],
    ConsultationQueries: [['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'], ['   Are natural remedies effective?   \n\t', '  Is it acute? ', ' Chronic? ', ' Any fever? ']],
    Answers: [['Question', 'Reason', 'Remedy'], ['   Are natural remedies effective?   \n\t', '  Pathology info. \n\n', ' Take warm water. https://youtu.be/IUy9hg8iT3Q  \n\n']],
  });
}

/**
 * Creates a workbook with an extremely long question text.
 */
export function createExtremeLengthWorkbookBuffer(length: number = 8000): Buffer {
  const longText = 'A'.repeat(length) + '?';
  return createCustomWorkbookBuffer({
    level1: [['Questions'], [longText]],
    ConsultationQueries: [['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'], [longText, 'D1?', 'D2?', 'D3?']],
    Answers: [['Question', 'Reason', 'Remedy'], [longText, 'Long reason', 'Long remedy']],
  });
}
