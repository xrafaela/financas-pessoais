import type { ReactElement } from 'react';

import { formatCurrency, transactionsInMonth } from '../domain/finance.ts';
import type { FinanceData, Transaction } from '../domain/finance.ts';

import { TransactionList } from '../components/TransactionList.tsx';

export function TransactionsPage(props: {
  data: FinanceData;
  month: string;
  onEditTransaction: (t: Transaction) => void;
}): ReactElement {
  const { data, month, onEditTransaction } = props;
  const monthTx = transactionsInMonth(data.transactions, month);
  return (
    <div className="card">
      <h3 className="card-title">Todos os movimentos</h3>
      <TransactionList data={data} transactions={monthTx} onEdit={onEditTransaction} />
    </div>
  );
}

export function TransactionsPageFooter(props: { data: FinanceData; month: string }): ReactElement {
  const monthTx = transactionsInMonth(props.data.transactions, props.month);
  return (
    <p className="empty-state">
      {monthTx.length} movimento{monthTx.length === 1 ? '' : 's'} ·{' '}
      {formatCurrency(monthTx.reduce((acc, t) => acc + t.amountCents, 0))} em total bruto
    </p>
  );
}
