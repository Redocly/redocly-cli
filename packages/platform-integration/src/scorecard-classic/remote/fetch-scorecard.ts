import { HandledError } from '@redocly/openapi-core';

import type { RemoteScorecardAndPlugins, Project } from '../types.js';

export type RemoteScorecardErrorReason =
  | 'forbidden'
  | 'not-found'
  | 'not-configured'
  | 'unreachable';

// Tells apart why the remote scorecard could not be fetched.
export class RemoteScorecardError extends HandledError {
  constructor(
    message: string,
    public readonly reason: RemoteScorecardErrorReason
  ) {
    super(message);
  }
}

export type FetchRemoteScorecardAndPluginsParams = {
  projectUrl: string;
  auth: string;
  isApiKey?: boolean;
  // Receives a line for each step of the fetch, for step-by-step debugging.
  onDebug?: (message: string) => void;
};

export async function fetchRemoteScorecardAndPlugins({
  projectUrl,
  auth,
  isApiKey = false,
  onDebug,
}: FetchRemoteScorecardAndPluginsParams): Promise<RemoteScorecardAndPlugins> {
  const parsedProjectUrl = parseProjectUrl(projectUrl);

  if (!parsedProjectUrl) {
    throw new RemoteScorecardError(`Invalid project URL format: ${projectUrl}`, 'not-found');
  }

  try {
    const project = await fetchProjectConfigBySlugs({
      ...parsedProjectUrl,
      auth,
      isApiKey,
      onDebug,
    });
    const scorecard = project.config.scorecardClassic || project.config.scorecard;

    if (!scorecard) {
      throw new RemoteScorecardError('No scorecard configuration found.', 'not-configured');
    }

    const pluginsUrl = project.config.pluginsUrl;
    const plugins = pluginsUrl ? await fetchPlugins(pluginsUrl, onDebug) : undefined;

    return { scorecard, plugins, pluginsUrl };
  } catch (error: unknown) {
    if (error instanceof RemoteScorecardError) {
      throw error;
    }

    throw new RemoteScorecardError(
      error instanceof Error ? error.message : String(error),
      'unreachable'
    );
  }
}

function parseProjectUrl(
  projectUrl: string
): { residency: string; orgSlug: string; projectSlug: string } | undefined {
  const url = new URL(projectUrl);
  const match = url.pathname.match(/\/org\/(?<orgSlug>[^/]+)\/project\/(?<projectSlug>[^/]+)/);

  if (!match?.groups) {
    return;
  }

  const { orgSlug, projectSlug } = match.groups;

  return {
    residency: url.origin,
    orgSlug,
    projectSlug,
  };
}

async function fetchProjectConfigBySlugs({
  residency,
  orgSlug,
  projectSlug,
  auth,
  isApiKey,
  onDebug,
}: {
  residency: string;
  orgSlug: string;
  projectSlug: string;
  auth: string;
  isApiKey: boolean;
  onDebug?: (message: string) => void;
}): Promise<Project> {
  const projectUrl = new URL(`${residency}/api/orgs/${orgSlug}/projects/${projectSlug}`);
  const projectResponse = await fetch(projectUrl, { headers: createAuthHeaders(auth, isApiKey) });

  onDebug?.(`Project fetch response status: ${projectResponse.status}`);

  if (projectResponse.status === 401 || projectResponse.status === 403) {
    onDebug?.(`Authentication failed with status ${projectResponse.status}.`);
    onDebug?.('Check that your credentials are valid and have the necessary permissions.');
    throw new RemoteScorecardError(
      `Unauthorized access to project: ${projectSlug}. Please check your credentials.`,
      'forbidden'
    );
  }

  if (projectResponse.status !== 200) {
    throw new RemoteScorecardError(
      `Failed to fetch project: ${projectSlug}. Status: ${projectResponse.status}`,
      projectResponse.status === 404 ? 'not-found' : 'unreachable'
    );
  }

  onDebug?.('Successfully received project configuration.');

  return projectResponse.json();
}

// A plugins bundle that cannot be fetched is treated as no plugins.
async function fetchPlugins(
  pluginsUrl: string,
  onDebug?: (message: string) => void
): Promise<string | undefined> {
  onDebug?.(`Fetching plugins from: ${pluginsUrl}`);

  try {
    const pluginsResponse = await fetch(pluginsUrl);

    onDebug?.(`Plugins fetch response status: ${pluginsResponse.status}`);

    if (pluginsResponse.status !== 200) {
      onDebug?.('Failed to fetch plugins');
      return;
    }

    return pluginsResponse.text();
  } catch (error) {
    onDebug?.(`Error fetching plugins: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
}

function createAuthHeaders(auth: string, isApiKey: boolean): Record<string, string> {
  if (isApiKey) {
    return { Authorization: `Bearer ${auth}` };
  }

  return { Cookie: `accessToken=${auth}` };
}
