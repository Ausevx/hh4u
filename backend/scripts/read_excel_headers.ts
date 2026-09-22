import * as xlsx from 'xlsx';
import * as path from 'path';

const filePath = path.resolve(__dirname, '../../database-dummy.xlsx');
const workbook = xlsx.readFile(filePath);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Headers:", data[0]);
console.log("Row 1:", data[1]);
