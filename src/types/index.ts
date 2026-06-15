export interface TemplateData {
  id: string;
  name: string;
  fileName: string;
  variables: string[];
  rawArrayBuffer: ArrayBuffer;
  createdAt: number;
}

export interface VariableValuePair {
  name: string;
  value: string;
}

export interface BatchRow {
  [variable: string]: string;
}

export type TemplateCheckLevel = 'error' | 'warning' | 'info';

export interface TemplateCheckItem {
  level: TemplateCheckLevel;
  code: string;
  title: string;
  message: string;
  suggestion?: string;
}

export interface TemplateDiagnostics {
  checks: TemplateCheckItem[];
  hasError: boolean;
  hasWarning: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}
