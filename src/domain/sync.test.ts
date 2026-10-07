import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { decideSync } from './sync.ts';
import { createEmptyData } from './finance.ts';
import type { StoredEnvelope } from './sync.ts';

function envelope(savedAt: string): StoredEnvelope {
  return { savedAt, data: createEmptyData() };
}

describe('decideSync', () => {
  it('sem versão na nuvem: push local', () => {
    const d = decideSync(envelope('2026-10-07T10:00:00.000Z'), null);
    assert.deepEqual(d, { action: 'push', winner: 'local' });
  });

  it('timestamps iguais: nada a fazer', () => {
    const d = decideSync(
      envelope('2026-10-07T10:00:00.000Z'),
      envelope('2026-10-07T10:00:00.000Z'),
    );
    assert.deepEqual(d, { action: 'none', winner: null });
  });

  it('local mais recente: push', () => {
    const d = decideSync(
      envelope('2026-10-07T12:00:00.000Z'),
      envelope('2026-10-07T10:00:00.000Z'),
    );
    assert.deepEqual(d, { action: 'push', winner: 'local' });
  });

  it('nuvem mais recente: pull', () => {
    const d = decideSync(
      envelope('2026-10-07T10:00:00.000Z'),
      envelope('2026-10-07T12:00:00.000Z'),
    );
    assert.deepEqual(d, { action: 'pull', winner: 'cloud' });
  });

  it('compara por valor instantâneo, não por string crua', () => {
    // 2026-10-07T11:00:00+02:00 === 09:00Z, que é anterior a 10:00Z
    const d = decideSync(
      envelope('2026-10-07T11:00:00+02:00'),
      envelope('2026-10-07T10:00:00.000Z'),
    );
    assert.deepEqual(d, { action: 'pull', winner: 'cloud' });
  });

  it('local sem timestamp válido: nuvem vence', () => {
    const d = decideSync(envelope(''), envelope('2026-10-07T10:00:00.000Z'));
    assert.deepEqual(d, { action: 'pull', winner: 'cloud' });
  });

  it('nuvem sem timestamp válido: local vence', () => {
    const d = decideSync(envelope('2026-10-07T10:00:00.000Z'), envelope(''));
    assert.deepEqual(d, { action: 'push', winner: 'local' });
  });

  it('ambos inválidos: nada a fazer', () => {
    const d = decideSync(envelope('lixo'), envelope('também lixo'));
    assert.deepEqual(d, { action: 'none', winner: null });
  });
});
