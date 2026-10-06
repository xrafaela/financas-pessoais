export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  type: TransactionType;
}

export interface Budget {
  categoryId: string;
  monthlyLimitCents: number;
}

export interface FinanceData {
  version: 1;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
}

export type BudgetStatus = 'ok' | 'warn' | 'exceeded';

export interface TransactionInput {
  type: TransactionType;
  amountCents: number;
  categoryId: string;
  description: string;
  date: string;
}

export interface CategoryInput {
  name: string;
  color: string;
  type: TransactionType;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export interface MonthPoint {
  key: string;
  label: string;
  incomeCents: number;
  expenseCents: number;
}

export interface CategoryTotal {
  categoryId: string;
  totalCents: number;
}

export const MAX_AMOUNT_CENTS = 99_999_999;
export const MAX_DESCRIPTION_LENGTH = 200;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-alimentacao', name: 'Alimentação', color: '#ef4444', type: 'expense' },
  { id: 'cat-transporte', name: 'Transporte', color: '#f59e0b', type: 'expense' },
  { id: 'cat-habitacao', name: 'Habitação', color: '#8b5cf6', type: 'expense' },
  { id: 'cat-saude', name: 'Saúde', color: '#10b981', type: 'expense' },
  { id: 'cat-lazer', name: 'Lazer', color: '#06b6d4', type: 'expense' },
  { id: 'cat-educacao', name: 'Educação', color: '#3b82f6', type: 'expense' },
  { id: 'cat-compras', name: 'Compras', color: '#ec4899', type: 'expense' },
  { id: 'cat-subscricoes', name: 'Subscrições', color: '#6366f1', type: 'expense' },
  { id: 'cat-outros-despesas', name: 'Outros', color: '#6b7280', type: 'expense' },
  { id: 'cat-salario', name: 'Salário', color: '#22c55e', type: 'income' },
  { id: 'cat-outros-rendimentos', name: 'Outros rendimentos', color: '#84cc16', type: 'income' },
];

export function uid(): string {
  return crypto.randomUUID();
}

export function createEmptyData(): FinanceData {
  return {
    version: 1,
    transactions: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    budgets: [],
  };
}

export function createExpenseData(data: FinanceData): FinanceData {
  return {
    version: 1,
    transactions: data.transactions.map((t) => ({ ...t })),
    categories: data.categories.map((c) => ({ ...c })),
    budgets: data.budgets.map((b) => ({ ...b })),
  };
}

export function todayISO(): string {
  const now = new Date();
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function formatDateShort(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
}

export function formatMonthDayLong(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
}

export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, '').replace('€', '');
  if (trimmed === '') return null;
  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(\.\d*)?$/.test(normalized)) return null;
  const [intPart, decPart = ''] = normalized.split('.');
  const intValue = Number(intPart);
  if (intValue > MAX_AMOUNT_CENTS / 100) return null;
  let cents = intValue * 100;
  if (decPart.length > 0) {
    const twoDigits = decPart.slice(0, 2).padEnd(2, '0');
    cents += Number(twoDigits);
    const third = decPart.slice(2, 3);
    if (third !== '' && Number(third) >= 5) cents += 1;
  }
  if (cents < 1 || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

export function transactionsInMonth(transactions: Transaction[], key: string): Transaction[] {
  return transactions.filter((t) => t.date.slice(0, 7) === key);
}

export function sumAmounts(transactions: Transaction[], type: TransactionType): number {
  let total = 0;
  for (const t of transactions) {
    if (t.type === type) total += t.amountCents;
  }
  return total;
}

export function categoryTotals(transactions: Transaction[], type: TransactionType): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const current = map.get(t.categoryId) ?? 0;
    map.set(t.categoryId, current + t.amountCents);
  }
  return [...map.entries()]
    .map(([categoryId, totalCents]) => ({ categoryId, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export function budgetStatus(spentCents: number, limitCents: number): BudgetStatus {
  if (limitCents <= 0) return spentCents > 0 ? 'exceeded' : 'ok';
  const pct = (spentCents / limitCents) * 100;
  if (pct >= 100) return 'exceeded';
  if (pct >= 80) return 'warn';
  return 'ok';
}

export function budgetForCategory(data: FinanceData, categoryId: string): Budget | undefined {
  return data.budgets.find((b) => b.categoryId === categoryId);
}

export function monthlySeries(
  transactions: Transaction[],
  endMonthKey: string,
  monthCount: number,
): MonthPoint[] {
  const keys: string[] = [];
  for (let i = monthCount - 1; i >= 0; i--) keys.push(addMonths(endMonthKey, -i));
  const byKey = new Map<string, { incomeCents: number; expenseCents: number }>();
  for (const k of keys) byKey.set(k, { incomeCents: 0, expenseCents: 0 });
  for (const t of transactions) {
    const k = t.date.slice(0, 7);
    const bucket = byKey.get(k);
    if (!bucket) continue;
    if (t.type === 'income') bucket.incomeCents += t.amountCents;
    else bucket.expenseCents += t.amountCents;
  }
  return keys.map((k) => ({
    key: k,
    label: monthLabel(k),
    incomeCents: byKey.get(k)?.incomeCents ?? 0,
    expenseCents: byKey.get(k)?.expenseCents ?? 0,
  }));
}

export function defaultFormDate(month: string): string {
  return month === currentMonthKey() ? todayISO() : `${month}-01`;
}

export function groupByDay(transactions: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = map.get(t.date) ?? [];
    list.push(t);
    map.set(t.date, list);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }));
}

export function findCategory(data: FinanceData, id: string): Category | undefined {
  return data.categories.find((c) => c.id === id);
}

export function validateTransactionInput(input: TransactionInput, data: FinanceData): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1 || input.amountCents > MAX_AMOUNT_CENTS) {
    errors.push('O valor deve ser superior a zero.');
  }
  if (!isValidDateString(input.date)) {
    errors.push('A data é inválida.');
  }
  const category = findCategory(data, input.categoryId);
  if (!category) {
    errors.push('A categoria selecionada não existe.');
  } else if (category.type !== input.type) {
    errors.push('A categoria não corresponde ao tipo de movimento.');
  }
  if (input.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`A descrição não pode exceder ${MAX_DESCRIPTION_LENGTH} caracteres.`);
  }
  return errors;
}

export function addTransaction(data: FinanceData, input: TransactionInput): Result<FinanceData> {
  const errors = validateTransactionInput(input, data);
  if (errors.length > 0) return { ok: false, error: errors.join(' ') };
  const now = new Date().toISOString();
  const next = createExpenseData(data);
  next.transactions.push({
    id: uid(),
    type: input.type,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    description: input.description.trim(),
    date: input.date,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, value: next };
}

export function updateTransaction(data: FinanceData, id: string, input: TransactionInput): Result<FinanceData> {
  const target = data.transactions.find((t) => t.id === id);
  if (!target) return { ok: false, error: 'Movimento não encontrado.' };
  const errors = validateTransactionInput(input, data);
  if (errors.length > 0) return { ok: false, error: errors.join(' ') };
  const next = createExpenseData(data);
  const idx = next.transactions.findIndex((t) => t.id === id);
  next.transactions[idx] = {
    ...target,
    type: input.type,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    description: input.description.trim(),
    date: input.date,
    updatedAt: new Date().toISOString(),
  };
  return { ok: true, value: next };
}

export function deleteTransaction(data: FinanceData, id: string): Result<FinanceData> {
  if (!data.transactions.some((t) => t.id === id)) {
    return { ok: false, error: 'Movimento não encontrado.' };
  }
  const next = createExpenseData(data);
  next.transactions = next.transactions.filter((t) => t.id !== id);
  return { ok: true, value: next };
}

export function setBudget(data: FinanceData, categoryId: string, limitCents: number): Result<FinanceData> {
  const category = findCategory(data, categoryId);
  if (!category) return { ok: false, error: 'Categoria não encontrada.' };
  if (!Number.isInteger(limitCents) || limitCents < 0 || limitCents > MAX_AMOUNT_CENTS) {
    return { ok: false, error: 'O limite do orçamento é inválido.' };
  }
  const next = createExpenseData(data);
  const existing = next.budgets.findIndex((b) => b.categoryId === categoryId);
  if (limitCents === 0) {
    if (existing >= 0) next.budgets.splice(existing, 1);
  } else if (existing >= 0) {
    next.budgets[existing] = { categoryId, monthlyLimitCents: limitCents };
  } else {
    next.budgets.push({ categoryId, monthlyLimitCents: limitCents });
  }
  return { ok: true, value: next };
}

export function addCategory(data: FinanceData, input: CategoryInput): Result<FinanceData> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 40) {
    return { ok: false, error: 'O nome da categoria deve ter entre 1 e 40 caracteres.' };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(input.color)) {
    return { ok: false, error: 'A cor da categoria é inválida.' };
  }
  const duplicated = data.categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
  if (duplicated) return { ok: false, error: 'Já existe uma categoria com esse nome.' };
  const next = createExpenseData(data);
  next.categories.push({ id: uid(), name, color: input.color, type: input.type });
  return { ok: true, value: next };
}

export function deleteCategory(data: FinanceData, categoryId: string): Result<FinanceData> {
  const category = findCategory(data, categoryId);
  if (!category) return { ok: false, error: 'Categoria não encontrada.' };
  if (data.transactions.some((t) => t.categoryId === categoryId)) {
    return { ok: false, error: 'Não é possível eliminar: existem movimentos nesta categoria.' };
  }
  const next = createExpenseData(data);
  next.categories = next.categories.filter((c) => c.id !== categoryId);
  next.budgets = next.budgets.filter((b) => b.categoryId !== categoryId);
  return { ok: true, value: next };
}
