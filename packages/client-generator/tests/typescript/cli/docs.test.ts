// Reference documentation end-to-end: `--docs` is one switch for the whole run, and each
// generator documents ITSELF — so the bar is that every selected generator with a page
// produced one, that no page appears without the switch, and that each page describes the
// artifact beside it (the CLI page against the CLI's own `--help`, an SDK page against the
// call syntax that SDK generates).

import { generateClient } from '@redocly/client-generator';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runTsx } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'openapi.yaml');

let dir: string;
let cliPage: string;
let pythonPage: string;

beforeAll(async () => {
  // The generated CLI validates with zod; copyConsumer links the repo's node_modules,
  // because this temp dir is outside the repo.
  dir = copyConsumer(join(__dirname, 'consumer-docs'));
  await generateClient({
    api: fixture,
    output: join(dir, 'cafe.client.ts'),
    generators: ['cli', 'python'],
    docs: true,
  });
  cliPage = readFileSync(join(dir, 'cafe.client.cli.md'), 'utf-8');
  pythonPage = readFileSync(join(dir, 'cafe.client.python.md'), 'utf-8');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('generate-client --docs (end-to-end)', () => {
  it('writes one page per selected generator that documents itself, and none for the rest', () => {
    // cli and python asked for; typescript and zod came in as prerequisites of cli, and
    // typescript documents itself too. zod has no page.
    expect(existsSync(join(dir, 'cafe.client.cli.md'))).toBe(true);
    expect(existsSync(join(dir, 'cafe.client.python.md'))).toBe(true);
    expect(existsSync(join(dir, 'cafe.client.typescript.md'))).toBe(true);
    expect(existsSync(join(dir, 'cafe.client.zod.md'))).toBe(false);
  });

  it('writes no page without the switch', async () => {
    const plain = mkdtempSync(join(tmpdir(), 'client-nodocs-'));
    try {
      await generateClient({ api: fixture, output: join(plain, 'c.ts'), generators: ['python'] });
      expect(existsSync(join(plain, 'c.py'))).toBe(true);
      expect(existsSync(join(plain, 'c.python.md'))).toBe(false);
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });

  it('documents every command the CLI dispatches, addressed exactly as --help shows it', async () => {
    const help = async (args: string[]): Promise<string> => {
      const result = await runTsx(join(dir, 'cafe.client.cli.ts'), [...args], { cwd: dir });
      expect(result.status, result.stderr).toBe(0);
      return result.stdout;
    };
    const entries = (text: string): string[] =>
      text
        .slice(text.indexOf('Commands:') + 'Commands:'.length, text.indexOf('Global flags:'))
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .map((line) => line.split(/\s{2,}/)[0]);

    const addresses: string[] = [];
    for (const entry of entries(await help(['--help']))) {
      if (entry.endsWith(' <command>')) {
        addresses.push(...entries(await help([entry.replace(' <command>', ''), '--help'])));
      } else {
        addresses.push(entry);
      }
    }
    expect(addresses.length).toBeGreaterThan(3);
    for (const address of addresses) {
      expect(cliPage, `${address} is missing from the reference page`).toContain(
        `### \`${address}\``
      );
    }
    expect(cliPage).toContain('CAFE_CLIENT_TOKEN');
    expect(cliPage).toContain('| 3 | validation error |');
  });

  it('shows each SDK page its own call syntax, taken from that generator', () => {
    expect(pythonPage).toContain('```python');
    expect(pythonPage).toContain('client.list_orders(');
    expect(pythonPage).toContain('| `status` | query |');
    expect(pythonPage).toContain('BearerAuth');
    // listOrders declares x-redoclyPagination, resolved by the helper the SDK uses.
    expect(pythonPage).toContain('This operation is paginated');
  });

  it('is well-formed Markdown: one H1, balanced fences, no tabs or trailing spaces', () => {
    for (const page of [cliPage, pythonPage]) {
      const lines = page.split('\n');
      expect(lines.filter((line) => line.startsWith('# '))).toHaveLength(1);
      expect(lines.filter((line) => line.startsWith('```')).length % 2).toBe(0);
      expect(page).not.toContain('\t');
      expect(lines.filter((line) => /\s$/.test(line))).toEqual([]);
      // A table must start after a blank line, or Markdown renders it as plain text.
      const tablesWithoutBlankLine: string[] = [];
      for (let index = 1; index < lines.length; index++) {
        const previous = lines[index - 1];
        if (lines[index].startsWith('|') && previous !== '' && !previous.startsWith('|')) {
          tablesWithoutBlankLine.push(lines[index]);
        }
      }
      expect(tablesWithoutBlankLine).toEqual([]);
    }
  });
});
