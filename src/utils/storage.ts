import type { BatchRow } from '../types';

const PREFIX = 'docxgen:';

const KEYS = {
  lastTemplate: `${PREFIX}lastTemplate`,
  manualDraft: `${PREFIX}manualDraft`,
  fieldPresets: `${PREFIX}fieldPresets`,
} as const;

export const MAX_PRESETS_PER_FIELD = 10;

export interface FieldPresetsStorage {
  version: 1;
  updatedAt: number;
  presets: Record<string, string[]>;
}

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

function isValidLastTemplate(data: unknown): data is LastTemplateData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.templateName === 'string' &&
    Array.isArray(d.variables) &&
    d.variables.every((v: unknown) => typeof v === 'string') &&
    typeof d.updatedAt === 'number' &&
    (d.lastMode === 'single' || d.lastMode === 'manual' || d.lastMode === 'excel')
  );
}

function isValidManualDraft(data: unknown): data is ManualDraftData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.variables) &&
    d.variables.every((v: unknown) => typeof v === 'string') &&
    Array.isArray(d.rows) &&
    typeof d.updatedAt === 'number'
  );
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

export function getLastTemplate(): LastTemplateData | null {
  const data = safeGet<unknown>(KEYS.lastTemplate);
  if (data && isValidLastTemplate(data)) return data;
  if (data) localStorage.removeItem(KEYS.lastTemplate);
  return null;
}

export function saveLastTemplate(data: LastTemplateData): void {
  safeSet(KEYS.lastTemplate, data);
}

export function getManualDraft(): ManualDraftData | null {
  const data = safeGet<unknown>(KEYS.manualDraft);
  if (data && isValidManualDraft(data)) return data;
  if (data) localStorage.removeItem(KEYS.manualDraft);
  return null;
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
    localStorage.removeItem(KEYS.fieldPresets);
  } catch {
    // ignore
  }
}

export function variablesMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function isValidFieldPresets(data: unknown): data is FieldPresetsStorage {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.version === 1 &&
    typeof d.updatedAt === 'number' &&
    typeof d.presets === 'object' &&
    d.presets !== null
  );
}

function loadFieldPresets(): FieldPresetsStorage {
  const data = safeGet<unknown>(KEYS.fieldPresets);
  if (data && isValidFieldPresets(data)) return data;
  return { version: 1, updatedAt: Date.now(), presets: {} };
}

function saveFieldPresetsStorage(storage: FieldPresetsStorage): void {
  safeSet(KEYS.fieldPresets, storage);
}

export function getFieldPresets(fieldName: string): string[] {
  const storage = loadFieldPresets();
  return storage.presets[fieldName] || [];
}

export function addFieldPreset(fieldName: string, value: string): void {
  const trimmed = value.trim();
  if (!trimmed) return;

  const storage = loadFieldPresets();
  const existing = storage.presets[fieldName] || [];
  const filtered = existing.filter((v) => v !== trimmed);
  filtered.unshift(trimmed);
  if (filtered.length > MAX_PRESETS_PER_FIELD) {
    filtered.length = MAX_PRESETS_PER_FIELD;
  }
  storage.presets[fieldName] = filtered;
  storage.updatedAt = Date.now();
  saveFieldPresetsStorage(storage);
}

export function removeFieldPreset(fieldName: string, value: string): void {
  const storage = loadFieldPresets();
  const existing = storage.presets[fieldName] || [];
  storage.presets[fieldName] = existing.filter((v) => v !== value);
  storage.updatedAt = Date.now();
  saveFieldPresetsStorage(storage);
}

export function isDateVariable(varName: string): boolean {
  const lower = varName.toLowerCase();
  return lower.includes('日期') || lower.includes('时间') || lower.includes('date') || lower.includes('day');
}

export function getTodayFormatted(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}年${m}月${d}日`;
}
