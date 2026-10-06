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

import { ChartIcon, HomeIcon, ListIcon, PlusIcon, TargetIcon } from './components/icons.tsx';
import { MonthNav } from './components/MonthNav.tsx';
import { TransactionForm } from './components/TransactionForm.tsx';
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

function createAdapter(): StorageAdapter {
  if (typeof indexedDB === 'undefined') {
    return new InMemoryAdapter();
  }
  return new IndexedDBAdapter();
}

export function App(): ReactElement {
  const [data, setData] = useState<FinanceData | null>(null);
  const [tab, setTab] = useState<Tab>('inicio');
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const storageRef = useRef<StorageAdapter>(createAdapter());
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    storageRef.current
      .load()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) setData(createEmptyData());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((message: string): void => {
    setToast(message);
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  const applyMutation = useCallback(
    (result: Result<FinanceData>, successMessage: string | null): void => {
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      setData(result.value);
      void storageRef.current.save(result.value).catch((err: unknown) => {
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

  if (data === null) {
    return <div className="loading">A carregar…</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <p className="header-title">Gestão de Finanças Pessoais</p>
        <MonthNav month={month} onChange={setMonth} />
      </header>

      <main className="content">
        {tab === 'inicio' && (
          <SummaryPage data={data} month={month} onEditTransaction={handleEditTransaction} />
        )}
        {tab === 'movimentos' && (
          <TransactionsPage data={data} month={month} onEditTransaction={handleEditTransaction} />
        )}
        {tab === 'orcamentos' && <BudgetsPage data={data} month={month} onMutate={(r) => applyMutation(r, 'Alterações guardadas.')} />}
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

      {toast !== null && <div className="toast">{toast}</div>}
    </div>
  );
}
