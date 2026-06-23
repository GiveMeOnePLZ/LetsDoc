export const APP_VERSION = 'v0.10.0';

export const PLACEHOLDER_REGEX = /\{\{([^{}]+)\}\}/g;

// Variable names may contain visible punctuation, but cannot contain delimiter braces or control characters.
export const VALID_VARIABLE_NAME = /^[^{}\p{C}]+$/u;

export const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export const MAX_BATCH_ROWS = 500;

export const TEMPLATE_FILES_TO_SCAN = [
  'word/document.xml',
];
