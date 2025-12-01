import { logger } from '@redocly/openapi-core';

import type { RemoteScorecardAndPlugins, Organization, Project, PaginatedList } from '../types.js';

export async function fetchRemoteScorecardAndPlugins(
  projectUrl: string,
  accessToken: string
): Promise<RemoteScorecardAndPlugins | undefined> {
  const parsedProjectUrl = parseProjectUrl(projectUrl);

  if (!parsedProjectUrl) {
    logger.warn(`Invalid project URL format: ${projectUrl}`);
    return;
  }

  const { residency, orgSlug, projectSlug } = parsedProjectUrl;

  const organization = await fetchOrganizationBySlug(residency, orgSlug, accessToken);

  if (!organization) {
    logger.warn(`Organization not found: ${orgSlug}`);
    return;
  }

  const project = await fetchProjectBySlug(residency, organization.id, projectSlug, accessToken);

  if (!project) {
    logger.warn(`Project not found: ${projectSlug}`);
    return;
  }

  const scorecard = project?.config.scorecard;

  if (!scorecard) {
    logger.warn('No scorecard configuration found in the remote project.');
    return;
  }

  const plugins = project.config.pluginsUrl
    ? await fetchPlugins(project.config.pluginsUrl)
    : undefined;

  return {
    scorecard,
    plugins,
  };
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

async function fetchOrganizationBySlug(
  residency: string,
  orgSlug: string,
  accessToken: string
): Promise<Organization | undefined> {
  const orgsUrl = new URL(`${residency}/api/orgs`);
  orgsUrl.searchParams.set('filter', `slug:${orgSlug}`);
  orgsUrl.searchParams.set('limit', '1');

  const authHeaders = createAuthHeaders(accessToken);
  const organizationResponse = await fetch(orgsUrl, { headers: authHeaders });

  if (organizationResponse.status !== 200) {
    return;
  }

  const organizations: PaginatedList<Organization> = await organizationResponse.json();

  return organizations.items[0];
}

async function fetchProjectBySlug(
  residency: string,
  orgId: string,
  projectSlug: string,
  accessToken: string
): Promise<Project | undefined> {
  const projectsUrl = new URL(`${residency}/api/orgs/${orgId}/projects`);
  projectsUrl.searchParams.set('filter', `slug:${projectSlug}`);
  projectsUrl.searchParams.set('limit', '1');

  const authHeaders = createAuthHeaders(accessToken);
  const projectsResponse = await fetch(projectsUrl, { headers: authHeaders });

  if (projectsResponse.status !== 200) {
    return;
  }

  const projects: PaginatedList<Project> = await projectsResponse.json();

  return projects.items[0];
}

async function fetchPlugins(pluginsUrl: string): Promise<string | undefined> {
  const pluginsResponse = await fetch(pluginsUrl);

  if (pluginsResponse.status !== 200) {
    return;
  }

  return pluginsResponse.text();
}

function createAuthHeaders(accessToken: string) {
  return { Cookie: `accessToken=${accessToken}` };
}
