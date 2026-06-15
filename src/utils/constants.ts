export const APP_VERSION = 'v0.7.0';

export const PLACEHOLDER_REGEX = /\{\{([^{}]+)\}\}/g;

export const VALID_VARIABLE_NAME = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;

export const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export const MAX_BATCH_ROWS = 500;

export const TEMPLATE_FILES_TO_SCAN = [
  'word/document.xml',
];
