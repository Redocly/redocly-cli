import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { startServer } from './server-process.js';

async function unusedPort() {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const address = listener.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP address');
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  return address.port;
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    if (process.platform === 'win32') return true;
    return !execFileSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' })
      .trim()
      .startsWith('Z');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    throw error;
  }
}

test('readiness timeout terminates the server and its child', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'json-server-startup-'));
  const pidFile = join(directory, 'child.pid');
  const port = await unusedPort();
  const server = startServer(
    process.execPath,
    [
      '-e',
      `const { spawn } = require('node:child_process');
       const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
       require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
       require('node:http').createServer((_request, response) => {
         response.writeHead(503).end();
       }).listen(${port}, '127.0.0.1');`,
    ],
    `http://127.0.0.1:${port}`,
    750
  );
  try {
    await expect(server.ready).rejects.toThrow('Server did not become ready before the deadline');
    const childPid = Number(await readFile(pidFile, 'utf8'));
    expect(isAlive(server.child.pid!)).toBe(false);
    expect(isAlive(childPid)).toBe(false);
    await expect(fetch(`http://127.0.0.1:${port}`)).rejects.toThrow('fetch failed');
  } finally {
    await server.stop();
    await rm(directory, { recursive: true });
  }
}, 10_000);

test('termination escalates a resistant server and preserves an unrelated process', async () => {
  const sentinel = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
  const directory = await mkdtemp(join(tmpdir(), 'json-server-stop-'));
  const pidFile = join(directory, 'child.pid');
  const port = await unusedPort();
  const server = startServer(
    process.execPath,
    [
      '-e',
      `const { spawn } = require('node:child_process');
       process.on('SIGTERM', () => {});
       const child = spawn(process.execPath, ['-e',
         'process.send("ready"); setInterval(() => {}, 1000)'],
         { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
       child.once('message', () => {
         require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
         require('node:http').createServer((_request, response) => response.end('ready'))
           .listen(${port}, '127.0.0.1');
       });`,
    ],
    `http://127.0.0.1:${port}`
  );
  try {
    await server.ready;
    const childPid = Number(await readFile(pidFile, 'utf8'));
    expect(isAlive(childPid)).toBe(true);
    await server.stop();
    expect(isAlive(server.child.pid!)).toBe(false);
    expect(isAlive(childPid)).toBe(false);
    expect(isAlive(sentinel.pid!)).toBe(true);
    await expect(fetch(`http://127.0.0.1:${port}`)).rejects.toThrow('fetch failed');
  } finally {
    const sentinelClosed = once(sentinel, 'close');
    sentinel.kill('SIGKILL');
    await sentinelClosed;
    await server.stop();
    await rm(directory, { recursive: true });
  }
}, 10_000);

test('spawn errors fail startup without waiting for readiness', async () => {
  const missing = startServer('missing-json-server-command', [], 'http://127.0.0.1:1');
  await expect(missing.ready).rejects.toMatchObject({ code: 'ENOENT' });
  await missing.stop();
});
