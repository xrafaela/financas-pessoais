import type { ReactElement } from 'react';

import { formatCurrency } from '../domain/finance.ts';
import type { CategoryTotal, MonthPoint } from '../domain/finance.ts';

const PIE_COLORS = [
  '#0f766e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#3b82f6',
  '#ef4444',
  '#84cc16',
];

interface DonutItem {
  categoryId: string;
  totalCents: number;
}

interface DonutArc {
  item: DonutItem;
  dash: number;
  offset: number;
}

function buildArcs(items: DonutItem[], total: number, circumference: number): DonutArc[] {
  const arcs: DonutArc[] = [];
  let acc = 0;
  for (const item of items) {
    const dash = (item.totalCents / total) * circumference;
    arcs.push({ item, dash, offset: -acc });
    acc += dash;
  }
  return arcs;
}

export function DonutChart(props: {
  data: CategoryTotal[];
  categoryNames: Map<string, string>;
}): ReactElement {
  const { data, categoryNames } = props;
  const total = data.reduce((acc, d) => acc + d.totalCents, 0);
  if (total <= 0) {
    return <p className="empty-state">Sem despesas neste mês.</p>;
  }
  const top = data.slice(0, 8);
  const restTotal = data.slice(8).reduce((acc, d) => acc + d.totalCents, 0);
  const items =
    restTotal > 0 ? [...top, { categoryId: 'resto', totalCents: restTotal }] : top;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const arcs = buildArcs(items, total, circumference);

  return (
    <div>
      <div className="donut-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Despesas por categoria">
          {arcs.map(({ item, dash, offset }) => (
            <circle
              key={item.categoryId}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              strokeWidth="24"
              stroke={item.categoryId === 'resto' ? '#94a3b8' : categoryColor(item.categoryId)}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              transform="rotate(-90 80 80)"
            />
          ))}
          <text x="80" y="76" textAnchor="middle" fontSize="11" fill="#64748b">
            Total
          </text>
          <text x="80" y="93" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">
            {formatCurrency(total)}
          </text>
        </svg>
      </div>
      <div className="chart-legend">
        {items.map((item) => (
          <div className="legend-row" key={item.categoryId}>
            <span
              className="dot"
              style={{ background: item.categoryId === 'resto' ? '#94a3b8' : categoryColor(item.categoryId) }}
            />
            <span className="name">
              {item.categoryId === 'resto' ? 'Resto' : (categoryNames.get(item.categoryId) ?? 'Sem categoria')}
            </span>
            <span className="val">
              {formatCurrency(item.totalCents)} · {Math.round((item.totalCents / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  function categoryColor(id: string): string {
    const idx = data.findIndex((d) => d.categoryId === id);
    return PIE_COLORS[idx >= 0 ? idx % PIE_COLORS.length : 0];
  }
}

export function MonthlyBarsChart(props: { series: MonthPoint[] }): ReactElement {
  const { series } = props;
  const max = Math.max(...series.map((p) => Math.max(p.incomeCents, p.expenseCents)), 1);
  const barW = 11;
  const innerGap = 2;
  const groupGap = 8;
  const chartW = series.length * (barW * 2 + innerGap + groupGap) + groupGap;
  const chartH = 110;

  return (
    <div>
      <div className="donut-wrap">
        <svg
          width={chartW}
          height={chartH + 26}
          viewBox={`0 0 ${chartW} ${chartH + 26}`}
          role="img"
          aria-label="Receitas e despesas por mês"
        >
          {series.map((point, i) => {
            const x = groupGap + i * (barW * 2 + innerGap + groupGap);
            const incH = Math.round((point.incomeCents / max) * chartH);
            const expH = Math.round((point.expenseCents / max) * chartH);
            return (
              <g key={point.key}>
                <rect
                  x={x}
                  y={chartH - incH}
                  width={barW}
                  height={point.incomeCents > 0 ? Math.max(incH, 2) : 0}
                  rx="2"
                  fill="#16a34a"
                />
                <rect
                  x={x + barW + innerGap}
                  y={chartH - expH}
                  width={barW}
                  height={point.expenseCents > 0 ? Math.max(expH, 2) : 0}
                  rx="2"
                  fill="#ef4444"
                />
                <text x={x + barW + innerGap / 2} y={chartH + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                  {point.key.slice(5)}/{point.key.slice(2, 4)}
                </text>
              </g>
            );
          })}
          <line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="#e2e8f0" />
        </svg>
      </div>
      <div className="chart-legend">
        <div className="legend-row">
          <span className="dot" style={{ background: '#16a34a' }} />
          <span className="name">Receitas</span>
        </div>
        <div className="legend-row">
          <span className="dot" style={{ background: '#ef4444' }} />
          <span className="name">Despesas</span>
        </div>
      </div>
    </div>
  );
}
