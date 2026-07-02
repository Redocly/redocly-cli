import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const fixtures = join(__dirname, 'fixtures');

let upstream: Server;
let upstreamPort: number;
let workDir: string;

function startUpstream(): Promise<void> {
  return new Promise((resolve) => {
    upstream = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: req.url, method: req.method }));
      });
    });
    upstream.listen(0, '127.0.0.1', () => {
      upstreamPort = (upstream.address() as AddressInfo).port;
      resolve();
    });
  });
}

function waitForStderr(child: ChildProcessWithoutNullStreams, marker: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${marker}"`)), 15000);
    const onData = (data: Buffer) => {
      buffer += data.toString();
      const match = buffer.match(new RegExp(`${marker}(\\S+)`));
      if (match) {
        clearTimeout(timer);
        child.stderr.off('data', onData);
        resolve(match[1]);
      }
    };
    child.stderr.on('data', onData);
  });
}

async function poll(predicate: () => boolean, timeoutMs = 10000): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition.');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

beforeAll(async () => {
  await startUpstream();
  workDir = mkdtempSync(join(tmpdir(), 'redocly-proxy-'));
});

afterAll(() => {
  upstream?.close();
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true });
  }
});

describe('proxy - capture and live validation', () => {
  test('records traffic to a HAR file and reports drift on shutdown', async () => {
    const harPath = join(workDir, 'capture.har');
    const child = spawn(
      'node',
      [
        indexEntryPoint,
        'proxy',
        '--target',
        `http://127.0.0.1:${upstreamPort}`,
        '--port',
        '0',
        '--har',
        harPath,
        '--api',
        'openapi.yaml',
        '--rules',
        'undocumented-endpoint',
        '--format',
        'json',
      ],
      {
        cwd: fixtures,
        env: { ...process.env, NODE_ENV: 'test', NO_COLOR: 'TRUE', FORCE_COLOR: '0' },
      }
    ) as ChildProcessWithoutNullStreams;

    let stdout = '';
    child.stdout.on('data', (data) => (stdout += data.toString()));

    const proxyUrl = await waitForStderr(child, 'Proxy listening on ');

    await fetch(`${proxyUrl}/pets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'rex' }),
    });
    await fetch(`${proxyUrl}/pets/42`);

    const entriesPath = `${harPath}.entries.tmp`;
    await poll(() => {
      try {
        return readFileSync(entriesPath, 'utf8').split('\n').filter(Boolean).length === 2;
      } catch {
        return false;
      }
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      child.on('exit', (code) => resolve(code));
      child.kill('SIGINT');
    });

    expect(existsSync(entriesPath)).toBe(false);

    const har = JSON.parse(readFileSync(harPath, 'utf8'));
    const summary = har.log.entries.map(
      (entry: { request: { method: string; url: string } }) =>
        `${entry.request.method} ${new URL(entry.request.url).pathname}`
    );
    expect(summary).toEqual(['POST /pets', 'GET /pets/42']);
    expect(har.log.entries[0].request.postData.text).toBe('{"name":"rex"}');
    expect(har.log.entries[1].response.content.text).toContain('"ok":true');

    const report = JSON.parse(stdout);
    expect(report.run.totalExchanges).toBe(2);
    expect(report.run.documentedExchanges).toBe(1);
    expect(report.problems.map((problem: { ruleId: string }) => problem.ruleId)).toContain(
      'undocumented-endpoint'
    );

    // POST /pets is undocumented → error-level finding → non-zero exit.
    expect(exitCode).toBe(1);
  });
});
