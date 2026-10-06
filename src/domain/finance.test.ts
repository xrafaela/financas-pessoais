import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_AMOUNT_CENTS,
  addCategory,
  addMonths,
  addTransaction,
  budgetStatus,
  categoryTotals,
  createEmptyData,
  deleteCategory,
  deleteTransaction,
  formatCurrency,
  groupByDay,
  isValidDateString,
  monthKey,
  monthlySeries,
  parseAmountToCents,
  setBudget,
  sumAmounts,
  todayISO,
  toISODate,
  transactionsInMonth,
  updateTransaction,
  validateTransactionInput,
  type FinanceData,
  type TransactionInput,
} from './finance.ts';

const data = (): FinanceData => createEmptyData();

function withTx(d: FinanceData, input: TransactionInput): FinanceData {
  const r = addTransaction(d, input);
  assert.ok(r.ok, `withTx falhou: ${!r.ok ? r.error : ''}`);
  return r.ok ? r.value : d;
}

describe('parseAmountToCents', () => {
  it('converte formatos válidos', () => {
    assert.equal(parseAmountToCents('10'), 1000);
    assert.equal(parseAmountToCents('10,50'), 1050);
    assert.equal(parseAmountToCents('10.5'), 1050);
    assert.equal(parseAmountToCents(' 1 234,56 € '), 123456);
    assert.equal(parseAmountToCents('0,01'), 1);
    assert.equal(parseAmountToCents('0,005'), 1);
    assert.equal(parseAmountToCents('0,004'), null);
  });

  it('rejeita formatos inválidos', () => {
    assert.equal(parseAmountToCents(''), null);
    assert.equal(parseAmountToCents('abc'), null);
    assert.equal(parseAmountToCents('-5'), null);
    assert.equal(parseAmountToCents('1.2.3'), null);
    assert.equal(parseAmountToCents('0'), null);
    assert.equal(parseAmountToCents('0,00'), null);
    assert.equal(parseAmountToCents(String(MAX_AMOUNT_CENTS / 100 + 1)), null);
  });
});

describe('datas', () => {
  it('toISODate formata com zeros', () => {
    assert.equal(toISODate(2026, 1, 3), '2026-01-03');
    assert.equal(toISODate(2026, 12, 31), '2026-12-31');
  });

  it('isValidDateString valida datas reais', () => {
    assert.equal(isValidDateString('2026-02-29'), false);
    assert.equal(isValidDateString('2024-02-29'), true);
    assert.equal(isValidDateString('2026-13-01'), false);
    assert.equal(isValidDateString('2026-04-31'), false);
    assert.equal(isValidDateString('2026-00-10'), false);
    assert.equal(isValidDateString('20260101'), false);
    assert.equal(isValidDateString('2026-01-01'), true);
  });

  it('monthKey e addMonths', () => {
    assert.equal(monthKey('2026-03-15'), '2026-03');
    assert.equal(addMonths('2026-01', -1), '2025-12');
    assert.equal(addMonths('2025-12', 1), '2026-01');
    assert.equal(addMonths('2026-03', -3), '2025-12');
  });

  it('todayISO devolve data válida', () => {
    assert.equal(isValidDateString(todayISO()), true);
  });
});

describe('formatCurrency', () => {
  it('formata em EUR com decimais e símbolo da moeda', () => {
    const out = formatCurrency(123456).replace(/[\s\u00A0\u202F.]/g, '');
    assert.ok(out.includes('1234,56'), out);
    assert.ok(out.includes('€'), out);
    const zero = formatCurrency(0).replace(/[\s\u00A0\u202F.]/g, '');
    assert.ok(zero.includes('0,00'), zero);
  });
});

describe('totais e séries', () => {
  it('transactionsInMonth filtra por mês', () => {
    let d = data();
    d = withTx(d, { type: 'expense', amountCents: 1000, categoryId: 'cat-alimentacao', description: 'a', date: '2026-03-10' });
    d = withTx(d, { type: 'expense', amountCents: 2000, categoryId: 'cat-alimentacao', description: 'b', date: '2026-04-10' });
    assert.equal(transactionsInMonth(d.transactions, '2026-03').length, 1);
    assert.equal(transactionsInMonth(d.transactions, '2026-04').length, 1);
    assert.equal(transactionsInMonth(d.transactions, '2026-05').length, 0);
  });

  it('sumAmounts soma por tipo', () => {
    let d = data();
    d = withTx(d, { type: 'expense', amountCents: 1000, categoryId: 'cat-alimentacao', description: 'a', date: '2026-03-10' });
    d = withTx(d, { type: 'income', amountCents: 5000, categoryId: 'cat-salario', description: 'b', date: '2026-03-11' });
    d = withTx(d, { type: 'expense', amountCents: 500, categoryId: 'cat-lazer', description: 'c', date: '2026-03-12' });
    const month = transactionsInMonth(d.transactions, '2026-03');
    assert.equal(sumAmounts(month, 'expense'), 1500);
    assert.equal(sumAmounts(month, 'income'), 5000);
  });

  it('categoryTotals ordena por valor descendente', () => {
    let d = data();
    d = withTx(d, { type: 'expense', amountCents: 100, categoryId: 'cat-lazer', description: 'a', date: '2026-03-10' });
    d = withTx(d, { type: 'expense', amountCents: 900, categoryId: 'cat-alimentacao', description: 'b', date: '2026-03-10' });
    const totals = categoryTotals(transactionsInMonth(d.transactions, '2026-03'), 'expense');
    assert.equal(totals[0].categoryId, 'cat-alimentacao');
    assert.equal(totals[0].totalCents, 900);
  });

  it('monthlySeries devolve todos os meses com zeros', () => {
    let d = data();
    d = withTx(d, { type: 'expense', amountCents: 1000, categoryId: 'cat-alimentacao', description: 'a', date: '2026-02-15' });
    d = withTx(d, { type: 'income', amountCents: 2000, categoryId: 'cat-salario', description: 'b', date: '2026-02-20' });
    const series = monthlySeries(d.transactions, '2026-03', 6);
    assert.equal(series.length, 6);
    assert.equal(series[5].key, '2026-03');
    assert.equal(series[4].key, '2026-02');
    assert.equal(series[4].expenseCents, 1000);
    assert.equal(series[4].incomeCents, 2000);
    assert.equal(series[0].key, '2025-10');
    assert.equal(series[0].expenseCents, 0);
    assert.equal(series[5].incomeCents, 0);
  });

  it('groupByDay agrupa e ordena descendente', () => {
    let d = data();
    d = withTx(d, { type: 'expense', amountCents: 100, categoryId: 'cat-lazer', description: 'a', date: '2026-03-10' });
    d = withTx(d, { type: 'expense', amountCents: 200, categoryId: 'cat-lazer', description: 'b', date: '2026-03-12' });
    const groups = groupByDay(d.transactions);
    assert.equal(groups[0].date, '2026-03-12');
    assert.equal(groups[1].date, '2026-03-10');
    assert.equal(groups[0].items.length, 1);
  });
});

describe('orçamentos', () => {
  it('budgetStatus classifica corretamente', () => {
    assert.equal(budgetStatus(500, 1000), 'ok');
    assert.equal(budgetStatus(799, 1000), 'ok');
    assert.equal(budgetStatus(800, 1000), 'warn');
    assert.equal(budgetStatus(999, 1000), 'warn');
    assert.equal(budgetStatus(1000, 1000), 'exceeded');
    assert.equal(budgetStatus(1001, 1000), 'exceeded');
    assert.equal(budgetStatus(0, 0), 'ok');
    assert.equal(budgetStatus(1, 0), 'exceeded');
  });

  it('setBudget define, atualiza e remove (limite 0)', () => {
    let d = data();
    let r = setBudget(d, 'cat-alimentacao', 30000);
    assert.ok(r.ok);
    d = r.ok ? r.value : d;
    r = setBudget(d, 'cat-alimentacao', 45000);
    assert.ok(r.ok);
    d = r.ok ? r.value : d;
    assert.equal(d.budgets.length, 1);
    assert.equal(d.budgets[0].monthlyLimitCents, 45000);
    r = setBudget(d, 'cat-alimentacao', 0);
    assert.ok(r.ok);
    d = r.ok ? r.value : d;
    assert.equal(d.budgets.length, 0);
  });

  it('setBudget rejeita categoria inexistente e valores negativos', () => {
    const d = data();
    assert.ok(!setBudget(d, 'cat-xxx', 100).ok);
    assert.ok(!setBudget(d, 'cat-alimentacao', -5).ok);
    assert.ok(!setBudget(d, 'cat-alimentacao', 10.5).ok);
  });
});

describe('CRUD de transações', () => {
  it('addTransaction valida e rejeita input ruim', () => {
    const d = data();
    assert.ok(!addTransaction(d, { type: 'expense', amountCents: 0, categoryId: 'cat-alimentacao', description: 'x', date: '2026-03-10' }).ok);
    assert.ok(!addTransaction(d, { type: 'expense', amountCents: 100, categoryId: 'cat-xxx', description: 'x', date: '2026-03-10' }).ok);
    assert.ok(!addTransaction(d, { type: 'expense', amountCents: 100, categoryId: 'cat-salario', description: 'x', date: '2026-03-10' }).ok);
    assert.ok(!addTransaction(d, { type: 'expense', amountCents: 100, categoryId: 'cat-alimentacao', description: 'x', date: '2026-13-40' }).ok);
    assert.ok(!addTransaction(d, { type: 'expense', amountCents: 100, categoryId: 'cat-alimentacao', description: 'x'.repeat(201), date: '2026-03-10' }).ok);
    assert.ok(!addTransaction(d, { type: 'income', amountCents: 100, categoryId: 'cat-alimentacao', description: 'x', date: '2026-03-10' }).ok);
  });

  it('updateTransaction altera e valida', () => {
    let d = data();
    d = withTx(d, { type: 'expense', amountCents: 1000, categoryId: 'cat-alimentacao', description: 'jantar', date: '2026-03-10' });
    const id = d.transactions[0].id;
    const upd = updateTransaction(d, id, { type: 'expense', amountCents: 1500, categoryId: 'cat-lazer', description: 'cinema', date: '2026-03-11' });
    assert.ok(upd.ok);
    if (upd.ok) {
      d = upd.value;
      assert.equal(d.transactions[0].amountCents, 1500);
      assert.equal(d.transactions[0].description, 'cinema');
      assert.equal(d.transactions[0].categoryId, 'cat-lazer');
    }
    assert.ok(!updateTransaction(d, 'id-inexistente', { type: 'expense', amountCents: 100, categoryId: 'cat-lazer', description: 'x', date: '2026-03-11' }).ok);
  });

  it('deleteTransaction remove apenas existentes', () => {
    let d = data();
    d = withTx(d, { type: 'expense', amountCents: 1000, categoryId: 'cat-alimentacao', description: 'jantar', date: '2026-03-10' });
    const id = d.transactions[0].id;
    assert.ok(!deleteTransaction(d, 'xxx').ok);
    const del = deleteTransaction(d, id);
    assert.ok(del.ok);
    if (del.ok) {
      d = del.value;
      assert.equal(d.transactions.length, 0);
    }
  });

  it('validateTransactionInput devolve erros agregados', () => {
    const d = data();
    const errs = validateTransactionInput({ type: 'expense', amountCents: 0, categoryId: 'cat-xxx', description: '', date: 'bad' }, d);
    assert.ok(errs.length >= 3);
  });
});

describe('categorias', () => {
  it('addCategory cria e rejeita duplicados/inválidos', () => {
    let d = data();
    const add = addCategory(d, { name: 'Ginásio', color: '#ff00ff', type: 'expense' });
    assert.ok(add.ok);
    if (add.ok) d = add.value;
    assert.ok(!addCategory(d, { name: 'ginásio', color: '#ff00ff', type: 'expense' }).ok);
    assert.ok(!addCategory(d, { name: '', color: '#ff00ff', type: 'expense' }).ok);
    assert.ok(!addCategory(d, { name: 'X'.repeat(41), color: '#ff00ff', type: 'expense' }).ok);
    assert.ok(!addCategory(d, { name: 'Ok', color: 'red', type: 'expense' }).ok);
  });

  it('deleteCategory protege categorias em uso', () => {
    let d = data();
    const add = addCategory(d, { name: 'Ginásio', color: '#ff00ff', type: 'expense' });
    assert.ok(add.ok);
    if (add.ok) d = add.value;
    const gymId = d.categories[d.categories.length - 1].id;
    d = withTx(d, { type: 'expense', amountCents: 100, categoryId: gymId, description: 'x', date: '2026-03-10' });
    assert.ok(!deleteCategory(d, gymId).ok);
    const del = deleteCategory(d, 'cat-lazer');
    assert.ok(del.ok);
    if (del.ok) {
      d = del.value;
      assert.ok(!d.categories.some((c) => c.id === 'cat-lazer'));
    }
  });
});
