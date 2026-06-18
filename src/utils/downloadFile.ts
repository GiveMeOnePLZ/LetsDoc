import { saveAs } from 'file-saver';

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
};

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in (window as TauriWindow);
}

function getExtension(fileName: string): string | null {
  const cleanName = fileName.split(/[\\/]/).pop() || fileName;
  const dotIndex = cleanName.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === cleanName.length - 1) return null;
  return cleanName.slice(dotIndex + 1).toLowerCase();
}

export async function saveBlob(blob: Blob, fileName: string): Promise<boolean> {
  if (!isTauriRuntime()) {
    saveAs(blob, fileName);
    return true;
  }

  try {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ]);

    const extension = getExtension(fileName);
    const selectedPath = await save({
      defaultPath: fileName,
      filters: extension
        ? [{ name: `${extension.toUpperCase()} 文件`, extensions: [extension] }]
        : undefined,
    });

    if (!selectedPath) return false;

    const buffer = await blob.arrayBuffer();
    await writeFile(selectedPath, new Uint8Array(buffer));
    return true;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`保存文件失败：${detail}`);
  }
}
