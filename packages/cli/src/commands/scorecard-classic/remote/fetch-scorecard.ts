import { exitWithError } from '../../../utils/error.js';

import type { RemoteScorecardAndPlugins, Project } from '../types.js';

export async function fetchRemoteScorecardAndPlugins(
  projectUrl: string,
  auth: string,
  isApiKey = false
): Promise<RemoteScorecardAndPlugins> {
  const parsedProjectUrl = parseProjectUrl(projectUrl);

  if (!parsedProjectUrl) {
    exitWithError(`Invalid project URL format: ${projectUrl}`);
  }

  const { residency, orgSlug, projectSlug } = parsedProjectUrl;

  try {
    const project = await fetchProjectConfigBySlugs(
      residency,
      orgSlug,
      projectSlug,
      auth,
      isApiKey
    );
    const scorecard = project?.config.scorecard;

    if (!scorecard) {
      throw new Error('No scorecard configuration found.');
    }

    const plugins = project.config.pluginsUrl
      ? await fetchPlugins(project.config.pluginsUrl)
      : undefined;

    return {
      scorecard: scorecard!,
      plugins,
    };
  } catch (error) {
    exitWithError(error.message);
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

async function fetchProjectConfigBySlugs(
  residency: string,
  orgSlug: string,
  projectSlug: string,
  auth: string,
  isApiKey: boolean
): Promise<Project | undefined> {
  const authHeaders = createAuthHeaders(auth, isApiKey);
  const projectUrl = new URL(`${residency}/api/orgs/${orgSlug}/projects/${projectSlug}`);

  const projectResponse = await fetch(projectUrl, { headers: authHeaders });

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

async function fetchPlugins(pluginsUrl: string): Promise<string | undefined> {
  const pluginsResponse = await fetch(pluginsUrl);

  if (pluginsResponse.status !== 200) {
    return;
  }

  return pluginsResponse.text();
}

function createAuthHeaders(auth: string, isApiKey: boolean): Record<string, string> {
  if (isApiKey) {
    return { Authorization: `Bearer ${auth}` };
  }

  return { Cookie: `accessToken=${auth}` };
}
