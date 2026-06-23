import PizZip from 'pizzip';
import {
  PLACEHOLDER_REGEX,
  VALID_VARIABLE_NAME,
  TEMPLATE_FILES_TO_SCAN,
} from './constants';
import type { TemplateCheckItem, TemplateDiagnostics } from '../types';

function stripXmlTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, '');
}

function extractPlaceholdersFromText(text: string): Array<{ full: string; name: string }> {
  const results: Array<{ full: string; name: string }> = [];
  const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({ full: match[0], name: match[1].trim() });
  }
  return results;
}

function extractRawPlaceholdersFromXml(xml: string): Array<{ full: string; name: string }> {
  const text = stripXmlTags(xml);
  return extractPlaceholdersFromText(text);
}

function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count++;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}

function findUnclosedPlaceholders(xml: string): Array<{ type: 'open' | 'close'; position: number }> {
  const results: Array<{ type: 'open' | 'close'; position: number }> = [];
  const text = stripXmlTags(xml);

  let inPlaceholder = false;
  let i = 0;
  while (i < text.length) {
    if (text[i] === '{' && i + 1 < text.length && text[i + 1] === '{') {
      if (inPlaceholder) {
        results.push({ type: 'open', position: i });
      }
      inPlaceholder = true;
      i += 2;
    } else if (text[i] === '}' && i + 1 < text.length && text[i + 1] === '}') {
      if (!inPlaceholder) {
        results.push({ type: 'close', position: i });
      }
      inPlaceholder = false;
      i += 2;
    } else {
      i++;
    }
  }

  if (inPlaceholder) {
    results.push({ type: 'open', position: text.length });
  }

  return results;
}

function findSuspectedSplitPlaceholders(xml: string, recognizedVars: string[]): string[] {
  const suspected: string[] = [];
  const text = stripXmlTags(xml);
  const recognizedSet = new Set(recognizedVars);

  for (const varName of recognizedVars) {
    const placeholder = `{{${varName}}}`;
    const textCount = countOccurrences(text, placeholder);
    const rawXmlCount = countOccurrences(xml, placeholder);
    if (textCount === 0 || rawXmlCount >= textCount) {
      continue;
    }

    suspected.push(varName);
  }

  const looseRegex = /\{\{[^}]*\}\}/g;
  let looseMatch: RegExpExecArray | null;
  while ((looseMatch = looseRegex.exec(text)) !== null) {
    const content = looseMatch[0].replace(/^\{\{|\}\}$/g, '').trim();
    if (content && !recognizedSet.has(content)) {
      if (VALID_VARIABLE_NAME.test(content) && content.length > 0) {
        suspected.push(content);
      }
    }
  }

  return [...new Set(suspected)];
}

function findSimilarVariableNames(variables: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const normalized = new Map<string, string[]>();

  for (const v of variables) {
    const noUnderscore = v.replace(/_/g, '');
    const noSpace = v.replace(/\s/g, '');
    const noUnderscoreOrSpace = v.replace(/[_\s]/g, '');

    for (const key of [noUnderscore, noSpace, noUnderscoreOrSpace]) {
      if (!normalized.has(key)) {
        normalized.set(key, []);
      }
      normalized.get(key)!.push(v);
    }
  }

  const checked = new Set<string>();
  for (const group of normalized.values()) {
    if (group.length > 1) {
      const unique = [...new Set(group)];
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          const pair = [unique[i], unique[j]].sort().join('|||');
          if (!checked.has(pair)) {
            checked.add(pair);
            pairs.push([unique[i], unique[j]]);
          }
        }
      }
    }
  }

  return pairs;
}

export function runDiagnostics(
  arrayBuffer: ArrayBuffer,
  variables: string[]
): TemplateDiagnostics {
  const checks: TemplateCheckItem[] = [];

  let zip: PizZip;
  try {
    zip = new PizZip(arrayBuffer);
  } catch {
    checks.push({
      level: 'error',
      code: 'PARSE_FAILED',
      title: '模板解析失败',
      message: '无法解析 .docx 文件，请确认文件未损坏。',
      suggestion: '请尝试重新保存为 .docx 格式后上传。',
    });
    return buildResult(checks);
  }

  const allRawPlaceholders: Array<{ full: string; name: string }> = [];
  const headerFooterFiles: string[] = [];
  let hasHeaderFooterVars = false;

  const filesToScan = [...TEMPLATE_FILES_TO_SCAN];

  const discoveredFiles = Object.keys(zip.files).filter(
    (name) =>
      name.startsWith('word/header') ||
      name.startsWith('word/footer') ||
      name === 'word/footnotes.xml' ||
      name === 'word/endnotes.xml'
  );
  filesToScan.push(...discoveredFiles);
  headerFooterFiles.push(...discoveredFiles);

  let allXml = '';
  for (const filePath of filesToScan) {
    const file = zip.files[filePath];
    if (!file || file.dir) continue;

    let xml: string;
    try {
      xml = file.asText();
    } catch {
      continue;
    }

    allXml += xml + '\n';

    const placeholders = extractRawPlaceholdersFromXml(xml);
    allRawPlaceholders.push(...placeholders);

    if (
      (filePath.startsWith('word/header') || filePath.startsWith('word/footer')) &&
      placeholders.length > 0
    ) {
      hasHeaderFooterVars = true;
    }
  }

  if (variables.length === 0) {
    checks.push({
      level: 'error',
      code: 'NO_VARIABLES',
      title: '模板中未识别到变量',
      message: '模板中未识别到变量，无法生成可替换内容。',
      suggestion: '请在 Word 模板中使用 {{变量名}} 格式添加变量，例如 {{姓名}}、{{日期}}。',
    });
  }

  for (const v of variables) {
    if (!VALID_VARIABLE_NAME.test(v)) {
      checks.push({
        level: 'error',
        code: 'INVALID_VARIABLE_NAME',
        title: '存在不合法变量名',
        message: `变量名「${v}」包含不支持的字符，不能使用花括号、换行或控制字符。`,
        suggestion: '请移除花括号、换行或控制字符后重试。',
      });
    }
  }

  const unclosed = findUnclosedPlaceholders(allXml);
  const openCount = unclosed.filter((u) => u.type === 'open').length;
  const closeCount = unclosed.filter((u) => u.type === 'close').length;

  if (openCount > 0 || closeCount > 0) {
    checks.push({
      level: 'error',
      code: 'UNCLOSED_PLACEHOLDER',
      title: '检测到疑似未闭合的占位符',
      message: `检测到 ${openCount} 个未闭合的「{{」和 ${closeCount} 个孤立的「}}」。`,
      suggestion: '请检查模板中是否存在只输入了一半的变量，例如 {{姓名。请确保每个变量都完整输入 {{变量名}}。',
    });
  }

  const suspectedSplits = findSuspectedSplitPlaceholders(allXml, variables);
  if (suspectedSplits.length > 0) {
    checks.push({
      level: 'warning',
      code: 'SUSPECTED_SPLIT',
      title: '检测到疑似被 Word 拆分的变量',
      message: `以下变量可能被 Word 拆分为多个文本节点，占位符可能无法正常替换：${suspectedSplits.join('、')}。`,
      suggestion: '请删除该占位符后，在 Word 中一次性重新输入完整变量，例如 {{姓名}}。',
    });
  }

  const varCounts = new Map<string, number>();
  for (const placeholder of allRawPlaceholders) {
    varCounts.set(placeholder.name, (varCounts.get(placeholder.name) || 0) + 1);
  }

  for (const [v, count] of varCounts) {
    if (count > 1) {
      checks.push({
        level: 'info',
        code: 'DUPLICATE_VARIABLE',
        title: '变量重复出现',
        message: `变量「${v}」在模板中出现 ${count} 次。`,
        suggestion: '这是允许的。生成时所有同名变量会替换为同一个值。',
      });
    }
  }

  if (variables.length > 20) {
    checks.push({
      level: 'info',
      code: 'MANY_VARIABLES',
      title: '变量数量较多',
      message: `当前模板有 ${variables.length} 个变量，填写时可能需要较长时间。`,
      suggestion: '建议使用搜索功能快速定位变量，或使用常用值、Excel 导入提高效率。',
    });
  }

  const similarPairs = findSimilarVariableNames(variables);
  for (const [a, b] of similarPairs) {
    checks.push({
      level: 'warning',
      code: 'SIMILAR_VARIABLES',
      title: '检测到相似变量名',
      message: `变量「${a}」和「${b}」名称高度相似，可能是误写。`,
      suggestion: '请确认这些变量是否应合并为同一个变量。',
    });
  }

  if (hasHeaderFooterVars) {
    checks.push({
      level: 'info',
      code: 'HEADER_FOOTER_VARIABLES',
      title: '检测到页眉/页脚变量',
      message: '模板的页眉或页脚中包含变量。',
      suggestion: '系统会尝试替换页眉页脚中的变量，请生成后检查 Word/WPS 中的实际效果。',
    });
  }

  if (checks.length === 0) {
    checks.push({
      level: 'info',
      code: 'ALL_CLEAR',
      title: '体检通过',
      message: '模板未发现明显问题，可以正常使用。',
    });
  }

  return buildResult(checks);
}

function buildResult(checks: TemplateCheckItem[]): TemplateDiagnostics {
  const errorCount = checks.filter((c) => c.level === 'error').length;
  const warningCount = checks.filter((c) => c.level === 'warning').length;
  const infoCount = checks.filter((c) => c.level === 'info').length;

  return {
    checks,
    hasError: errorCount > 0,
    hasWarning: warningCount > 0,
    errorCount,
    warningCount,
    infoCount,
  };
}
