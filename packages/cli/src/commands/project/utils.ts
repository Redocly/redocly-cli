import { HandledError } from '@redocly/openapi-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

export function buildProjectGitUrl(reuniteUrl: string, organization: string, project: string) {
  return `${reuniteUrl}/api/orgs/${encodeURIComponent(organization)}/projects/${encodeURIComponent(
    project
  )}/git`;
}

// Git config entries that make `redocly project git-credentials` the only credential helper
// for the Reunite host. The empty entry clears the helpers configured for all hosts.
export function getCredentialHelperConfig(reuniteUrl: string, version: string): string[] {
  const key = `credential.${reuniteUrl}/.helper`;
  const cli = isOnPath('redocly') ? 'redocly' : `npx --yes @redocly/cli@${version}`;

  return [`${key}=`, `${key}=!REDOCLY_SUPPRESS_UPDATE_NOTICE=true ${cli} project git-credentials`];
}

export async function runGit(args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      stdio: 'inherit',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });

    child.on('error', (error: NodeJS.ErrnoException) => reject(gitError(error)));
    child.on('close', (code) => resolve(code ?? 1));
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
