import { useState } from 'react';
import type { ReactElement } from 'react';

import { addCategory, budgetForCategory, deleteCategory, formatCurrency, setBudget, sumAmounts, transactionsInMonth } from '../domain/finance.ts';
import type { FinanceData, Result, TransactionType } from '../domain/finance.ts';

const PALETTE = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#3b82f6', '#ec4899', '#22c55e', '#6b7280'];

export function BudgetsPage(props: {
  data: FinanceData;
  month: string;
  onMutate: (result: Result<FinanceData>) => void;
}): ReactElement {
  const { data, month, onMutate } = props;
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(PALETTE[0]);
  const [newType, setNewType] = useState<TransactionType>('expense');
  const [error, setError] = useState<string | null>(null);

  const monthTx = transactionsInMonth(data.transactions, month);

  function handleSetBudget(categoryId: string, text: string): void {
    if (text.trim() === '') {
      return;
    }
    const normalized = text.replace(',', '.');
    if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
      setError('Valor de orçamento inválido.');
      return;
    }
    const cents = Math.round(Number(normalized) * 100);
    onMutate(setBudget(data, categoryId, cents));
  }

  function handleAddCategory(): void {
    const result = addCategory(data, { name: newName, color: newColor, type: newType });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setNewName('');
    onMutate(result);
  }

  const expenseCategories = data.categories.filter((c) => c.type === 'expense');

  return (
    <>
      <div className="card">
        <h3 className="card-title">Orçamentos mensais</h3>
        {expenseCategories.length === 0 && <p className="empty-state">Sem categorias de despesa.</p>}
        {expenseCategories.map((c) => {
          const budget = budgetForCategory(data, c.id);
          const spent = sumAmounts(monthTx.filter((t) => t.categoryId === c.id), 'expense');
          return (
            <div className="budget-edit-row" key={c.id}>
              <span className="color-dot" style={{ background: c.color }} />
              <span className="spent-info">
                {c.name} · gasto: {formatCurrency(spent)}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="limite €"
                defaultValue={budget ? (budget.monthlyLimitCents / 100).toFixed(2).replace('.', ',') : ''}
                onBlur={(e) => handleSetBudget(c.id, e.target.value)}
              />
            </div>
          );
        })}
        <p className="empty-state" style={{ padding: '8px 0 0' }}>
          Deixa vazio para sem orçamento. Os alertas aparecem a 80% e a 100%.
        </p>
      </div>

      <div className="card">
        <h3 className="card-title">Categorias</h3>
        {data.categories.map((c) => {
          const usedByTx = data.transactions.some((t) => t.categoryId === c.id);
          return (
            <div className="budget-edit-row" key={c.id}>
              <span className="color-dot" style={{ background: c.color }} />
              <span className="spent-info">
                {c.name} {c.type === 'income' ? '(receita)' : ''}
              </span>
              <button
                type="button"
                className="remove-cat-btn"
                disabled={usedByTx}
                title={usedByTx ? 'Tem movimentos associados' : 'Eliminar categoria'}
                onClick={() => {
                  if (window.confirm(`Eliminar a categoria "${c.name}"?`)) {
                    onMutate(deleteCategory(data, c.id));
                  }
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
        {error !== null && <div className="form-error">{error}</div>}
        <div className="new-cat-row">
          <input
            type="text"
            placeholder="Nova categoria"
            value={newName}
            maxLength={40}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="color"
            value={newColor}
            list="palette"
            onChange={(e) => setNewColor(e.target.value)}
          />
          <datalist id="palette">
            {PALETTE.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <button type="button" onClick={handleAddCategory}>
            {newType === 'expense' ? 'Despesa' : 'Receita'}
          </button>
        </div>
        <div className="segmented" style={{ marginTop: 10, marginBottom: 0 }}>
          <button type="button" className={`expense ${newType === 'expense' ? 'active' : ''}`} onClick={() => setNewType('expense')}>
            Nova de despesa
          </button>
          <button type="button" className={`income ${newType === 'income' ? 'active' : ''}`} onClick={() => setNewType('income')}>
            Nova de receita
          </button>
        </div>
      </div>
    </>
  );
}
