import { useState } from 'react';
import type { ReactElement } from 'react';

import { formatCurrency, parseAmountToCents } from '../domain/finance.ts';
import type { FinanceData, Transaction, TransactionInput, TransactionType } from '../domain/finance.ts';
import type { Result } from '../domain/finance.ts';

import { Modal } from './Modal.tsx';
import { TrashIcon } from './icons.tsx';

export function TransactionForm(props: {
  data: FinanceData;
  editing: Transaction | null;
  defaultDate: string;
  onSave: (input: TransactionInput) => Result<FinanceData>;
  onDelete: (id: string) => void;
  onClose: () => void;
}): ReactElement {
  const { data, editing, onClose, onSave, onDelete } = props;
  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense');
  const [amountText, setAmountText] = useState<string>(
    editing ? (editing.amountCents / 100).toFixed(2).replace('.', ',') : '',
  );
  const [categoryId, setCategoryId] = useState<string>(editing?.categoryId ?? '');
  const [date, setDate] = useState<string>(editing?.date ?? props.defaultDate);
  const [description, setDescription] = useState<string>(editing?.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const visibleCategories = data.categories.filter((c) => c.type === type);
  const effectiveCategoryId = visibleCategories.some((c) => c.id === categoryId) ? categoryId : '';

  function switchType(next: TransactionType): void {
    setType(next);
    setError(null);
  }

  function handleSave(): void {
    const cents = parseAmountToCents(amountText);
    if (cents === null) {
      setError('Introduz um valor válido (ex.: 12,50).');
      return;
    }
    if (effectiveCategoryId === '') {
      setError('Escolhe uma categoria.');
      return;
    }
    const input: TransactionInput = {
      type,
      amountCents: cents,
      categoryId: effectiveCategoryId,
      description,
      date,
    };
    const result = onSave(input);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  }

  function handleDelete(): void {
    if (editing === null) return;
    if (window.confirm(`Eliminar o movimento de ${formatCurrency(editing.amountCents)}?`)) {
      onDelete(editing.id);
      onClose();
    }
  }

  return (
    <Modal title={editing === null ? 'Novo movimento' : 'Editar movimento'} onClose={onClose}>
      <div className="segmented">
        <button
          type="button"
          className={`expense ${type === 'expense' ? 'active' : ''}`}
          onClick={() => switchType('expense')}
        >
          Despesa
        </button>
        <button
          type="button"
          className={`income ${type === 'income' ? 'active' : ''}`}
          onClick={() => switchType('income')}
        >
          Receita
        </button>
      </div>

      {error !== null && <div className="form-error">{error}</div>}

      <div className="field">
        <label htmlFor="tx-amount">Valor</label>
        <div className="amount-wrap">
          <input
            id="tx-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            autoComplete="off"
          />
          <span className="suffix">€</span>
        </div>
      </div>

      <div className="field">
        <label>Categoria</label>
        <div className="chips">
          {visibleCategories.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`chip ${effectiveCategoryId === c.id ? 'selected' : ''}`}
              onClick={() => setCategoryId(c.id)}
            >
              <span className="dot" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="tx-date">Data</label>
        <input id="tx-date" type="date" value={date} max="9999-12-31" onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="tx-desc">Descrição (opcional)</label>
        <input
          id="tx-desc"
          type="text"
          value={description}
          maxLength={200}
          placeholder={type === 'expense' ? 'Ex.: mercearia' : 'Ex.: salário de março'}
          onChange={(e) => setDescription(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="btn-row">
        {editing !== null && (
          <button type="button" className="btn danger-outline" onClick={handleDelete}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <TrashIcon size={18} /> Eliminar movimento
            </span>
          </button>
        )}
        <button type="button" className="btn primary" onClick={handleSave}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}
