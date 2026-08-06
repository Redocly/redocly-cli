// The cli-docs generator end-to-end: the page it writes must describe the CLI that ships
// beside it, so the bar is a comparison against the generated CLI's own `--help`.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, repoRoot, tsxBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cli.yaml');

let dir: string;
let page: string;

// Generating and spawning the CLI through tsx can approach the 5s default under load.
vi.setConfig({ testTimeout: 120_000 });

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'cli-docs-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  // The CLI validates with zod, and this temp dir is outside the repo: borrow its modules.
  symlinkSync(join(repoRoot, 'node_modules'), join(dir, 'node_modules'), 'dir');
  // `cli-docs` pulls in the CLI it documents, so this one flag is the whole selection.
  generate(fixture, join(dir, 'cafe.client.ts'), ['--generator', 'cli-docs']);
  page = readFileSync(join(dir, 'cafe.client.cli.md'), 'utf-8');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('generate-client cli-docs generator (end-to-end)', () => {
  it('emits the page beside the CLI it documents, pulling the CLI in on its own', () => {
    expect(existsSync(join(dir, 'cafe.client.cli.ts'))).toBe(true);
    expect(existsSync(join(dir, 'cafe.client.cli.md'))).toBe(true);
  });

  it('documents every command the CLI dispatches, addressed exactly as --help shows it', () => {
    const help = (args: string[]): string => {
      const result = spawnSync(tsxBin, [join(dir, 'cafe.client.cli.ts'), ...args], {
        cwd: dir,
        encoding: 'utf-8',
      });
      expect(result.status, result.stderr).toBe(0);
      return result.stdout;
    };
    /** The `Commands:` block of a help screen, one entry per line, summaries stripped. */
    const entries = (text: string): string[] =>
      text
        .slice(text.indexOf('Commands:') + 'Commands:'.length, text.indexOf('Global flags:'))
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .map((line) => line.split(/\s{2,}/)[0]);

    // Top-level help lists groups (`orders <command>`) and any ungrouped command; each
    // group's own help lists its commands. Walk both levels, so nothing is assumed.
    const addresses: string[] = [];
    for (const entry of entries(help(['--help']))) {
      if (entry.endsWith(' <command>')) {
        addresses.push(...entries(help([entry.replace(' <command>', ''), '--help'])));
      } else {
        addresses.push(entry);
      }
    }

    expect(addresses.length).toBeGreaterThan(3);
    for (const address of addresses) {
      expect(page, `${address} is missing from the reference page`).toContain(`### \`${address}\``);
    }
  });

  it('carries the credential variables and exit codes the CLI actually uses', () => {
    // The env prefix is derived from the same stem the CLI derives it from.
    expect(page).toContain('CAFE_CLIENT_TOKEN');
    expect(page).toContain('| 3 | validation error |');
  });

  it('is well-formed Markdown: one H1, balanced fences, no tabs or trailing spaces', () => {
    const lines = page.split('\n');
    expect(lines.filter((line) => line.startsWith('# '))).toHaveLength(1);
    expect(lines.filter((line) => line.startsWith('```')).length % 2).toBe(0);
    expect(page).not.toContain('\t');
    expect(lines.filter((line) => /\s$/.test(line))).toEqual([]);
    // A heading and a table never sit on adjacent lines — markdownlint (MD022/MD058) and
    // most renderers need the blank line.
    for (let index = 1; index < lines.length; index++) {
      if (lines[index].startsWith('|') && lines[index - 1] !== '') {
        expect(lines[index - 1].startsWith('|')).toBe(true);
      }
    }
  });
});
