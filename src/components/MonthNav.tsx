import type { ReactElement } from 'react';

import { addMonths, currentMonthKey, monthLabel } from '../domain/finance.ts';

import { ChevronLeftIcon, ChevronRightIcon } from './icons.tsx';

export function MonthNav(props: { month: string; onChange: (next: string) => void }): ReactElement {
  const { month, onChange } = props;
  const isCurrentOrFuture = month >= currentMonthKey();
  return (
    <div className="month-nav">
      <button
        type="button"
        onClick={() => onChange(addMonths(month, -1))}
        aria-label="Mês anterior"
      >
        <ChevronLeftIcon size={20} />
      </button>
      <span className="month-label">{monthLabel(month)}</span>
      <button
        type="button"
        disabled={isCurrentOrFuture}
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Mês seguinte"
      >
        <ChevronRightIcon size={20} />
      </button>
    </div>
  );
}
