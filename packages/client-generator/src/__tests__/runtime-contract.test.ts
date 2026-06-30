import { renderRuntime } from '../emitters/runtime.js';
import { defineClientSetup } from '../runtime-contract.js';

describe('defineClientSetup', () => {
  it('returns its argument unchanged (identity helper)', () => {
    const setup = { config: { baseUrl: 'https://x' }, middleware: [] };
    expect(defineClientSetup(setup)).toBe(setup);
  });
});

describe('contract types stay in lockstep with the emitted runtime', () => {
  // Drift alarm: these spec-independent shapes are emitted verbatim into every client.
  // If one changes here, update src/runtime-contract.ts to match (and vice-versa). The
  // emitted types are re-printed by the TS printer (multi-line), so we assert on the
  // distinctive field signatures rather than a one-line form.
  const out = renderRuntime('https://x', false, false);
  it.each([
    ['OperationContext', 'export type OperationContext = {'],
    ['OperationContext.tags', 'tags: string[];'],
    ['RequestContext.operation', 'operation: OperationContext;'],
    ['Middleware.onRequest', 'onRequest?: (ctx: RequestContext) => void | Promise<void>;'],
    ['RetryStrategy', "export type RetryStrategy = 'fixed' | 'exponential';"],
  ])('emits %s', (_name, signature) => {
    expect(out).toContain(signature);
  });
});
