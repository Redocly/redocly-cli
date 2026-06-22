// Security regression: a hostile OpenAPI document must never inject executable code
// into the generated client. `ts.factory.createIdentifier` prints names verbatim and
// JSDoc text is emitted as comments, so operationIds / schema names / descriptions
// carrying `(){};`, `export`, or `*/` are the attack surface. The generator must
// sanitize names and escape comments such that the output is inert and strict-`tsc`
// clean — every payload trapped inside an identifier or a comment, never a statement.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');

const HOSTILE_SPEC = `openapi: 3.1.0
info:
  title: "Evil */ ;globalThis.PWNED_TITLE=1; /*"
  version: "1.0.0"
  description: "desc */ ;globalThis.PWNED_DESC=1; /*"
servers: [{ url: https://api.example.com }]
paths:
  /x:
    get:
      operationId: "foo(a){}; globalThis.PWNED_OPID=1; export async function bar"
      security:
        - "k(){}; globalThis.PWNED_KEY=1; export const z": []
      responses:
        '200':
          description: "ok */ ;globalThis.PWNED_RESP=1; /*"
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Thing' }
components:
  securitySchemes:
    "k(){}; globalThis.PWNED_KEY=1; export const z":
      type: apiKey
      in: header
      name: X-Api-Key
    other:
      type: apiKey
      in: header
      name: X-Other
  schemas:
    Thing:
      description: "schema */ ;globalThis.PWNED_SCHEMA=1; /*"
      type: object
      properties:
        n: { type: integer }
`;

describe('generate-client identifier / comment injection', () => {
  it('sanitizes hostile names and escapes comments; output is strict-tsc clean', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-injection-'));
    writeFileSync(join(dir, 'openapi.yaml'), HOSTILE_SPEC, 'utf-8');
    const entry = join(dir, 'client.ts');
    const res = spawnSync(
      'node',
      [cli, 'generate-client', join(dir, 'openapi.yaml'), '--output', entry],
      {
        encoding: 'utf-8',
        cwd: repoRoot,
      }
    );
    expect(res.status, res.stderr).toBe(0);
    // The unsafe operationId is reported and rewritten, not silently accepted.
    expect(res.stderr).toMatch(/is not a valid TypeScript identifier/);

    const src = readFileSync(entry, 'utf-8');
    // No live comment-breakout: the payload's `*/` is neutralized to `*\/`.
    expect(src).not.toMatch(/\*\/\s*;globalThis/);
    // No payload survives as a top-level statement (only inside identifiers/comments).
    expect(src).not.toMatch(/^\s*globalThis\.PWNED/m);
    // The function name became a single valid identifier (no parens/spaces/semicolons).
    expect(src).toMatch(/export async function [A-Za-z_$][A-Za-z0-9_$]*\(/);

    // Strongest proof: the whole file type-checks. Injected statements would not.
    const tsc = spawnSync(
      tscBin,
      [
        '--noEmit',
        '--strict',
        '--target',
        'ES2020',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--lib',
        'ES2020,DOM',
        entry,
      ],
      { encoding: 'utf-8', cwd: dir }
    );
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
