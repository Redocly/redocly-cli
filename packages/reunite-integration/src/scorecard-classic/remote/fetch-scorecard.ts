import type { RemoteScorecardAndPlugins, Project } from '../types.js';

export type FetchRemoteScorecardAndPluginsParams = {
  projectUrl: string;
  auth: string;
  isApiKey?: boolean;
};

export async function fetchRemoteScorecardAndPlugins({
  projectUrl,
  auth,
  isApiKey = false,
}: FetchRemoteScorecardAndPluginsParams): Promise<RemoteScorecardAndPlugins> {
  const parsedProjectUrl = parseProjectUrl(projectUrl);

  if (!parsedProjectUrl) {
    throw new Error(`Invalid project URL format: ${projectUrl}`);
  }

  const project = await fetchProjectConfigBySlugs({ ...parsedProjectUrl, auth, isApiKey });
  const scorecard = project.config.scorecardClassic || project.config.scorecard;

  if (!scorecard) {
    throw new Error('No scorecard configuration found.');
  }

  const pluginsUrl = project.config.pluginsUrl;
  const plugins = pluginsUrl ? await fetchPlugins(pluginsUrl) : undefined;

  return { scorecard, plugins, pluginsUrl };
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
}: {
  residency: string;
  orgSlug: string;
  projectSlug: string;
  auth: string;
  isApiKey: boolean;
}): Promise<Project> {
  const projectUrl = new URL(`${residency}/api/orgs/${orgSlug}/projects/${projectSlug}`);
  const projectResponse = await fetch(projectUrl, { headers: createAuthHeaders(auth, isApiKey) });

  if (projectResponse.status === 401 || projectResponse.status === 403) {
    throw new Error(
      `Unauthorized access to project: ${projectSlug}. Please check your credentials.`
    );
  }

  if (projectResponse.status !== 200) {
    throw new Error(`Failed to fetch project: ${projectSlug}. Status: ${projectResponse.status}`);
  }

  return projectResponse.json();
}

// A plugins bundle that cannot be fetched is treated as no plugins.
async function fetchPlugins(pluginsUrl: string): Promise<string | undefined> {
  try {
    const pluginsResponse = await fetch(pluginsUrl);

    if (pluginsResponse.status !== 200) {
      return;
    }

    return pluginsResponse.text();
  } catch {
    return;
  }
}

function createAuthHeaders(auth: string, isApiKey: boolean): Record<string, string> {
  if (isApiKey) {
    return { Authorization: `Bearer ${auth}` };
  }

  return { Cookie: `accessToken=${auth}` };
}
