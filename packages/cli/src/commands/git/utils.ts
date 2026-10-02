import { HandledError } from '@redocly/openapi-core';
import { isValidReuniteUrl } from '@redocly/reunite-integration';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

export const PROJECT_GIT_URL_PATTERN =
  /^(https?:\/\/[^/]+)\/api\/orgs\/([^/]+)\/projects\/([^/]+)\/git\/?$/;

export type RedoclyRemote = {
  name: string;
  url: string;
  reuniteUrl: string;
  organization: string;
  project: string;
};

export function buildProjectGitUrl(reuniteUrl: string, organization: string, project: string) {
  return `${reuniteUrl}/api/orgs/${encodeURIComponent(organization)}/projects/${encodeURIComponent(
    project
  )}/git`;
}

export function findRedoclyRemote(cwd: string): RedoclyRemote | null {
  const result = spawnSync('git', ['config', '--get-regexp', '^remote\\..*\\.url$'], {
    cwd,
    encoding: 'utf-8',
  });

  assertGitInstalled(result.error);
  if (result.status !== 0) {
    return null;
  }

  for (const line of result.stdout.split('\n')) {
    const [, key, url] = line.trim().match(/^(\S+)\s+(.+)$/) ?? [];
    const match = url?.match(PROJECT_GIT_URL_PATTERN);

    if (key && url && match && isValidReuniteUrl(match[1])) {
      return {
        name: key.slice('remote.'.length, -'.url'.length),
        url,
        reuniteUrl: match[1],
        organization: match[2],
        project: match[3],
      };
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

    child.on('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'ENOENT' ? new HandledError('git is not installed or not on PATH.') : error
      );
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function isOnPath(command: string): boolean {
  const extensions = process.platform === 'win32' ? ['.cmd', '.exe'] : [''];

  return (process.env.PATH ?? '')
    .split(path.delimiter)
    .some((dir) => dir && extensions.some((ext) => existsSync(path.join(dir, command + ext))));
}

function assertGitInstalled(error: (Error & { code?: string }) | undefined) {
  if (error) {
    throw error.code === 'ENOENT'
      ? new HandledError('git is not installed or not on PATH.')
      : error;
  }
}
