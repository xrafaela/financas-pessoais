import type { ReactElement } from 'react';

import { categoryTotals, findCategory, formatCurrency, monthlySeries, sumAmounts, transactionsInMonth } from '../domain/finance.ts';
import type { FinanceData } from '../domain/finance.ts';

import { DonutChart, MonthlyBarsChart } from '../components/charts.tsx';

export function ReportsPage(props: { data: FinanceData; month: string }): ReactElement {
  const { data, month } = props;
  const series = monthlySeries(data.transactions, month, 6);
  const monthTx = transactionsInMonth(data.transactions, month);
  const income = sumAmounts(monthTx, 'income');
  const expense = sumAmounts(monthTx, 'expense');

  const prevKey = series.length >= 2 ? series[series.length - 2].key : null;
  const prevExpense = prevKey !== null ? sumAmounts(transactionsInMonth(data.transactions, prevKey), 'expense') : null;
  const delta = prevExpense !== null && prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : null;

  const categoryNames = new Map(data.categories.map((c) => [c.id, c.name]));
  const expensesByCategory = categoryTotals(monthTx, 'expense');

  const topCategory = expensesByCategory[0];
  const topCategoryName = topCategory ? (findCategory(data, topCategory.categoryId)?.name ?? '—') : '—';

  return (
    <>
      <div className="card">
        <h3 className="card-title">Últimos 6 meses</h3>
        <MonthlyBarsChart series={series} />
      </div>

      <div className="card">
        <h3 className="card-title">Comparação com o mês anterior</h3>
        <div className="comparison">
          <span className="big">{formatCurrency(expense)}</span>
          {delta !== null && (
            <span className={`delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta)}% vs. mês anterior
            </span>
          )}
          {delta === null && <span className="delta" style={{ color: 'var(--muted)' }}>sem base de comparação</span>}
        </div>
        <div className="legend-row" style={{ marginTop: 8 }}>
          <span className="name">Saldo do mês:</span>
          <span className="val">{formatCurrency(income - expense)}</span>
        </div>
        {topCategory && (
          <div className="legend-row">
            <span className="name">Maior categoria:</span>
            <span className="val">{topCategoryName}</span>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Despesas por categoria</h3>
        <DonutChart data={expensesByCategory} categoryNames={categoryNames} />
      </div>
    </>
  );
}
