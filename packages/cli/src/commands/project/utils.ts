import { HandledError } from '@redocly/openapi-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

// npx and pnpm dlx run the CLI from a temporary install that is gone once they exit.
const TEMPORARY_INSTALL_DIR = /[\\/](_npx|dlx)[\\/]/;

// Git config entries that make `redocly project git-credentials` the only credential helper
// for the Reunite host. The empty entry clears the helpers configured for all hosts.
export function getCredentialHelperConfig(reuniteUrl: string, version: string): string[] {
  const key = `credential.${reuniteUrl}/.helper`;
  const ranFromTemporaryInstall = TEMPORARY_INSTALL_DIR.test(process.argv[1] ?? '');
  const cli =
    !ranFromTemporaryInstall && isOnPath('redocly')
      ? 'redocly'
      : `npx --yes @redocly/cli@${version}`;

  return [`${key}=`, `${key}=!REDOCLY_SUPPRESS_NOTIFICATIONS=true ${cli} project git-credentials`];
}

// With `capture`, git's standard output is returned trimmed instead of printed, and its errors are
// dropped; otherwise `output` is empty.
export async function runGit(
  args: string[],
  { capture = false } = {}
): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      stdio: capture ? ['ignore', 'pipe', 'ignore'] : 'inherit',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    let output = '';

    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', (error: NodeJS.ErrnoException) => reject(gitError(error)));
    child.on('close', (code) => resolve({ code: code ?? 1, output: output.trim() }));
  });
}

function isOnPath(command: string): boolean {
  const extensions = process.platform === 'win32' ? ['.cmd', '.exe'] : [''];

  return (process.env.PATH ?? '')
    .split(path.delimiter)
    .some((dir) => dir && extensions.some((ext) => existsSync(path.join(dir, command + ext))));
}

function gitError(error: NodeJS.ErrnoException) {
  return error.code === 'ENOENT' ? new HandledError('git is not installed or not on PATH.') : error;
}
