import { HandledError } from '@redocly/openapi-core';
import { isValidReuniteUrl } from '@redocly/reunite-integration';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

const PROJECT_GIT_URL_PATTERN = /^(https?:\/\/[^/]+)\/api\/orgs\/[^/]+\/projects\/[^/]+\/git\/?$/;

export function buildProjectGitUrl(reuniteUrl: string, organization: string, project: string) {
  return `${reuniteUrl}/api/orgs/${encodeURIComponent(organization)}/projects/${encodeURIComponent(
    project
  )}/git`;
}

// Reunite URL of the first remote that points at a Redocly-hosted project.
export function findReuniteUrl(cwd: string): string | null {
  const result = spawnSync('git', ['config', '--get-regexp', '^remote\\..*\\.url$'], {
    cwd,
    encoding: 'utf-8',
  });

  if (result.error) {
    throw gitError(result.error);
  }
  if (result.status !== 0) {
    return null;
  }

  for (const line of result.stdout.split('\n')) {
    const [, url] = line.trim().match(/^\S+\s+(.+)$/) ?? [];
    const [, reuniteUrl] = url?.match(PROJECT_GIT_URL_PATTERN) ?? [];

    if (reuniteUrl && isValidReuniteUrl(reuniteUrl)) {
      return reuniteUrl;
    }
  }

  return null;
}

// Git config entries that make `redocly git credential` the only credential helper
// for the Reunite host. The empty entry clears the helpers configured for all hosts.
export function getCredentialHelperConfig(reuniteUrl: string, version: string): string[] {
  const key = `credential.${reuniteUrl}/.helper`;
  const cli = isOnPath('redocly') ? 'redocly' : `npx --yes @redocly/cli@${version}`;

  return [`${key}=`, `${key}=!REDOCLY_SUPPRESS_UPDATE_NOTICE=true ${cli} git credential`];
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
