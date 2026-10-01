import { HandledError } from '@redocly/openapi-core';
import { RedoclyOAuthClient } from '@redocly/reunite-integration';
import { spawn, spawnSync } from 'node:child_process';

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

  if (result.error || result.status !== 0) {
    return null;
  }

  for (const line of result.stdout.split('\n')) {
    const [, key, url] = line.trim().match(/^(\S+)\s+(.+)$/) ?? [];
    const match = url?.match(PROJECT_GIT_URL_PATTERN);

    if (key && url && match) {
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

export async function resolveGitAuthHeader(reuniteUrl: string, version: string): Promise<string> {
  const apiKey = process.env.REDOCLY_AUTHORIZATION;

  if (apiKey) {
    return `Authorization: Bearer ${apiKey}`;
  }

  const accessToken = await new RedoclyOAuthClient(version).getAccessToken(reuniteUrl);

  if (accessToken) {
    return `Cookie: accessToken=${accessToken}`;
  }

  throw new HandledError(
    `You are not logged in to ${reuniteUrl}. Run \`redocly login --residency ${reuniteUrl}\` or set the REDOCLY_AUTHORIZATION environment variable.`
  );
}

export function runGit({
  reuniteUrl,
  authHeader,
  args,
}: {
  reuniteUrl: string;
  authHeader: string;
  args: string[];
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'git',
      ['-c', `http.${reuniteUrl}/.extraHeader=${authHeader}`, '-c', 'credential.helper=', ...args],
      {
        stdio: 'inherit',
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      }
    );

    child.on('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'ENOENT' ? new HandledError('git is not installed or not on PATH.') : error
      );
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}
