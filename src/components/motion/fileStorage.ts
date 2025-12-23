// IndexedDB storage for motion sequence files
const DB_NAME = 'motionSequencesDB';
const STORE_NAME = 'files';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('exportedAt', 'exportedAt', { unique: false });
      }
    };
  });
};

// Get all files
export const getAllFiles = async (): Promise<ExportedFile[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('exportedAt');
    const request = index.getAll();

    request.onsuccess = () => {
      const files = request.result as ExportedFile[];
      // Sort by exportedAt descending (most recent first)
      files.sort((a, b) => b.exportedAt - a.exportedAt);
      resolve(files);
    };

    request.onerror = () => {
      reject(new Error('Failed to get files'));
    };
  });
};

// Save a file
export const saveFile = async (file: ExportedFile): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save file'));
    };
  });
};

// Get a file by ID
export const getFile = async (id: string): Promise<ExportedFile | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get file'));
    };
  });
};

// Delete a file
export const deleteFile = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete file'));
    };
  });
};

// Import from localStorage (migration helper)
export const migrateFromLocalStorage = async (): Promise<void> => {
  const existing = localStorage.getItem('motionExportedFiles');
  if (!existing) return;

  try {
    const files: ExportedFile[] = JSON.parse(existing);
    for (const file of files) {
      await saveFile(file);
    }
    // Clear localStorage after migration
    localStorage.removeItem('motionExportedFiles');
  } catch (error) {
    console.error('Failed to migrate from localStorage:', error);
  }
};

export interface ExportedFile {
  id: string;
  name: string;
  blocks: any[];
  exportedAt: number;
  fileContent: string;
}

