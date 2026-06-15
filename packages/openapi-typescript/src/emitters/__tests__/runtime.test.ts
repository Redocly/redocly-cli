import { renderRuntime, runtimeStatements, PUBLIC_RUNTIME_TYPES } from '../runtime.js';
import { printStatements } from '../ts.js';

describe('renderRuntime — shared core + terminal selection', () => {
  describe('throw mode (default)', () => {
    it('emits __send, __parse, and __request<T> and no result terminal', () => {
      const out = renderRuntime('https://api.example.com', false, false);
      expect(out).toContain('async function __send(');
      expect(out).toContain('async function __parse(');
      expect(out).toContain('async function __request<T>(');
      expect(out).not.toContain('__requestResult');
      expect(out).not.toContain('export type Result<');
    });

    it("treats an explicit 'throw' identically to the default", () => {
      expect(renderRuntime('https://api.example.com', false, false, 'throw')).toBe(
        renderRuntime('https://api.example.com', false, false)
      );
    });
  });

  describe('runtimeStatements', () => {
    it('returns parsed statements that print to the same source renderRuntime emits', () => {
      const statements = runtimeStatements('https://api.example.com', false, false);
      expect(statements.length).toBeGreaterThan(0);
      expect(printStatements(statements)).toBe(
        renderRuntime('https://api.example.com', false, false)
      );
    });

    it('defaults errorMode to throw (emits __request, not __requestResult)', () => {
      const out = printStatements(runtimeStatements('https://api.example.com', false, false));
      expect(out).toContain('async function __request<T>(');
      expect(out).not.toContain('__requestResult');
    });
  });

  describe('result mode', () => {
    const out = renderRuntime('https://api.example.com', false, true, 'result');

    it('emits __send, __parse, the Result type, and __requestResult', () => {
      expect(out).toContain('async function __send(');
      expect(out).toContain('async function __parse(');
      expect(out).toContain('export type Result<TData, TError>');
      expect(out).toContain('async function __requestResult<TData, TError>(');
    });

    it('does not emit the throwing terminal', () => {
      expect(out).not.toContain('async function __request<T>(');
    });
  });

  describe('shared surface present in both modes', () => {
    const cases: Array<['throw' | 'result', string]> = [
      ['throw', renderRuntime('https://api.example.com', true, true, 'throw')],
      ['result', renderRuntime('https://api.example.com', true, true, 'result')],
    ];
    it.each(cases)('keeps retry helpers + ApiError + header helper in %s mode', (_mode, out) => {
      expect(out).toContain('function __defaultRetryOn(');
      expect(out).toContain('function __retryDelay(');
      expect(out).toContain('function __sleep(');
      expect(out).toContain('function __abortError(');
      expect(out).toContain('class ApiError extends Error');
      expect(out).toContain('async function readError(');
      expect(out).toContain('function __headers(');
    });
  });

  it('honors the export prefix for __send/__parse and the terminal', () => {
    const exported = renderRuntime('https://api.example.com', false, true);
    expect(exported).toContain('export async function __send(');
    expect(exported).toContain('export async function __parse(');
    expect(exported).toContain('export async function __request<T>(');

    const inlined = renderRuntime('https://api.example.com', false, false);
    expect(inlined).toContain('async function __send(');
    expect(inlined).not.toContain('export async function __send(');
  });

  it('documents onError as throw-mode only', () => {
    const out = renderRuntime('https://api.example.com', false, false);
    expect(out).toContain('(throw mode only)');
  });

  describe('__buildUrl query serialization styles', () => {
    const out = renderRuntime('https://api.example.com', false, false);

    it('accepts an optional per-key styles spec as the 4th param', () => {
      expect(out).toContain("style: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'");
      expect(out).toContain('explode: boolean');
      expect(out).toContain('allowReserved?: boolean');
      expect(out).toContain('const spec = styles?.[key];');
    });

    it('keeps the default branch (no spec) byte-identical to the unstyled path', () => {
      // The pre-styles repeat/deepObject/scalar behavior, reached when spec is absent.
      // The printer reflows `if (cond) stmt;` onto two lines, so assert the parts.
      expect(out).toContain('if (!spec) {');
      expect(out).toContain('if (v !== undefined && v !== null)');
      expect(out).toContain('params.append(key, String(v));');
      expect(out).toContain('params.append(`${key}[${subKey}]`, String(subValue));');
    });

    it('emits the delimited-array branches with literal delimiters', () => {
      // The delimiter goes on the wire LITERAL; only values are encoded.
      // pipeDelimited → '|', spaceDelimited → '%20' (NOT '+'), form non-explode → ','.
      expect(out).toContain(
        "const delim = spec.style === 'pipeDelimited' ? '|' : spec.style === 'spaceDelimited' ? '%20' : ',';"
      );
      // Each value is encoded individually, then joined with the literal delimiter
      // and pushed to `raw` — NOT run through params.append(key, joined).
      expect(out).toContain(
        'const enc = spec.allowReserved ? __encodeReserved : encodeURIComponent;'
      );
      expect(out).toContain(
        'raw.push(`${encodeURIComponent(key)}=${items.map(enc).join(delim)}`);'
      );
      expect(out).not.toContain('const joined = items.join(sep);');
      expect(out).not.toContain('params.append(key, joined)');
      expect(out).toContain("if (spec.style === 'form' && spec.explode)");
    });

    it('emits allowReserved handling that preserves reserved chars', () => {
      expect(out).toContain('allowReserved');
      // A helper that encodes everything except the RFC-3986 reserved set, plus
      // raw query pieces appended after URLSearchParams.toString().
      expect(out).toContain('function __encodeReserved(');
      expect(out).toContain('const raw: string[] = [];');
    });

    it('assembles params + raw allowReserved pieces into the final query string', () => {
      expect(out).toContain("const qs = [params.toString(), ...raw].filter(Boolean).join('&');");
      expect(out).toContain('return qs ? `${url}?${qs}` : url;');
    });
  });

  describe('parseAs escape hatch', () => {
    it("lists 'ParseAs' in PUBLIC_RUNTIME_TYPES", () => {
      expect(PUBLIC_RUNTIME_TYPES).toContain('ParseAs');
    });

    it('emits the ParseAs union type and parseAs on RequestOptions', () => {
      const out = renderRuntime('https://api.example.com', false, false);
      expect(out).toContain(
        "export type ParseAs = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream' | 'auto';"
      );
      // The printer reflows the `RequestOptions` type literal across lines.
      expect(out).toContain('export type RequestOptions = RequestInit & {');
      expect(out).toContain('retry?: Partial<RetryConfig>;');
      expect(out).toContain('parseAs?: ParseAs;');
    });

    it('extends __parse to accept ParseAs | void and decode every kind', () => {
      const out = renderRuntime('https://api.example.com', false, false);
      // The printer splits single-line `if (cond) return x;` onto two lines; assert
      // each condition and its return value survive (semantics preserved, layout reflowed).
      expect(out).toContain("kind: ParseAs | 'void'");
      expect(out).toContain("if (kind === 'void' || response.status === 204)");
      expect(out).toContain('return undefined;');
      expect(out).toContain("if (kind === 'stream')");
      expect(out).toContain('return response.body;');
      expect(out).toContain("if (kind === 'blob')");
      expect(out).toContain("if (kind === 'arrayBuffer')");
      expect(out).toContain('return response.arrayBuffer();');
      expect(out).toContain("if (kind === 'formData')");
      expect(out).toContain('return response.formData();');
      expect(out).toContain("if (kind === 'text')");
      expect(out).toContain('return response.text();');
      expect(out).toContain("if (kind === 'json')");
      expect(out).toContain('return response.json();');
      // 'auto' sniff branch — json → text/ → blob
      expect(out).toContain("if (contentType.toLowerCase().includes('json'))");
      expect(out).toContain("if (contentType.startsWith('text/'))");
      expect(out).toContain('return response.blob();');
    });

    const terminals: Array<['throw' | 'result', string, string]> = [
      [
        'throw',
        renderRuntime('https://api.example.com', false, false, 'throw'),
        'const { response, context } = await __send(config, url, sendInit, body);',
      ],
      [
        'result',
        renderRuntime('https://api.example.com', false, true, 'result'),
        'const { response } = await __send(config, url, sendInit, body);',
      ],
    ];
    it.each(terminals)(
      'in %s mode strips parseAs before __send and maps the default kind',
      (_mode, out, sendLine) => {
        expect(out).toContain('const { parseAs, ...sendInit } = init;');
        expect(out).toContain(sendLine);
        expect(out).toContain(
          "const kind = parseAs ?? (responseKind === 'json' ? 'auto' : responseKind);"
        );
        expect(out).toContain('__parse(response, kind)');
        expect(out).not.toContain('__parse(response, responseKind)');
      }
    );
  });

  describe('SSE runtime (gated on needsSse)', () => {
    it('omits all SSE surface when needsSse is false', () => {
      const out = renderRuntime('https://api.example.com', false, false, 'throw', false);
      expect(out).not.toContain('__sse');
      expect(out).not.toContain('ServerSentEvent');
      expect(out).not.toContain('SseOptions');
    });

    it('emits ServerSentEvent, SseOptions, and __sse when needsSse is true', () => {
      const out = renderRuntime('https://api.example.com', false, false, 'throw', true);
      // The printer reflows type literals across lines; assert the parts survive.
      expect(out).toContain('export type ServerSentEvent<T> = {');
      expect(out).toContain('event?: string;');
      expect(out).toContain('data: T;');
      expect(out).toContain('id?: string;');
      expect(out).toContain('retry?: number;');
      expect(out).toContain('export type SseOptions = RequestInit & {');
      expect(out).toContain('reconnect?: boolean;');
      expect(out).toContain('reconnectDelay?: number;');
      expect(out).toContain('async function* __sse<T>(');
      expect(out).toContain("dataKind: 'json' | 'text' = 'text'");
      expect(out).toContain('AsyncGenerator<ServerSentEvent<T>>');
      expect(out).toContain("Accept: 'text/event-stream'");
      expect(out).toContain("'Last-Event-ID'");
      expect(out).toContain('getReader()');
      expect(out).toContain('new TextDecoder()');
      expect(out).toContain('__parseSseFrame');
      expect(out).toContain('JSON.parse');
    });

    it('exports __sse in multi-file but keeps __parseSseFrame module-private', () => {
      const out = renderRuntime('https://api.example.com', false, true, 'throw', true);
      expect(out).toContain('export async function* __sse');
      expect(out).not.toContain('export function __parseSseFrame');
      expect(out).not.toContain('export async function __parseSseFrame');
    });
  });
});
