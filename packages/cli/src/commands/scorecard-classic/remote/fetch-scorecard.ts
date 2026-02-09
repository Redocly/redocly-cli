import { logger } from '@redocly/openapi-core';
import { exitWithError } from '../../../utils/error.js';
import type { RemoteScorecardAndPlugins, Project } from '../types.js';

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
    const project = await fetchProjectConfigBySlugs({
      residency,
      orgSlug,
      projectSlug,
      auth,
      isApiKey,
      verbose,
    });
    const scorecard = project?.config.scorecardClassic || project?.config.scorecard;

    if (!scorecard) {
      throw new Error('No scorecard configuration found.');
    }

    if (verbose) {
      logger.info(`Successfully fetched scorecard configuration.\n`);
      logger.info(`Scorecard levels found: ${scorecard.levels?.length || 0}\n`);
    }

    const plugins = project.config.pluginsUrl
      ? await fetchPlugins(project.config.pluginsUrl, verbose)
      : undefined;

    if (verbose) {
      if (plugins) {
        logger.info(`Successfully fetched plugins from ${project.config.pluginsUrl}\n`);
      } else if (project.config.pluginsUrl) {
        logger.info(`No plugins were loaded from ${project.config.pluginsUrl}\n`);
      } else {
        logger.info(`No custom plugins configured for this scorecard.\n`);
      }
    }

    return {
      scorecard: scorecard!,
      plugins,
    };
  } catch (error) {
    if (verbose) {
      logger.error(`❌ Failed to fetch remote scorecard configuration.\n`);
      logger.error(`Error details: ${error.message}\n`);
      if (error.stack) {
        logger.error(`Stack trace:\n${error.stack}\n`);
      }
    }
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

type FetchProjectConfigBySlugsParams = {
  residency: string;
  orgSlug: string;
  projectSlug: string;
  auth: string;
  isApiKey: boolean;
  verbose?: boolean;
};

async function fetchProjectConfigBySlugs({
  residency,
  orgSlug,
  projectSlug,
  auth,
  isApiKey,
  verbose = false,
}: FetchProjectConfigBySlugsParams): Promise<Project | undefined> {
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
    logger.info(`Successfully received project configuration.\n`);
  }

  return projectResponse.json();
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
      logger.error(`Error fetching plugins: ${error.message}\n`);
    }
    return;
  }
}

function createAuthHeaders(auth: string, isApiKey: boolean): Record<string, string> {
  if (isApiKey) {
    return { Authorization: `Bearer ${auth}` };
  }

  return { Cookie: `accessToken=${auth}` };
}
