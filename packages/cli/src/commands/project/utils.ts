import { HandledError } from '@redocly/openapi-core';
import { isValidReuniteUrl } from '@redocly/reunite-integration';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

// npx and pnpm dlx run the CLI from a temporary install that is gone once they exit.
const TEMPORARY_INSTALL_DIR = /[\\/](_npx|dlx)[\\/]/;
const PROJECT_GIT_URL = /^(https?:\/\/[^/]+)\/api\/orgs\/([^/]+)\/projects\/([^/]+)\/git\/?$/;

export function buildProjectGitUrl(reuniteUrl: string, organization: string, project: string) {
  return `${reuniteUrl}/api/orgs/${encodeURIComponent(organization)}/projects/${encodeURIComponent(
    project
  )}/git`;
}

// The parts of a URL built by `buildProjectGitUrl`; undefined for any other URL.
export function parseProjectGitUrl(url: string) {
  const [, reuniteUrl, organization, project] = url.match(PROJECT_GIT_URL) ?? [];
  if (!reuniteUrl || !organization || !project || !isValidReuniteUrl(reuniteUrl)) {
    return undefined;
  }

  return {
    reuniteUrl,
    organization: decodeURIComponent(organization),
    project: decodeURIComponent(project),
  };
}

// Git config entries that make `redocly project git-credentials` the only credential helper
// for the Reunite host. The empty entry clears the helpers configured for all hosts.
export function getCredentialHelperConfig(reuniteUrl: string, version: string): string[] {
  const key = `credential.${reuniteUrl}/.helper`;
  const ranFromTemporaryInstall = TEMPORARY_INSTALL_DIR.test(process.argv[1] ?? '');
  const cli =
    !ranFromTemporaryInstall && isOnPath('redocly')
      ? 'redocly'
      : `npx --yes @redocly/cli@${version}`;

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

// The trimmed output of a git command; undefined when git exits with an error.
export async function readGit(args: string[]): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';

    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', (error: NodeJS.ErrnoException) => reject(gitError(error)));
    child.on('close', (code) => resolve(code === 0 ? output.trim() : undefined));
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
