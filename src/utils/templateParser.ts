import PizZip from 'pizzip';
import {
  PLACEHOLDER_REGEX,
  VALID_VARIABLE_NAME,
  TEMPLATE_FILES_TO_SCAN,
} from './constants';

export interface ParseResult {
  variables: string[];
  errors: string[];
}

function stripXmlTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, '');
}

function extractVariablesFromXml(xml: string): string[] {
  const text = stripXmlTags(xml);
  const vars: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim();
    vars.push(name);
  }
  return vars;
}

export function parseTemplate(arrayBuffer: ArrayBuffer): ParseResult {
  const errors: string[] = [];
  const allVars: string[] = [];
  const seen = new Set<string>();

  let zip: PizZip;
  try {
    zip = new PizZip(arrayBuffer);
  } catch {
    errors.push('无法解析 .docx 文件，请确认文件未损坏。');
    return { variables: [], errors };
  }

  const filesToScan = [...TEMPLATE_FILES_TO_SCAN];

  const headerFooterFiles = Object.keys(zip.files).filter(
    (name) =>
      name.startsWith('word/header') ||
      name.startsWith('word/footer') ||
      name === 'word/footnotes.xml' ||
      name === 'word/endnotes.xml'
  );
  filesToScan.push(...headerFooterFiles);

  for (const filePath of filesToScan) {
    const file = zip.files[filePath];
    if (!file || file.dir) continue;

    let xml: string;
    try {
      xml = file.asText();
    } catch {
      continue;
    }

    const vars = extractVariablesFromXml(xml);
    for (const v of vars) {
      if (!seen.has(v)) {
        seen.add(v);
        allVars.push(v);
      }
    }
  }

  for (const v of allVars) {
    if (!VALID_VARIABLE_NAME.test(v)) {
      errors.push(
        `变量名 "${v}" 包含不支持的字符，不能使用花括号、换行或控制字符。`
      );
    }
  }

  if (allVars.length === 0 && errors.length === 0) {
    errors.push('模板中未发现占位符变量。请使用 {{变量名}} 格式定义变量。');
  }

  return { variables: allVars, errors };
}
