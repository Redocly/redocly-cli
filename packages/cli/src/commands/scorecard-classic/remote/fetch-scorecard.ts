import { exitWithError } from '../../../utils/error.js';

import type { RemoteScorecardAndPlugins, Project } from '../types.js';

export async function fetchRemoteScorecardAndPlugins(
  projectUrl: string,
  auth: string
): Promise<RemoteScorecardAndPlugins | undefined> {
  const parsedProjectUrl = parseProjectUrl(projectUrl);

  if (!parsedProjectUrl) {
    exitWithError(`Invalid project URL format: ${projectUrl}`);
  }

  const { residency, orgSlug, projectSlug } = parsedProjectUrl;
  const apiKey = process.env.REDOCLY_AUTHORIZATION;

  try {
    const project = await fetchProjectConfigBySlugs(residency, orgSlug, projectSlug, apiKey, auth);
    const scorecard = project?.config.scorecard;

    if (!scorecard) {
      throw new Error('No scorecard configuration found.');
    }

    const plugins = project.config.pluginsUrl
      ? await fetchPlugins(project.config.pluginsUrl)
      : undefined;

    return {
      scorecard,
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
  apiKey: string | undefined,
  accessToken: string
): Promise<Project | undefined> {
  const authHeaders = createAuthHeaders(apiKey, accessToken);
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

function createAuthHeaders(
  apiKey: string | undefined,
  accessToken: string
): Record<string, string> {
  if (apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  }

  return { Cookie: `accessToken=${accessToken}` };
}
