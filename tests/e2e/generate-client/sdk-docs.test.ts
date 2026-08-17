// The sdk-docs generator end-to-end: one page per selected SDK, and each page must show
// the call syntax of the SDK beside it — so the bar is the snippet each language
// generator produces, not a snippet this test invents.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cli.yaml');

let dir: string;
let python: string;
let go: string;

vi.setConfig({ testTimeout: 120_000 });

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'sdk-docs-'));
  generate(fixture, join(dir, 'cafe.client.ts'), [
    '--generator',
    'python',
    '--generator',
    'go',
    '--generator',
    'sdk-docs',
  ]);
  python = readFileSync(join(dir, 'cafe.client.python.md'), 'utf-8');
  go = readFileSync(join(dir, 'cafe.client.go.md'), 'utf-8');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('generate-client sdk-docs generator (end-to-end)', () => {
  it('writes one page per selected SDK, and none for an SDK that is not selected', () => {
    expect(existsSync(join(dir, 'cafe.client.python.md'))).toBe(true);
    expect(existsSync(join(dir, 'cafe.client.go.md'))).toBe(true);
    expect(existsSync(join(dir, 'cafe.client.typescript.md'))).toBe(false);
    expect(existsSync(join(dir, 'cafe.client.php.md'))).toBe(false);
  });

  it('documents every operation, grouped by tag, with its method and path', () => {
    for (const page of [python, go]) {
      expect(page).toContain('## orders');
      for (const operation of ['listOrders', 'createOrder', 'getOrder', 'ping']) {
        expect(page).toContain(`### \`${operation}\``);
      }
      expect(page).toContain('`GET /orders/{orderId}`');
    }
  });

  it('shows each language its own call syntax, taken from that generator', () => {
    expect(python).toContain('```python');
    expect(python).toContain('client.list_orders(');
    expect(go).toContain('```go');
    expect(go).toContain('client.ListOrders(');
    // Each page carries one language: the Python page never shows the Go call.
    expect(python).not.toContain('client.ListOrders(');
    expect(go).not.toContain('client.list_orders(');
  });

  it('notes the behavior an SDK call has beyond a plain JSON request', () => {
    // listOrders declares x-redoclyPagination; the note must come from the resolver the
    // language SDKs use, so a page never disagrees with the SDK next to it.
    expect(python).toContain('This operation is paginated');
    expect(go).toContain('This operation is paginated');

    const streaming = mkdtempSync(join(tmpdir(), 'sdk-docs-sse-'));
    try {
      generate(join(__dirname, 'fixtures/sse.yaml'), join(streaming, 'client.ts'), [
        '--generator',
        'python',
        '--generator',
        'sdk-docs',
      ]);
      expect(readFileSync(join(streaming, 'client.python.md'), 'utf-8')).toContain(
        'streams server-sent events'
      );
    } finally {
      rmSync(streaming, { recursive: true, force: true });
    }
  });

  it('carries the parameters, the body, and the security schemes from the description', () => {
    expect(python).toContain('| `status` | query |');
    expect(python).toContain('| `orderId` | path |');
    expect(python).toContain('application/json');
    expect(python).toContain('BearerAuth');
  });

  it('fails with the fix in the message when no SDK is selected', () => {
    expect(() => generate(fixture, join(dir, 'alone.ts'), ['--generator', 'sdk-docs'])).toThrow(
      /also select/
    );
  });

  it('is well-formed Markdown: one H1, balanced fences, no tabs or trailing spaces', () => {
    const lines = python.split('\n');
    expect(lines.filter((line) => line.startsWith('# '))).toHaveLength(1);
    expect(lines.filter((line) => line.startsWith('```')).length % 2).toBe(0);
    expect(python).not.toContain('\t');
    expect(lines.filter((line) => /\s$/.test(line))).toEqual([]);
    for (let index = 1; index < lines.length; index++) {
      if (lines[index].startsWith('|') && lines[index - 1] !== '') {
        expect(lines[index - 1].startsWith('|')).toBe(true);
      }
    }
  });
});
