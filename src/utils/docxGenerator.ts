import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { ILLEGAL_FILENAME_CHARS } from './constants';
import type { VariableValuePair, BatchRow } from '../types';

const DOCX_OPTIONS = {
  delimiters: { start: '{{', end: '}}' },
  paragraphLoop: true,
  linebreaks: true,
};

function sanitizeFileName(name: string): string {
  return name.replace(ILLEGAL_FILENAME_CHARS, '_');
}

function renderDocx(
  templateBuffer: ArrayBuffer,
  data: Record<string, string>
): Blob {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, DOCX_OPTIONS);
  try {
    doc.render(data);
  } catch (err) {
    const messages: string[] = [];
    if (err && typeof err === 'object' && 'properties' in err) {
      const e = err as { properties?: { errors?: Array<{ message?: string }> } };
      if (e.properties?.errors) {
        for (const sub of e.properties.errors) {
          if (sub.message) messages.push(sub.message);
        }
      }
    }
    const detail = messages.length > 0 ? messages.join('; ') : String(err);
    throw new Error(
      `模板渲染失败，请检查占位符是否完整，例如 {{姓名}}。详细信息: ${detail}`,
      { cause: err }
    );
  }
  return doc.getZip().generate({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export function generateSingleDocx(
  templateBuffer: ArrayBuffer,
  variables: VariableValuePair[],
  fileName: string
): void {
  const data: Record<string, string> = {};
  for (const { name, value } of variables) {
    data[name] = value;
  }

  const blob = renderDocx(templateBuffer, data);
  saveAs(blob, sanitizeFileName(fileName));
}

export async function generateBatchDocx(
  templateBuffer: ArrayBuffer,
  templateVariables: string[],
  rows: BatchRow[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const firstVar = templateVariables[0];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const data: Record<string, string> = {};
    for (const v of templateVariables) {
      data[v] = row[v] || '';
    }

    const blob = renderDocx(templateBuffer, data);

    const firstVal = firstVar ? sanitizeFileName(row[firstVar] || '') : '';
    const seq = String(i + 1).padStart(3, '0');
    const name = firstVal ? `${seq}_${firstVal}.docx` : `${seq}.docx`;

    zip.file(name, blob);

    onProgress?.(i + 1, rows.length);

    if (i % 10 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, '批量生成.zip');
}
