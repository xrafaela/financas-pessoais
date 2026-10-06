import type { ReactElement } from 'react';

import { budgetStatus, formatCurrency } from '../domain/finance.ts';
import type { BudgetStatus } from '../domain/finance.ts';

export function BudgetBar(props: { spentCents: number; limitCents: number }): ReactElement {
  const { spentCents, limitCents } = props;
  const status: BudgetStatus = budgetStatus(spentCents, limitCents);
  const pct = limitCents > 0 ? Math.min(Math.round((spentCents / limitCents) * 100), 999) : 100;
  const width = limitCents > 0 ? Math.min((spentCents / limitCents) * 100, 100) : spentCents > 0 ? 100 : 0;
  return (
    <div>
      <div className="progress-track">
        <div className={`progress-fill ${status}`} style={{ width: `${width}%` }} />
      </div>
      <div className="legend-row" style={{ marginTop: 4 }}>
        <span className="val">
          {formatCurrency(spentCents)} de {formatCurrency(limitCents)}
          {status === 'exceeded' ? ' · excedido' : status === 'warn' ? ` · ${pct}%` : ''}
        </span>
      </div>
    </div>
  );
}
