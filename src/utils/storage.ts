import type { BatchRow } from '../types';

const PREFIX = 'docxgen:';

const KEYS = {
  lastTemplate: `${PREFIX}lastTemplate`,
  manualDraft: `${PREFIX}manualDraft`,
} as const;

export interface LastTemplateData {
  templateName: string;
  variables: string[];
  updatedAt: number;
  lastMode: 'single' | 'manual' | 'excel';
}

export interface ManualDraftData {
  variables: string[];
  rows: BatchRow[];
  updatedAt: number;
}

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

export function getLastTemplate(): LastTemplateData | null {
  return safeGet<LastTemplateData>(KEYS.lastTemplate);
}

export function saveLastTemplate(data: LastTemplateData): void {
  safeSet(KEYS.lastTemplate, data);
}

export function getManualDraft(): ManualDraftData | null {
  return safeGet<ManualDraftData>(KEYS.manualDraft);
}

export function saveManualDraft(variables: string[], rows: BatchRow[]): void {
  const hasData = rows.some((row) =>
    variables.some((v) => row[v] && row[v].trim() !== '')
  );
  if (!hasData) return;
  safeSet(KEYS.manualDraft, {
    variables,
    rows,
    updatedAt: Date.now(),
  });
}

export function clearAllStorage(): void {
  try {
    localStorage.removeItem(KEYS.lastTemplate);
    localStorage.removeItem(KEYS.manualDraft);
  } catch {
    // ignore
  }
}

export function variablesMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
