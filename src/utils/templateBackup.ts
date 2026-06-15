import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getSavedTemplates, getSavedTemplate } from './templateStore';

const APP_NAME = 'Doclet';

export type DocletBackupManifest = {
  app: string;
  version: string;
  exportedAt: number;
  templates: Array<{
    id: string;
    name: string;
    originalFileName: string;
    variables: string[];
    size: number;
    createdAt: number;
    updatedAt: number;
    fileName: string;
  }>;
};

export type ParsedBackup = {
  manifest: DocletBackupManifest;
  fileMap: Map<string, Blob>;
};

export type ImportResult = {
  total: number;
  imported: number;
  skipped: number;
};

function formatDateForFilename(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}`;
}

export async function exportTemplateLibrary(appVersion: string): Promise<void> {
  const templates = await getSavedTemplates();

  if (templates.length === 0) {
    throw new Error('当前没有可导出的模板');
  }

  const zip = new JSZip();
  const manifestEntries: DocletBackupManifest['templates'] = [];

  for (const template of templates) {
    const full = await getSavedTemplate(template.id);
    if (!full) continue;

    const fileName = `${template.id}.docx`;
    zip.file(`templates/${fileName}`, full.templateBlob);

    manifestEntries.push({
      id: template.id,
      name: template.name,
      originalFileName: template.originalFileName,
      variables: template.variables,
      size: template.size,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      fileName,
    });
  }

  const manifest: DocletBackupManifest = {
    app: APP_NAME,
    version: appVersion,
    exportedAt: Date.now(),
    templates: manifestEntries,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `doclet-template-library-${formatDateForFilename(new Date())}.doclet`;
  saveAs(blob, filename);
}

export async function parseTemplateBackup(file: File): Promise<ParsedBackup> {
  if (!file.name.toLowerCase().endsWith('.doclet')) {
    throw new Error('备份文件格式不正确，请选择由 Doclet 导出的 .doclet 文件。');
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('备份文件已损坏，无法读取，请重新选择由 Doclet 导出的 .doclet 文件。');
  }

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('备份文件格式不正确，缺少 manifest.json，请选择由 Doclet 导出的 .doclet 文件。');
  }

  let manifest: DocletBackupManifest;
  try {
    const text = await manifestFile.async('text');
    manifest = JSON.parse(text) as DocletBackupManifest;
  } catch {
    throw new Error('备份文件格式不正确，manifest.json 解析失败。');
  }

  if (manifest.app !== APP_NAME) {
    throw new Error('备份文件格式不正确，请选择由 Doclet 导出的 .doclet 文件。');
  }

  if (!Array.isArray(manifest.templates)) {
    throw new Error('备份文件格式不正确，templates 数据异常。');
  }

  const fileMap = new Map<string, Blob>();

  for (const entry of manifest.templates) {
    const docxFile = zip.file(`templates/${entry.fileName}`);
    if (!docxFile) {
      throw new Error(`备份文件中缺少模板文件：${entry.fileName}`);
    }

    if (!entry.fileName.toLowerCase().endsWith('.docx')) {
      throw new Error(`模板文件格式异常：${entry.fileName}，不是 .docx 文件。`);
    }

    if (!Array.isArray(entry.variables)) {
      throw new Error(`模板「${entry.name}」的变量清单格式异常。`);
    }

    const blob = await docxFile.async('blob');
    fileMap.set(entry.fileName, blob);
  }

  return { manifest, fileMap };
}

export async function importTemplateBackup(
  parsed: ParsedBackup,
  saveFn: (input: {
    name: string;
    originalFileName: string;
    variables: string[];
    templateBlob: Blob;
  }) => Promise<unknown>,
): Promise<ImportResult> {
  const { manifest, fileMap } = parsed;
  let imported = 0;
  let skipped = 0;

  for (const entry of manifest.templates) {
    const blob = fileMap.get(entry.fileName);
    if (!blob) {
      skipped++;
      continue;
    }

    try {
      await saveFn({
        name: entry.name,
        originalFileName: entry.originalFileName,
        variables: entry.variables,
        templateBlob: blob,
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return {
    total: manifest.templates.length,
    imported,
    skipped,
  };
}
