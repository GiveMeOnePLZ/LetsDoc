const DB_NAME = 'docxgen-db';
const DB_VERSION = 1;
const STORE_NAME = 'templates';

export type SavedTemplate = {
  id: string;
  name: string;
  originalFileName: string;
  variables: string[];
  templateBlob: Blob;
  size: number;
  createdAt: number;
  updatedAt: number;
};

export type SavedTemplateSummary = Omit<SavedTemplate, 'templateBlob'>;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      reject(new Error('您的浏览器不支持 IndexedDB，无法使用本地模板库功能'));
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      reject(new Error('无法打开本地模板库数据库，可能是浏览器存储空间不足或隐私设置限制'));
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };
  });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export async function saveTemplateToLibrary(input: {
  name: string;
  originalFileName: string;
  variables: string[];
  templateBlob: Blob;
}): Promise<SavedTemplate> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  // Check if template with same name already exists
  const nameIndex = store.index('name');
  const existingTemplate = await new Promise<SavedTemplate | undefined>((resolve) => {
    const request = nameIndex.get(input.name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
  
  const now = Date.now();
  let template: SavedTemplate;
  
  if (existingTemplate) {
    // Update existing template
    template = {
      ...existingTemplate,
      originalFileName: input.originalFileName,
      variables: input.variables,
      templateBlob: input.templateBlob,
      size: input.templateBlob.size,
      updatedAt: now,
    };
  } else {
    // Create new template
    template = {
      id: generateId(),
      name: input.name,
      originalFileName: input.originalFileName,
      variables: input.variables,
      templateBlob: input.templateBlob,
      size: input.templateBlob.size,
      createdAt: now,
      updatedAt: now,
    };
  }
  
  return new Promise((resolve, reject) => {
    const request = store.put(template);
    request.onsuccess = () => resolve(template);
    request.onerror = () => reject(new Error('保存模板失败，可能是浏览器存储空间不足'));
    transaction.oncomplete = () => db.close();
  });
}

export async function getSavedTemplates(): Promise<SavedTemplateSummary[]> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const templates = request.result as SavedTemplate[];
      
      // Validate and filter templates
      const validTemplates = templates.filter(template => {
        // Basic validation: must have required fields
        if (!template || typeof template !== 'object') return false;
        if (!template.id || !template.name || !template.originalFileName) return false;
        if (!Array.isArray(template.variables)) return false;
        if (!(template.templateBlob instanceof Blob)) return false;
        if (typeof template.size !== 'number' || typeof template.createdAt !== 'number' || typeof template.updatedAt !== 'number') return false;
        return true;
      });
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const summaries = validTemplates.map(({ templateBlob, ...summary }) => summary);
      resolve(summaries);
    };
    request.onerror = () => reject(new Error('读取本地模板库失败，请尝试刷新页面'));
    transaction.oncomplete = () => db.close();
  });
}

export async function getSavedTemplate(id: string): Promise<SavedTemplate | null> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('读取模板失败'));
    transaction.oncomplete = () => db.close();
  });
}

export async function deleteSavedTemplate(id: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('删除模板失败'));
    transaction.oncomplete = () => db.close();
  });
}

export async function renameSavedTemplate(id: string, name: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const template = getRequest.result as SavedTemplate;
      if (!template) {
        reject(new Error('模板不存在'));
        return;
      }
      
      template.name = name;
      template.updatedAt = Date.now();
      
      const putRequest = store.put(template);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error('重命名失败'));
    };
    getRequest.onerror = () => reject(new Error('读取模板失败'));
    transaction.oncomplete = () => db.close();
  });
}

export async function clearTemplateLibrary(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('清空模板库失败'));
    transaction.oncomplete = () => db.close();
  });
}

export async function isIndexedDBAvailable(): Promise<boolean> {
  try {
    const db = await openDB();
    db.close();
    return true;
  } catch {
    return false;
  }
}