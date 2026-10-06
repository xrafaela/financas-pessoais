import type { FinanceData } from './finance.ts';
import { createEmptyData } from './finance.ts';

export interface StorageAdapter {
  load(): Promise<FinanceData>;
  save(data: FinanceData): Promise<void>;
}

const DB_NAME = 'financas-pessoais';
const DB_VERSION = 1;
const STORE = 'app-state';
const KEY = 'data';

export class IndexedDBAdapter implements StorageAdapter {
  async load(): Promise<FinanceData> {
    const db = await this.open();
    try {
      const stored = await this.read(db);
      if (stored === null) {
        const fresh = createEmptyData();
        await this.write(db, fresh);
        return fresh;
      }
      return stored;
    } finally {
      db.close();
    }
  }

  async save(data: FinanceData): Promise<void> {
    const db = await this.open();
    try {
      await this.write(db, data);
    } finally {
      db.close();
    }
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Falha ao abrir a base de dados local.'));
      request.onblocked = () => reject(new Error('Base de dados bloqueada por outro separador.'));
    });
  }

  private read(db: IDBDatabase): Promise<FinanceData | null> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => {
        const value = request.result as FinanceData | undefined;
        if (value === undefined || !this.isValidData(value)) {
          resolve(null);
          return;
        }
        resolve(value);
      };
      request.onerror = () => reject(new Error('Falha ao ler os dados locais.'));
    });
  }

  private write(db: IDBDatabase, data: FinanceData): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(new Error('Falha ao guardar os dados locais.'));
      tx.onerror = () => reject(new Error('Falha ao guardar os dados locais.'));
    });
  }

  private isValidData(value: unknown): value is FinanceData {
    if (typeof value !== 'object' || value === null) return false;
    const d = value as Partial<FinanceData>;
    return (
      Array.isArray(d.transactions) &&
      Array.isArray(d.categories) &&
      Array.isArray(d.budgets)
    );
  }
}

export class InMemoryAdapter implements StorageAdapter {
  private data: FinanceData | null = null;

  async load(): Promise<FinanceData> {
    if (this.data === null) {
      this.data = createEmptyData();
    }
    return this.data;
  }

  async save(data: FinanceData): Promise<void> {
    this.data = data;
  }
}
