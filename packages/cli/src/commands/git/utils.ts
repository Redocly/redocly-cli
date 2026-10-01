import { HandledError } from '@redocly/openapi-core';
import { isValidReuniteUrl, RedoclyOAuthClient } from '@redocly/reunite-integration';
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

// Passes the credential to git through GIT_CONFIG_* variables, so it never appears in a
// process list or a git config file, and only for requests to the Reunite host.
export async function runGit({
  reuniteUrl,
  authHeader,
  args,
}: {
  reuniteUrl: string;
  authHeader: string;
  args: string[];
}): Promise<number> {
  assertGitVersion();

  const configCount = Number(process.env.GIT_CONFIG_COUNT) || 0;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: String(configCount + 2),
    [`GIT_CONFIG_KEY_${configCount}`]: `http.${reuniteUrl}/.extraHeader`,
    [`GIT_CONFIG_VALUE_${configCount}`]: authHeader,
    [`GIT_CONFIG_KEY_${configCount + 1}`]: `credential.${reuniteUrl}/.helper`,
    [`GIT_CONFIG_VALUE_${configCount + 1}`]: '',
  };

  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { stdio: 'inherit', env });

    child.on('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'ENOENT' ? new HandledError('git is not installed or not on PATH.') : error
      );
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

const MIN_GIT_VERSION = [2, 31];

function assertGitVersion() {
  const result = spawnSync('git', ['--version'], { encoding: 'utf-8' });
  assertGitInstalled(result.error);

  const [, major = 0, minor = 0] = (result.stdout?.match(/(\d+)\.(\d+)/) ?? []).map(Number);
  if (major < MIN_GIT_VERSION[0] || (major === MIN_GIT_VERSION[0] && minor < MIN_GIT_VERSION[1])) {
    throw new HandledError(
      `Redocly git commands need git ${MIN_GIT_VERSION.join('.')} or later. Found: ${result.stdout?.trim()}.`
    );
  }
}

function assertGitInstalled(error: (Error & { code?: string }) | undefined) {
  if (error) {
    throw error.code === 'ENOENT'
      ? new HandledError('git is not installed or not on PATH.')
      : error;
  }
}
