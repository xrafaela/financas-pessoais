import type { FinanceData } from './finance.ts';
import type { StoredEnvelope } from './sync.ts';

export interface StorageAdapter {
  loadEnvelope(): Promise<StoredEnvelope>;
  save(data: FinanceData): Promise<StoredEnvelope>;
  saveEnvelope(envelope: StoredEnvelope): Promise<void>;
}

const DB_NAME = 'financas-pessoais';
const DB_VERSION = 1;
const STORE = 'app-state';
const KEY = 'data';

function nowISO(): string {
  return new Date().toISOString();
}

function isValidData(value: unknown): value is FinanceData {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Partial<FinanceData>;
  return (
    Array.isArray(d.transactions) &&
    Array.isArray(d.categories) &&
    Array.isArray(d.budgets)
  );
}

function parseStoredValue(value: unknown): StoredEnvelope | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (isValidData(v.data) && typeof v.savedAt === 'string') {
    return { savedAt: v.savedAt, data: v.data };
  }
  if (isValidData(value)) {
    return { savedAt: '', data: value };
  }
  return null;
}

export class IndexedDBAdapter implements StorageAdapter {
  async loadEnvelope(): Promise<StoredEnvelope> {
    const db = await this.open();
    try {
      const parsed = await this.read(db);
      if (parsed === null) {
        const fresh: StoredEnvelope = { savedAt: '', data: this.emptyData() };
        await this.writeEnvelope(db, fresh);
        return fresh;
      }
      return parsed;
    } finally {
      db.close();
    }
  }

  async save(data: FinanceData): Promise<StoredEnvelope> {
    const db = await this.open();
    try {
      const envelope: StoredEnvelope = { savedAt: nowISO(), data };
      await this.writeEnvelope(db, envelope);
      return envelope;
    } finally {
      db.close();
    }
  }

  async saveEnvelope(envelope: StoredEnvelope): Promise<void> {
    const db = await this.open();
    try {
      await this.writeEnvelope(db, envelope);
    } finally {
      db.close();
    }
  }

  private emptyData(): FinanceData {
    return { version: 1, transactions: [], categories: [], budgets: [] };
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

  private read(db: IDBDatabase): Promise<StoredEnvelope | null> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(parseStoredValue(request.result));
      request.onerror = () => reject(new Error('Falha ao ler os dados locais.'));
    });
  }

  private writeEnvelope(db: IDBDatabase, envelope: StoredEnvelope): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(envelope, KEY);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(new Error('Falha ao guardar os dados locais.'));
      tx.onerror = () => reject(new Error('Falha ao guardar os dados locais.'));
    });
  }
}

export class InMemoryAdapter implements StorageAdapter {
  private envelope: StoredEnvelope | null = null;

  async loadEnvelope(): Promise<StoredEnvelope> {
    if (this.envelope === null) {
      this.envelope = { savedAt: '', data: { version: 1, transactions: [], categories: [], budgets: [] } };
    }
    return this.envelope;
  }

  async save(data: FinanceData): Promise<StoredEnvelope> {
    this.envelope = { savedAt: nowISO(), data };
    return this.envelope;
  }

  async saveEnvelope(envelope: StoredEnvelope): Promise<void> {
    this.envelope = envelope;
  }
}
