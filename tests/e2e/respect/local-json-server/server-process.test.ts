import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  startServer,
  stopWindowsProcess,
  stopAndRestore,
} from "./server-process.js";

async function unusedPort() {
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  if (!address || typeof address === "string")
    throw new Error("Expected a TCP address");
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  return address.port;
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    if (process.platform === "win32") return true;
    return !execFileSync("ps", ["-o", "stat=", "-p", String(pid)], {
      encoding: "utf8",
    })
      .trim()
      .startsWith("Z");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

test("readiness timeout terminates the server and its child", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-server-startup-"));
  const pidFile = join(directory, "child.pid");
  const port = await unusedPort();
  const server = startServer(
    process.execPath,
    [
      "-e",
      `const { spawn } = require('node:child_process');
       const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
       require('node:fs').writeFileSync(${JSON.stringify(
         pidFile
       )}, String(child.pid));
       require('node:http').createServer((_request, response) => {
         response.writeHead(503).end();
       }).listen(${port}, '127.0.0.1');`,
    ],
    `http://127.0.0.1:${port}`,
    750
  );
  try {
    await expect(server.ready).rejects.toThrow(
      "Server did not become ready before the deadline"
    );
    const childPid = Number(await readFile(pidFile, "utf8"));
    expect(isAlive(server.child.pid!)).toBe(false);
    expect(isAlive(childPid)).toBe(false);
    await expect(fetch(`http://127.0.0.1:${port}`)).rejects.toThrow(
      "fetch failed"
    );
  } finally {
    await server.stop();
    await rm(directory, { recursive: true });
  }
}, 10_000);

test("termination escalates a resistant server and preserves an unrelated process", async () => {
  const sentinel = spawn(process.execPath, [
    "-e",
    "setInterval(() => {}, 1000)",
  ]);
  const directory = await mkdtemp(join(tmpdir(), "json-server-stop-"));
  const pidFile = join(directory, "child.pid");
  const port = await unusedPort();
  const server = startServer(
    process.execPath,
    [
      "-e",
      `const { spawn } = require('node:child_process');
       process.on('SIGTERM', () => {});
       const child = spawn(process.execPath, ['-e',
         'process.send("ready"); setInterval(() => {}, 1000)'],
         { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
       child.once('message', () => {
         require('node:fs').writeFileSync(${JSON.stringify(
           pidFile
         )}, String(child.pid));
         require('node:http').createServer((_request, response) => response.end('ready'))
           .listen(${port}, '127.0.0.1');
       });`,
    ],
    `http://127.0.0.1:${port}`
  );
  try {
    await server.ready;
    const childPid = Number(await readFile(pidFile, "utf8"));
    expect(isAlive(childPid)).toBe(true);
    await server.stop();
    expect(isAlive(server.child.pid!)).toBe(false);
    expect(isAlive(childPid)).toBe(false);
    expect(isAlive(sentinel.pid!)).toBe(true);
    await expect(fetch(`http://127.0.0.1:${port}`)).rejects.toThrow(
      "fetch failed"
    );
  } finally {
    const sentinelClosed = once(sentinel, "close");
    sentinel.kill("SIGKILL");
    await sentinelClosed;
    await server.stop();
    await rm(directory, { recursive: true });
  }
}, 10_000);

test("spawn errors fail startup without waiting for readiness", async () => {
  const missing = startServer(
    "missing-json-server-command",
    [],
    "http://127.0.0.1:1"
  );
  await expect(missing.ready).rejects.toMatchObject({ code: "ENOENT" });
  await missing.stop();
});

test("natural exit preserves its readiness failure and repeated stop", async () => {
  const server = startServer(
    process.execPath,
    ["-e", "process.exit(0)"],
    "http://127.0.0.1:1"
  );
  await expect(server.ready).rejects.toThrow(
    "Server exited before becoming ready"
  );
  const first = server.stop();
  expect(server.stop()).toBe(first);
  await first;
  expect(isAlive(server.child.pid!)).toBe(false);
});

test("mocked Windows missing PID needs both taskkill 128 and ESRCH", async () => {
  const error = Object.assign(new Error("not found"), { code: 128 });
  const terminate = vi.fn().mockRejectedValue(error);
  const probe = vi.fn(() => {
    throw Object.assign(new Error("gone"), { code: "ESRCH" });
  });
  await stopWindowsProcess(123, terminate, probe);
  expect(probe).toHaveBeenCalledWith(123);
  await expect(stopWindowsProcess(123, terminate, () => true)).rejects.toBe(
    error
  );
  await expect(
    stopWindowsProcess(123, terminate, () => {
      throw Object.assign(new Error("denied"), { code: "EPERM" });
    })
  ).rejects.toMatchObject({ code: "EPERM" });
});

test.each(["ENOENT", "EPERM", "ETIMEDOUT"])(
  "mocked Windows %s stays a failure",
  async (code) => {
    const error = Object.assign(new Error(code), { code });
    const probe = vi.fn(() => {
      throw Object.assign(new Error("gone"), { code: "ESRCH" });
    });
    await expect(
      stopWindowsProcess(123, vi.fn().mockRejectedValue(error), probe)
    ).rejects.toBe(error);
    expect(probe).not.toHaveBeenCalled();
  }
);

test("mocked Windows successful taskkill does not need a missing-PID probe", async () => {
  const probe = vi.fn();
  await stopWindowsProcess(123, vi.fn().mockResolvedValue(undefined), probe);
  expect(probe).not.toHaveBeenCalled();
});

test("restores original bytes even when stopping fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "json-server-restore-"));
  const file = join(directory, "fake-db.json");
  const original = '{"items":[1]}\n';
  const failure = new Error("stop failed");
  await writeFile(file, "mutated");
  try {
    await expect(
      stopAndRestore(
        async () => {
          throw failure;
        },
        () => {
          writeFileSync(file, original);
        }
      )
    ).rejects.toBe(failure);
    expect(await readFile(file, "utf8")).toBe(original);
  } finally {
    await rm(directory, { recursive: true });
  }
});
