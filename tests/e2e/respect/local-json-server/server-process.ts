import { spawn, execFile } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { promisify } from 'node:util';

export async function stopWindowsProcess(
  pid: number,
  terminate: (pid: number) => Promise<unknown> = (pid) =>
    promisify(execFile)('taskkill', ['/pid', String(pid), '/f', '/t'], {
      timeout: 5_000,
    }),
  probe: (pid: number) => unknown = (pid) => process.kill(pid, 0)
) {
  try {
    await terminate(pid);
  } catch (error) {
    if ((error as { code?: string | number }).code !== 128) throw error;
    try {
      probe(pid);
    } catch (probeError) {
      if ((probeError as NodeJS.ErrnoException).code === 'ESRCH') return;
      throw probeError;
    }
    throw error;
  }
}

export async function stopAndRestore(stop: (() => Promise<void>) | undefined, restore: () => void) {
  try {
    await stop?.();
  } finally {
    restore();
  }
}

export function startServer(
  command: string,
  args: string[],
  url: string,
  readinessTimeout = 30_000
) {
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  let closed = false;
  let spawnError: Error | undefined;
  child.once('error', (error) => (spawnError = error));
  child.once('close', () => (closed = true));

  function signalGroup(signal: NodeJS.Signals | 0) {
    try {
      // detached makes this child's PID the ID of its own process group.
      process.kill(-child.pid!, signal);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
      throw error;
    }
  }

  async function groupIsRunning() {
    if (!signalGroup(0)) return false;
    const { stdout } = await promisify(execFile)('ps', ['-eo', 'pgid=,stat='], {
      timeout: 1_000,
    });
    // Zombies have terminated; their parent owns reaping them.
    return stdout.split('\n').some((line) => {
      const [group, status] = line.trim().split(/\s+/);
      return group === String(child.pid) && !status.startsWith('Z');
    });
  }

  async function waitForStop(timeout: number) {
    const deadline = Date.now() + timeout;
    while (!closed || (process.platform !== 'win32' && (await groupIsRunning()))) {
      if (Date.now() >= deadline) return false;
      await setTimeout(25);
    }
    return true;
  }

  async function stopProcess() {
    if (!child.pid) return;
    if (process.platform === 'win32') {
      await stopWindowsProcess(child.pid);
    } else {
      signalGroup('SIGTERM');
      if (await waitForStop(2_000)) return;
      signalGroup('SIGKILL');
    }
    if (!(await waitForStop(5_000))) {
      throw new Error(`Server process group ${child.pid} did not terminate`);
    }
  }

  let stopping: Promise<void> | undefined;
  const stop = () => (stopping ??= stopProcess());

  async function waitForReady() {
    try {
      const deadline = Date.now() + readinessTimeout;
      for (;;) {
        if (spawnError) throw spawnError;
        if (closed) throw new Error('Server exited before becoming ready');
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error('Server did not become ready before the deadline');
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(remaining),
          });
          await response.body?.cancel();
          if (response.ok && !closed) return;
        } catch {
          // Retry connection failures until the readiness deadline.
        }
        await setTimeout(Math.min(200, remaining));
      }
    } catch (error) {
      try {
        await stop();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Server startup and cleanup failed');
      }
      throw error;
    }
  }

  return { child, stop, ready: waitForReady() };
}
