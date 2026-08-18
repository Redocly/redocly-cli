import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cliEntry, generate, killServer, startServer } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');
const consumerDir = join(__dirname, 'python-consumer');
const generatedFile = join(consumerDir, 'client.py');

const SERVER_PORT = 3106;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

const hasPython = spawnSync('python3', ['--version']).status === 0;
const hasHttpx = hasPython && spawnSync('python3', ['-c', 'import httpx']).status === 0;
const hasPydantic = hasPython && spawnSync('python3', ['-c', 'import pydantic']).status === 0;

describe('generate-client python generator (end-to-end)', () => {
  afterAll(() => {
    rmSync(generatedFile, { force: true });
    rmSync(join(consumerDir, '__pycache__'), { recursive: true, force: true });
  });

  it('generates a self-contained client.py from the CLI', () => {
    generate(fixture, join(consumerDir, 'client.ts'), ['--generator', 'python']);
    expect(existsSync(generatedFile)).toBe(true);
  });

  it.skipIf(!hasPython)('the generated client is valid Python', () => {
    const result = spawnSync('python3', ['-m', 'py_compile', generatedFile], {
      encoding: 'utf-8',
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it.skipIf(!hasHttpx)(
    'runs real HTTP against the mock server: hydration, bodies, ApiError',
    async () => {
      let serverProcess: ChildProcess | undefined;
      try {
        serverProcess = await startServer(
          join(__dirname, 'base-consumer/server.ts'),
          join(__dirname, 'base-consumer'),
          { BASE_SERVER_PORT: String(SERVER_PORT) },
          SERVER_BASE,
          'python-smoke-server'
        );
        const result = spawnSync(
          'python3',
          [join(consumerDir, 'smoke.py'), generatedFile, SERVER_BASE],
          { encoding: 'utf-8' }
        );
        expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('PYTHON_SMOKE_OK');
      } finally {
        if (serverProcess) await killServer(serverProcess);
      }
    },
    60_000
  );
});

describe('generate-client python generator, models: pydantic (end-to-end)', () => {
  // `models` is config-only, like every per-generator option, so this drives a config file.
  let dir: string;
  let generated: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'python-pydantic-'));
    writeFileSync(
      join(dir, 'redocly.yaml'),
      [
        'apis:',
        '  cafe:',
        `    root: ${join(__dirname, 'fixtures/cafe.yaml')}`,
        '    clientOutput: ./client.ts',
        '    client:',
        '      generators: [python]',
        '      options:',
        '        python:',
        '          models: pydantic',
      ].join('\n'),
      'utf-8'
    );
    const result = spawnSync('node', [cliEntry, 'generate-client'], {
      cwd: dir,
      encoding: 'utf-8',
    });
    expect(result.status, result.stderr).toBe(0);
    generated = join(dir, 'client.py');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits BaseModel classes and names pydantic in the header', () => {
    const source = readFileSync(generated, 'utf-8');
    expect(source).toContain('pip install httpx pydantic');
    expect(source).toContain('from pydantic import BaseModel, ConfigDict, Field');
    expect(source).toContain('(BaseModel):');
    // The client and the runtime are the same in both model modes.
    expect(source).toContain('class Client:');
    expect(source).toContain('def decode(');
  });

  it.skipIf(!hasPython)('the generated client is valid Python', () => {
    const result = spawnSync('python3', ['-m', 'py_compile', generated], { encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
  });

  it.skipIf(!hasPydantic)('decodes wire names through aliases and encodes them back', () => {
    // One round trip proves the three pieces of this mode: the alias, the runtime
    // dispatch to pydantic, and `by_alias` on the way out.
    const script = [
      'import json, sys',
      `sys.path.insert(0, ${JSON.stringify(dir)})`,
      'import client',
      'wire = {"customerName": "Sam", "orderItems": [], "id": "ord_1", "totalPrice": 900}',
      'order = client.decode(client.Order, wire)',
      'assert type(order).__name__ == "Order", type(order)',
      // The wire name arrives on the aliased field, and leaves on the alias again.
      'assert order.customer_name == "Sam", order',
      'assert order.total_price == 900, order',
      'assert client.encode(order) == wire, client.encode(order)',
      // A required field missing must fail loudly: that is what this mode buys.
      'import pydantic',
      'try:',
      '    client.decode(client.Order, {"id": "ord_1"})',
      '    raise AssertionError("expected a validation error")',
      'except pydantic.ValidationError:',
      '    pass',
      'print("PYDANTIC_ROUND_TRIP_OK")',
    ].join('\n');
    const result = spawnSync('python3', ['-c', script], { encoding: 'utf-8' });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('PYDANTIC_ROUND_TRIP_OK');
  });
});
