import * as XLSX from 'xlsx';
import { MAX_BATCH_ROWS } from './constants';
import type { BatchRow } from '../types';

export interface ExcelParseResult {
  headers: string[];
  rows: BatchRow[];
  totalRows: number;
  emptyRows: number;
  errors: string[];
}

export interface ValidationResult {
  canGenerate: boolean;
  missingColumns: string[];
  extraColumns: string[];
  rowErrors: Array<{ rowIndex: number; missingFields: string[] }>;
  summary: {
    total: number;
    valid: number;
    withErrors: number;
    emptySkipped: number;
  };
}

export function readExcelFile(arrayBuffer: ArrayBuffer): ExcelParseResult {
  const errors: string[] = [];

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  } catch {
    errors.push('无法解析 Excel 文件，请确认文件格式正确。');
    return { headers: [], rows: [], totalRows: 0, emptyRows: 0, errors };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    errors.push('Excel 文件中没有工作表。');
    return { headers: [], rows: [], totalRows: 0, emptyRows: 0, errors };
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  if (jsonData.length < 2) {
    errors.push('Excel 文件为空或只有表头行，没有数据。');
    return { headers: [], rows: [], totalRows: 0, emptyRows: 0, errors };
  }

  const headers = (jsonData[0] || []).map((h) => String(h ?? '').trim());

  if (headers.some((h) => h === '')) {
    errors.push('Excel 表头中存在空列名，请检查第一行。');
    return { headers: [], rows: [], totalRows: 0, emptyRows: 0, errors };
  }

  const dataRows = jsonData.slice(1);
  const allRows: BatchRow[] = [];
  let emptyCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const isEmpty = !row || row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
    if (isEmpty) {
      emptyCount++;
      continue;
    }
    const rowObj: BatchRow = {};
    headers.forEach((h, idx) => {
      rowObj[h] = String(row[idx] ?? '').trim();
    });
    allRows.push(rowObj);
  }

  if (allRows.length > MAX_BATCH_ROWS) {
    errors.push(
      `当前版本最多支持一次生成 ${MAX_BATCH_ROWS} 份，请拆分 Excel 后分批处理。`
    );
    return { headers, rows: [], totalRows: dataRows.length, emptyRows: emptyCount, errors };
  }

  return {
    headers,
    rows: allRows,
    totalRows: dataRows.length,
    emptyRows: emptyCount,
    errors,
  };
}

export function validateExcelData(
  headers: string[],
  rows: BatchRow[],
  templateVariables: string[]
): ValidationResult {
  const headerSet = new Set(headers);
  const variableSet = new Set(templateVariables);

  const missingColumns = templateVariables.filter((v) => !headerSet.has(v));
  const extraColumns = headers.filter((h) => !variableSet.has(h));

  const rowErrors: Array<{ rowIndex: number; missingFields: string[] }> = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const missingFields = templateVariables.filter(
      (v) => headerSet.has(v) && (!row[v] || row[v].trim() === '')
    );
    if (missingFields.length > 0) {
      rowErrors.push({ rowIndex: i + 1, missingFields });
    }
  }

  const canGenerate = missingColumns.length === 0;

  return {
    canGenerate,
    missingColumns,
    extraColumns,
    rowErrors,
    summary: {
      total: rows.length,
      valid: rows.length - rowErrors.length,
      withErrors: rowErrors.length,
      emptySkipped: 0,
    },
  };
}

export function generateExcelTemplate(variables: string[]): Blob {
  const ws = XLSX.utils.aoa_to_sheet([variables]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '数据');

  const descSheet = XLSX.utils.aoa_to_sheet([
    ['变量说明'],
    ['以下为模板变量列表，请在「数据」sheet 中填写数据。'],
    [''],
    ['变量名'],
    ...variables.map((v) => [v]),
  ]);
  XLSX.utils.book_append_sheet(wb, descSheet, '说明');

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function generateExampleExcel(): Blob {
  const headers = ['姓名', '单位名称', '日期', '文号'];
  const data = [
    ['张三', '北京市XX局', '2026-06-14', '京XX〔2026〕001号'],
    ['李四', '上海市YY处', '2026-06-15', '沪YY〔2026〕002号'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '数据');
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
