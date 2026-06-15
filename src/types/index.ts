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
