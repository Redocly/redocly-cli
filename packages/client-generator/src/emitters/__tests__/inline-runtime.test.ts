import { assembleInlineRuntime } from '../inline-runtime.js';
import { ts } from '../ts.js';

const NONE = { multipart: false, auth: false, sse: false, setup: false };
const ALL = { multipart: true, auth: true, sse: true, setup: true };

/** Positions of `markers` in `text`; asserts each is present and they appear in order. */
function expectOrder(text: string, markers: string[]): void {
  const positions = markers.map((marker) => {
    const at = text.indexOf(marker);
    expect(at, `missing marker: ${marker}`).toBeGreaterThanOrEqual(0);
    return at;
  });
  expect(positions, `markers out of order: ${markers.join(' < ')}`).toEqual(
    [...positions].sort((a, b) => a - b)
  );
}

// Syntax-validity gate: `ts.createSourceFile` + its parse diagnostics. Pragmatic by
// design — a full in-memory `ts.createProgram` typecheck is stage T3+'s e2e strict-tsc
// job; here we assert the assembled text is at least syntactically sound TypeScript.
function parseErrors(source: string): readonly unknown[] {
  const file = ts.createSourceFile(
    'inline.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  return (file as unknown as { parseDiagnostics: readonly unknown[] }).parseDiagnostics;
}

describe('assembleInlineRuntime', () => {
  describe('core-only', () => {
    const out = assembleInlineRuntime(NONE);

    it('keeps export on the public surface and strips it from internals', () => {
      expect(out).toContain('export class ApiError');
      expect(out).toContain('function buildUrl');
      expect(out).not.toContain('export function buildUrl');
      // The factory IS exported — the generated module's multi-instance surface
      // (spec: it re-exports `createClient`/`OPERATIONS`/`Ops`).
      expect(out).toContain('export function createClient<\n  Ops extends OpsShape,');
      expect(out).toContain('Tag extends string = string,');
    });

    it('wires an empty capability object', () => {
      expect(out).toContain('createClientCore<Ops, Id, Path, Tag>(operations, config, {})');
    });

    it('embeds no capability module', () => {
      // The auth MODULE is absent (its function bodies); `resolveAuth` as a bare word
      // still appears in create-client.ts's `Capabilities` seam type — that is expected.
      expect(out).not.toContain('toFormData');
      expect(out).not.toContain('async function resolveAuth');
      expect(out).not.toContain('resolveToken');
      expect(out).not.toContain('async function* sse');
      expect(out).not.toContain('mergeSetup');
    });

    it('contains no import statements or package references', () => {
      expect(out).not.toContain("from './");
      expect(out).not.toContain("from '@redocly");
      expect(out).not.toContain('import ');
    });

    it('starts with the embedded-runtime header and orders modules by dependency', () => {
      expect(
        out.startsWith(
          "// ─── Embedded runtime (@redocly/client-generator, assembled per this API's needs) ───\n\n"
        )
      ).toBe(true);
      expectOrder(out, [
        'export type ParamSpec',
        'export class ApiError',
        'function buildUrl',
        'async function parse',
        'function defaultRetryOn',
        'async function send',
        'function createClientCore',
        'function createClient<\n  Ops extends OpsShape,',
      ]);
    });
  });

  describe('full capabilities', () => {
    const out = assembleInlineRuntime(ALL);

    it('wires all capabilities into the factory', () => {
      expect(out).toContain('serializeMultipart: toFormData');
      expect(out).toContain(
        'createClientCore<Ops, Id, Path, Tag>(operations, config, { serializeMultipart: toFormData, resolveAuth, sse })'
      );
    });

    it('embeds the capability modules module-local, mergeSetup exported', () => {
      expect(out).toContain('function toFormData');
      expect(out).not.toContain('export function toFormData');
      expect(out).toContain('async function resolveAuth');
      expect(out).not.toContain('export async function resolveAuth');
      expect(out).toContain('async function* sse');
      expect(out).not.toContain('export async function* sse');
      expect(out).toContain('export function mergeSetup');
    });

    it('slots capability modules into the dependency order', () => {
      expectOrder(out, [
        'function defaultRetryOn',
        'function toFormData',
        'async function resolveAuth',
        'export function mergeSetup',
        'async function send',
        'async function* sse',
        'function createClientCore',
      ]);
    });
  });

  describe('each capability alone pulls exactly its module', () => {
    it('multipart', () => {
      const out = assembleInlineRuntime({ ...NONE, multipart: true });
      expect(out).toContain('function toFormData');
      expect(out).toContain(
        'createClientCore<Ops, Id, Path, Tag>(operations, config, { serializeMultipart: toFormData })'
      );
      expect(out).not.toContain('resolveToken');
      expect(out).not.toContain('parseSseFrame');
      expect(out).not.toContain('mergeSetup');
    });

    it('auth', () => {
      const out = assembleInlineRuntime({ ...NONE, auth: true });
      expect(out).toContain('async function resolveAuth');
      expect(out).toContain('resolveToken');
      expect(out).toContain(
        'createClientCore<Ops, Id, Path, Tag>(operations, config, { resolveAuth })'
      );
      expect(out).not.toContain('toFormData');
      expect(out).not.toContain('parseSseFrame');
      expect(out).not.toContain('mergeSetup');
    });

    it('sse', () => {
      const out = assembleInlineRuntime({ ...NONE, sse: true });
      expect(out).toContain('async function* sse');
      expect(out).toContain('parseSseFrame');
      expect(out).toContain('createClientCore<Ops, Id, Path, Tag>(operations, config, { sse })');
      expect(out).not.toContain('toFormData');
      expect(out).not.toContain('resolveToken');
      expect(out).not.toContain('mergeSetup');
    });

    it('setup (exported for the wiring, not a factory capability)', () => {
      const out = assembleInlineRuntime({ ...NONE, setup: true });
      expect(out).toContain('export function mergeSetup');
      expect(out).toContain('createClientCore<Ops, Id, Path, Tag>(operations, config, {})');
      expect(out).not.toContain('toFormData');
      expect(out).not.toContain('resolveToken');
      expect(out).not.toContain('parseSseFrame');
    });
  });

  describe('embedded type surface', () => {
    const out = assembleInlineRuntime(NONE);

    it('keeps every types.ts export (they replace package-mode type imports)', () => {
      expect(out).toContain('export type ClientConfig');
      expect(out).toContain('export type RequestOptions');
      expect(out).toContain('export type OperationDescriptor');
      expect(out).toContain(
        'export type Client<Ops extends OpsShape, Op extends OperationContext = OperationContext>'
      );
    });

    it('strips exports from internal types in non-types modules', () => {
      expect(out).toContain('type QueryStyle');
      expect(out).not.toContain('export type QueryStyle');
      expect(out).toContain('type SendCapabilities');
      expect(out).not.toContain('export type SendCapabilities');
      expect(out).toContain('type Capabilities');
      expect(out).not.toContain('export type Capabilities');
    });
  });

  it('is deterministic', () => {
    expect(assembleInlineRuntime(ALL)).toBe(assembleInlineRuntime(ALL));
    expect(assembleInlineRuntime(NONE)).toBe(assembleInlineRuntime(NONE));
  });

  it('assembles syntactically valid TypeScript (core-only and full)', () => {
    expect(parseErrors(assembleInlineRuntime(NONE))).toEqual([]);
    expect(parseErrors(assembleInlineRuntime(ALL))).toEqual([]);
  });
});
