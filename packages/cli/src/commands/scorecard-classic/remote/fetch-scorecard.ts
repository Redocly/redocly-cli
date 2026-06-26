import { logger } from '@redocly/openapi-core';

import { exitWithError } from '../../../utils/error.js';
import type { RemoteScorecardAndPlugins, Project, ProjectConfig } from '../types.js';

export type FetchRemoteScorecardAndPluginsParams = {
  projectUrl: string;
  auth: string;
  isApiKey?: boolean;
  verbose?: boolean;
};

export async function fetchRemoteScorecardAndPlugins({
  projectUrl,
  auth,
  isApiKey = false,
  verbose = false,
}: FetchRemoteScorecardAndPluginsParams): Promise<RemoteScorecardAndPlugins> {
  if (verbose) {
    logger.info(`Starting fetch for remote scorecard configuration...\n`);
  }

  const parsedProjectUrl = parseProjectUrl(projectUrl);

  if (!parsedProjectUrl) {
    exitWithError(`Invalid project URL format: ${projectUrl}`);
  }

  const { residency, orgSlug, projectSlug } = parsedProjectUrl;

  try {
    const project = await fetchProjectBySlugs({
      residency,
      orgSlug,
      projectSlug,
      auth,
      isApiKey,
      verbose,
    });

    const projectConfig = await fetchProjectConfig({
      residency,
      orgId: project.organizationId,
      projectId: project.id,
      auth,
      isApiKey,
      verbose,
    });

    const scorecard = projectConfig?.config?.scorecardClassic || projectConfig?.config?.scorecard;

    if (!scorecard) {
      throw new Error('No scorecard configuration found.');
    }

    if (verbose) {
      logger.info(`Successfully fetched scorecard configuration.\n`);
      logger.info(`Scorecard levels found: ${scorecard.levels?.length || 0}\n`);
    }

    const pluginsUrl = projectConfig?.config?.pluginsUrl;
    const plugins = pluginsUrl ? await fetchPlugins(pluginsUrl, verbose) : undefined;

    if (verbose) {
      if (plugins) {
        logger.info(`Successfully fetched plugins from ${pluginsUrl}\n`);
      } else if (pluginsUrl) {
        logger.info(`No plugins were loaded from ${pluginsUrl}\n`);
      } else {
        logger.info(`No custom plugins configured for this scorecard.\n`);
      }
    }

    return {
      scorecard: scorecard!,
      plugins,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (verbose) {
      logger.error(`❌ Failed to fetch remote scorecard configuration.\n`);
      logger.error(`Error details: ${errorMessage}\n`);
      if (error instanceof Error && error.stack) {
        logger.error(`Stack trace:\n${error.stack}\n`);
      }
    }
    exitWithError(errorMessage);
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

type FetchProjectBySlugsParams = {
  residency: string;
  orgSlug: string;
  projectSlug: string;
  auth: string;
  isApiKey: boolean;
  verbose?: boolean;
};

async function fetchProjectBySlugs({
  residency,
  orgSlug,
  projectSlug,
  auth,
  isApiKey,
  verbose = false,
}: FetchProjectBySlugsParams): Promise<Project> {
  const authHeaders = createAuthHeaders(auth, isApiKey);
  const projectUrl = new URL(`${residency}/api/orgs/${orgSlug}/projects/${projectSlug}`);

  const projectResponse = await fetch(projectUrl, { headers: authHeaders });

  if (verbose) {
    logger.info(`Project fetch response status: ${projectResponse.status}\n`);
  }

  if (projectResponse.status === 401 || projectResponse.status === 403) {
    if (verbose) {
      logger.error(`Authentication failed with status ${projectResponse.status}.\n`);
      logger.error(`Check that your credentials are valid and have the necessary permissions.\n`);
    }
    throw new Error(
      `Unauthorized access to project: ${projectSlug}. Please check your credentials.`
    );
  }

  if (projectResponse.status !== 200) {
    throw new Error(`Failed to fetch project: ${projectSlug}. Status: ${projectResponse.status}`);
  }

  if (verbose) {
    logger.info(`Successfully received project.\n`);
  }

  return projectResponse.json();
}

type FetchProjectConfigParams = {
  residency: string;
  orgId: string;
  projectId: string;
  auth: string;
  isApiKey: boolean;
  verbose?: boolean;
};

async function fetchProjectConfig({
  residency,
  orgId,
  projectId,
  auth,
  isApiKey,
  verbose = false,
}: FetchProjectConfigParams): Promise<ProjectConfig> {
  const authHeaders = createAuthHeaders(auth, isApiKey);
  const projectConfigUrl = new URL(`${residency}/api/orgs/${orgId}/project-configs/${projectId}`);

  const projectConfigResponse = await fetch(projectConfigUrl, { headers: authHeaders });

  if (verbose) {
    logger.info(`Project config fetch response status: ${projectConfigResponse.status}\n`);
  }

  if (projectConfigResponse.status === 401 || projectConfigResponse.status === 403) {
    if (verbose) {
      logger.error(`Authentication failed with status ${projectConfigResponse.status}.\n`);
      logger.error(`Check that your credentials are valid and have the necessary permissions.\n`);
    }
    throw new Error(
      `Unauthorized access to project config: ${projectId}. Please check your credentials.`
    );
  }

  if (projectConfigResponse.status !== 200) {
    throw new Error(
      `Failed to fetch project config: ${projectId}. Status: ${projectConfigResponse.status}`
    );
  }

  if (verbose) {
    logger.info(`Successfully received project configuration.\n`);
  }

  return projectConfigResponse.json();
}

async function fetchPlugins(pluginsUrl: string, verbose = false): Promise<string | undefined> {
  if (verbose) {
    logger.info(`Fetching plugins from: ${pluginsUrl}\n`);
  }

  try {
    const pluginsResponse = await fetch(pluginsUrl);

    if (verbose) {
      logger.info(`Plugins fetch response status: ${pluginsResponse.status}\n`);
    }

    if (pluginsResponse.status !== 200) {
      if (verbose) {
        logger.error(`Failed to fetch plugins\n`);
      }
      return;
    }

    return pluginsResponse.text();
  } catch (error) {
    if (verbose) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error fetching plugins: ${errorMessage}\n`);
    }
    return;
  }
}

function createAuthHeaders(auth: string, isApiKey: boolean): Record<string, string> {
  if (isApiKey) {
    return { Authorization: `Bearer ${auth}`, version: '2' };
  }

  return { Cookie: `accessToken=${auth}`, version: '2' };
}
