import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import {
  addTransaction,
  createEmptyData,
  currentMonthKey,
  defaultFormDate,
  deleteTransaction,
  updateTransaction,
} from './domain/finance.ts';
import type { FinanceData, Result, Transaction, TransactionInput } from './domain/finance.ts';
import { IndexedDBAdapter, InMemoryAdapter } from './domain/storage.ts';
import type { StorageAdapter } from './domain/storage.ts';
import { OneDriveClient, OneDriveError } from './domain/onedrive.ts';
import { decideSync } from './domain/sync.ts';
import type { StoredEnvelope } from './domain/sync.ts';

import { ChartIcon, HomeIcon, ListIcon, PlusIcon, SettingsIcon, TargetIcon } from './components/icons.tsx';
import { MonthNav } from './components/MonthNav.tsx';
import { TransactionForm } from './components/TransactionForm.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { SummaryPage } from './pages/SummaryPage.tsx';
import { TransactionsPage } from './pages/TransactionsPage.tsx';
import { BudgetsPage } from './pages/BudgetsPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';

type Tab = 'inicio' | 'movimentos' | 'orcamentos' | 'relatorios';

const TABS: { id: Tab; label: string; icon: (size: number) => ReactElement }[] = [
  { id: 'inicio', label: 'Início', icon: (s) => <HomeIcon size={s} /> },
  { id: 'movimentos', label: 'Movimentos', icon: (s) => <ListIcon size={s} /> },
  { id: 'orcamentos', label: 'Orçamentos', icon: (s) => <TargetIcon size={s} /> },
  { id: 'relatorios', label: 'Relatórios', icon: (s) => <ChartIcon size={s} /> },
];

const LS_LAST_SYNC = 'fp.sync.last';

function createAdapter(): StorageAdapter {
  if (typeof indexedDB === 'undefined') {
    return new InMemoryAdapter();
  }
  return new IndexedDBAdapter();
}

function readLastSync(): string {
  return localStorage.getItem(LS_LAST_SYNC) ?? '';
}

export function App(): ReactElement {
  const [data, setData] = useState<FinanceData | null>(null);
  const [tab, setTab] = useState<Tab>('inicio');
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSync, setLastSyncState] = useState<string>(readLastSync());
  const [authVersion, setAuthVersion] = useState<number>(0);
  const [onedrive] = useState<OneDriveClient>(() => new OneDriveClient());
  const storageRef = useRef<StorageAdapter>(createAdapter());
  const savedAtRef = useRef<string>('');
  const syncingRef = useRef<boolean>(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string): void => {
    setToast(message);
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const markSynced = useCallback((): void => {
    const now = new Date().toISOString();
    localStorage.setItem(LS_LAST_SYNC, now);
    setLastSyncState(now);
  }, []);

  const syncEnvelope = useCallback(
    async (local: StoredEnvelope, silent: boolean): Promise<void> => {
      if (syncingRef.current || !onedrive.isAuthenticated()) return;
      syncingRef.current = true;
      setSyncing(true);
      try {
        const cloud = await onedrive.pull();
        const decision = decideSync(local, cloud);
        if (decision.action === 'pull' && cloud !== null) {
          await storageRef.current.saveEnvelope(cloud);
          savedAtRef.current = cloud.savedAt;
          setData(cloud.data);
          markSynced();
          showToast(silent ? 'Dados atualizados a partir do OneDrive.' : 'Dados atualizados a partir do OneDrive.');
        } else if (decision.action === 'push') {
          await onedrive.push(local);
          markSynced();
          showToast('Dados guardados no OneDrive.');
        } else {
          markSynced();
          showToast('Tudo sincronizado.');
        }
        await onedrive.fetchAccountName();
        setAuthVersion((v) => v + 1);
      } catch (e) {
        const message = e instanceof OneDriveError ? e.message : 'Falha na sincronização com o OneDrive.';
        showToast(message);
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [showToast, markSynced, onedrive],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const exchanged = await onedrive.handleRedirect();
        if (exchanged && !cancelled) {
          await onedrive.fetchAccountName();
          setAuthVersion((v) => v + 1);
          showToast('Sessão OneDrive iniciada.');
        }
      } catch (e) {
        if (!cancelled) {
          showToast(e instanceof OneDriveError ? e.message : 'Falha na autenticação OneDrive.');
        }
      }
      try {
        const envelope = await storageRef.current.loadEnvelope();
        if (cancelled) return;
        savedAtRef.current = envelope.savedAt;
        setData(envelope.data);
        if (onedrive.isAuthenticated()) {
          void syncEnvelope(envelope, true);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setData(createEmptyData());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast, syncEnvelope, onedrive]);

  const applyMutation = useCallback(
    (result: Result<FinanceData>, successMessage: string | null): void => {
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      setData(result.value);
      void storageRef.current
        .save(result.value)
        .then((envelope) => {
          savedAtRef.current = envelope.savedAt;
        })
        .catch((err: unknown) => {
          console.error(err);
          showToast('Aviso: dados guardados apenas nesta sessão.');
        });
      if (successMessage !== null) showToast(successMessage);
    },
    [showToast],
  );

  const handleSaveTransaction = useCallback(
    (input: TransactionInput): Result<FinanceData> => {
      if (data === null) return { ok: false, error: 'Dados ainda não carregados.' };
      if (editing !== null) {
        const result = updateTransaction(data, editing.id, input);
        if (result.ok) applyMutation(result, 'Movimento atualizado.');
        return result;
      }
      const result = addTransaction(data, input);
      if (result.ok) applyMutation(result, 'Movimento guardado.');
      return result;
    },
    [data, editing, applyMutation],
  );

  const handleDeleteTransaction = useCallback(
    (id: string): void => {
      if (data === null) return;
      applyMutation(deleteTransaction(data, id), 'Movimento eliminado.');
    },
    [data, applyMutation],
  );

  const handleEditTransaction = useCallback((t: Transaction): void => {
    setEditing(t);
    setFormOpen(true);
  }, []);

  const handleNewTransaction = useCallback((): void => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleSyncNow = useCallback((): void => {
    if (data === null) return;
    void syncEnvelope({ savedAt: savedAtRef.current, data }, false);
  }, [data, syncEnvelope]);

  if (data === null) {
    return <div className="loading">A carregar…</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-row">
          <p className="header-title">Gestão de Finanças Pessoais</p>
          <button
            type="button"
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Definições"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
        <MonthNav month={month} onChange={setMonth} />
      </header>

      <main className="content">
        {tab === 'inicio' && (
          <SummaryPage data={data} month={month} onEditTransaction={handleEditTransaction} />
        )}
        {tab === 'movimentos' && (
          <TransactionsPage data={data} month={month} onEditTransaction={handleEditTransaction} />
        )}
        {tab === 'orcamentos' && (
          <BudgetsPage data={data} month={month} onMutate={(r) => applyMutation(r, 'Alterações guardadas.')} />
        )}
        {tab === 'relatorios' && <ReportsPage data={data} month={month} />}
      </main>

      <button type="button" className="fab" onClick={handleNewTransaction} aria-label="Adicionar movimento">
        <PlusIcon size={26} />
      </button>

      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.icon(22)}
            {t.label}
          </button>
        ))}
      </nav>

      {formOpen && (
        <TransactionForm
          data={data}
          editing={editing}
          defaultDate={defaultFormDate(month)}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          key={authVersion}
          client={onedrive}
          lastSync={lastSync}
          syncing={syncing}
          onSync={handleSyncNow}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {toast !== null && <div className="toast">{toast}</div>}
    </div>
  );
}
