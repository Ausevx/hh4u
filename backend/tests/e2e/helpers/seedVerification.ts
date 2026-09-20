import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

export const DUMMY_EXCEL_PATH = path.resolve(__dirname, '../../../../database-dummy.xlsx');

export const EXPECTED_SHEETS = ['level1', 'ConsultationQueries', 'Answers'] as const;

export const EXPECTED_TOTAL_ROWS = {
  level1: 185,
  consultation: 185,
  answers: 221,
};

export const EXPECTED_DATA_ROWS = {
  level1: 184,
  consultation: 184,
  answers: 220,
};

export const EXPECTED_HEADERS = {
  level1: ['Questions'],
  consultation: ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'],
  answers: ['Question', 'Reason', 'Remedy'],
};

export const YOUTUBE_URL_REGEX = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})[^\s]*/;

/**
 * Validates that database-dummy.xlsx exists on disk.
 */
export function assertDummyExcelExists(): boolean {
  return fs.existsSync(DUMMY_EXCEL_PATH);
}

/**
 * Inspects database-dummy.xlsx directly using xlsx to establish reference metrics.
 */
export function inspectReferenceExcel() {
  if (!assertDummyExcelExists()) {
    throw new Error(`Reference file not found at ${DUMMY_EXCEL_PATH}`);
  }
  const wb = XLSX.readFile(DUMMY_EXCEL_PATH);
  
  const level1Ws = wb.Sheets['level1'];
  const level1Rows = XLSX.utils.sheet_to_json<any[]>(level1Ws, { header: 1 });

  const consultWs = wb.Sheets['ConsultationQueries'];
  const consultRows = XLSX.utils.sheet_to_json<any[]>(consultWs, { header: 1 });

  const answersWs = wb.Sheets['Answers'];
  const answersRows = XLSX.utils.sheet_to_json<any[]>(answersWs, { header: 1 });

  return {
    sheetNames: wb.SheetNames,
    level1: {
      totalRows: level1Rows.length,
      dataRows: level1Rows.length - 1,
      header: level1Rows[0],
      firstQuestion: (level1Rows[1] as any[])[0],
      lastQuestion: (level1Rows[level1Rows.length - 1] as any[])[0],
    },
    consultation: {
      totalRows: consultRows.length,
      dataRows: consultRows.length - 1,
      header: consultRows[0],
      firstRow: consultRows[1],
    },
    answers: {
      totalRows: answersRows.length,
      dataRows: answersRows.length - 1,
      header: answersRows[0],
      firstRow: answersRows[1],
    }
  };
}
