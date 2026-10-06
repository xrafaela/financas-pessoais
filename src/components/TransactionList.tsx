import type { ReactElement } from 'react';

import { formatMonthDayLong, formatCurrency, findCategory, groupByDay } from '../domain/finance.ts';
import type { Transaction, FinanceData } from '../domain/finance.ts';

export function TransactionList(props: {
  data: FinanceData;
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
}): ReactElement {
  const { data, transactions, onEdit } = props;
  if (transactions.length === 0) {
    return (
      <p className="empty-state">
        Ainda não há movimentos neste mês.
        <br />
        Toca no botão + para adicionar o primeiro.
      </p>
    );
  }
  const groups = groupByDay(transactions);
  return (
    <div className="tx-list">
      {groups.map((group) => (
        <div key={group.date}>
          <div className="tx-day">{formatMonthDayLong(group.date)}</div>
          {group.items.map((t) => {
            const category = findCategory(data, t.categoryId);
            return (
              <button type="button" className="tx-item" key={t.id} onClick={() => onEdit(t)}>
                <span className="dot" style={{ background: category?.color ?? '#94a3b8' }} />
                <span className="info">
                  <span className="desc">{t.description !== '' ? t.description : (category?.name ?? 'Sem categoria')}</span>
                  <br />
                  <span className="cat">{category?.name ?? 'Sem categoria'}</span>
                </span>
                <span className={`amount ${t.type === 'income' ? 'income' : ''}`}>
                  {t.type === 'income' ? '+' : '−'}
                  {formatCurrency(t.amountCents)}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
