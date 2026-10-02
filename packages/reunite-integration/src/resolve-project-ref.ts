import { ReuniteApiError, type ReuniteApi } from './api/api-client.js';
import type { ProjectResponse } from './api/types.js';

const ORGANIZATION_IN_URI = /\/orgs\/([^/]+)\/projects\//;
const DENIED_STATUSES = [401, 403];

export type ProjectRef = {
  organization: string;
  project: string;
};

export type ProjectRefResolution = {
  organizationId: string;
  projectId: string;
};

export type ResolveProjectRefOptions = ProjectRef & {
  // Called when the lookup shows that the organization or the project was given as a slug.
  onSlugDeprecated?: (resolution: ProjectRefResolution) => void;
};

// Keeps the given values when the API key is not allowed to look the project up.
export async function resolveProjectRef(
  client: ReuniteApi,
  { organization, project, onSlugDeprecated }: ResolveProjectRefOptions
): Promise<ProjectRefResolution> {
  const found = await lookUp(client, organization, project);

  if (!found) {
    return { organizationId: organization, projectId: project };
  }

  const resolution = { organizationId: organizationIdOf(found.uri), projectId: found.id };

  if (resolution.organizationId !== organization || resolution.projectId !== project) {
    onSlugDeprecated?.(resolution);
  }

  return resolution;
}

async function lookUp(
  client: ReuniteApi,
  organization: string,
  project: string
): Promise<ProjectResponse | undefined> {
  try {
    const found = await client.projects.find(organization, project);

    if (!found) {
      throw new ReuniteApiError(
        `Project "${project}" was not found in organization "${organization}". Use the IDs from the organization and project settings in Reunite.`,
        404
      );
    }

    return found;
  } catch (err) {
    if (err instanceof ReuniteApiError && DENIED_STATUSES.includes(err.status)) {
      return undefined;
    }

    throw err;
  }
}

// The project resource carries no organization id; its self-link does.
function organizationIdOf(uri: string): string {
  const organizationId = uri.match(ORGANIZATION_IN_URI)?.[1];

  if (!organizationId) {
    throw new Error(`Could not read the organization ID from the project URI "${uri}".`);
  }

  return organizationId;
}
