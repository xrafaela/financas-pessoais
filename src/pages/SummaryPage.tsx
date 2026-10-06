import type { ReactElement } from 'react';

import {
  budgetStatus,
  categoryTotals,
  findCategory,
  formatCurrency,
  sumAmounts,
  transactionsInMonth,
} from '../domain/finance.ts';
import type { FinanceData, Transaction } from '../domain/finance.ts';

import { BudgetBar } from '../components/BudgetBar.tsx';
import { DonutChart } from '../components/charts.tsx';
import { TransactionList } from '../components/TransactionList.tsx';

export function SummaryPage(props: {
  data: FinanceData;
  month: string;
  onEditTransaction: (t: Transaction) => void;
}): ReactElement {
  const { data, month, onEditTransaction } = props;
  const monthTx = transactionsInMonth(data.transactions, month);
  const income = sumAmounts(monthTx, 'income');
  const expense = sumAmounts(monthTx, 'expense');
  const balance = income - expense;

  const categoryNames = new Map(data.categories.map((c) => [c.id, c.name]));
  const expensesByCategory = categoryTotals(monthTx, 'expense');

  const alerts: { name: string; status: string; pct: number }[] = [];
  for (const budget of data.budgets) {
    const category = findCategory(data, budget.categoryId);
    if (!category) continue;
    const spent = sumAmounts(
      monthTx.filter((t) => t.categoryId === budget.categoryId),
      'expense',
    );
    const status = budgetStatus(spent, budget.monthlyLimitCents);
    if (status === 'ok') continue;
    const pct = Math.round((spent / budget.monthlyLimitCents) * 100);
    alerts.push({
      name: category.name,
      status: status === 'exceeded' ? 'excedido' : 'perto do limite',
      pct: budget.monthlyLimitCents > 0 ? pct : 100,
    });
  }

  const recent = [...monthTx]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5);

  return (
    <>
      {alerts.length > 0 && (
        <div className={`alert-card card ${alerts[0].status === 'perto do limite' ? 'warn' : ''}`}>
          {alerts.map((a) => (
            <p key={a.name}>
              {a.status === 'excedido' ? 'Orçamento excedido' : 'Atenção'}: {a.name} está a {a.pct}% do orçamento.
            </p>
          ))}
        </div>
      )}

      <div className="totals-grid">
        <div className="total-card">
          <div className="label">Receitas</div>
          <div className="value income">{formatCurrency(income)}</div>
        </div>
        <div className="total-card">
          <div className="label">Despesas</div>
          <div className="value">{formatCurrency(expense)}</div>
        </div>
        <div className="total-card balance">
          <div className="label">Saldo do mês</div>
          <div className={`value ${balance < 0 ? 'negative' : ''}`}>{formatCurrency(balance)}</div>
        </div>
      </div>

      {data.budgets.length > 0 && (
        <div className="card">
          <h3 className="card-title">Orçamentos do mês</h3>
          {data.budgets.slice(0, 4).map((b) => {
            const category = findCategory(data, b.categoryId);
            if (!category) return null;
            const spent = sumAmounts(
              monthTx.filter((t) => t.categoryId === b.categoryId),
              'expense',
            );
            return (
              <div className="budget-row" key={b.categoryId}>
                <div className="budget-row-head">
                  <span className="color-dot" style={{ background: category.color }} />
                  <span className="name">{category.name}</span>
                </div>
                <BudgetBar spentCents={spent} limitCents={b.monthlyLimitCents} />
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Despesas por categoria</h3>
        <DonutChart data={expensesByCategory} categoryNames={categoryNames} />
      </div>

      <div className="card">
        <h3 className="card-title">Movimentos recentes</h3>
        <TransactionList data={data} transactions={recent} onEdit={onEditTransaction} />
      </div>
    </>
  );
}
