import type { FinanceData } from './finance.ts';

export interface StoredEnvelope {
  savedAt: string;
  data: FinanceData;
}

export type SyncAction = 'push' | 'pull' | 'none';

export interface SyncDecision {
  action: SyncAction;
  winner: 'local' | 'cloud' | null;
}

function normalizeTimestamp(value: string): string {
  if (value === '') return '';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return '';
  return new Date(parsed).toISOString();
}

export function decideSync(
  local: StoredEnvelope,
  cloud: StoredEnvelope | null,
): SyncDecision {
  if (cloud === null) {
    return { action: 'push', winner: 'local' };
  }
  const localTs = normalizeTimestamp(local.savedAt);
  const cloudTs = normalizeTimestamp(cloud.savedAt);
  if (localTs === cloudTs) {
    return { action: 'none', winner: null };
  }
  if (localTs === '') {
    return { action: 'pull', winner: 'cloud' };
  }
  if (cloudTs === '') {
    return { action: 'push', winner: 'local' };
  }
  if (localTs > cloudTs) {
    return { action: 'push', winner: 'local' };
  }
  return { action: 'pull', winner: 'cloud' };
}
