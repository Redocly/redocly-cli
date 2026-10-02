import { ReuniteApiError, type ReuniteApi } from './api/api-client.js';

const ORGANIZATION_ID_PATTERN = /^org_[0-9abcdefghjkmnpqrstvwxyz]{26}$/;
const PROJECT_ID_PATTERN = /^prj_[0-9abcdefghjkmnpqrstvwxyz]{26}$/;
const ORGANIZATION_ID_IN_URI = /\/orgs\/(org_[0-9abcdefghjkmnpqrstvwxyz]{26})\/projects\//;
const DENIED_STATUSES = [401, 403];

export type ProjectRef = {
  organization: string;
  project: string;
};

export type ProjectRefResolution = {
  // The ids, or the given slugs when the API key is not allowed to look them up.
  organizationId: string;
  projectId: string;
  resolved: boolean;
};

export type ResolveProjectRefOptions = ProjectRef & {
  // Called when at least one of the values was a slug.
  onSlugDeprecated?: (resolution: ProjectRefResolution) => void;
};

export function isOrganizationId(value: string): boolean {
  return ORGANIZATION_ID_PATTERN.test(value);
}

export function isProjectId(value: string): boolean {
  return PROJECT_ID_PATTERN.test(value);
}

export async function resolveProjectRef(
  client: ReuniteApi,
  { organization, project, onSlugDeprecated }: ResolveProjectRefOptions
): Promise<ProjectRefResolution> {
  if (isOrganizationId(organization) && isProjectId(project)) {
    return { organizationId: organization, projectId: project, resolved: true };
  }

  const resolution = await lookUp(client, organization, project);

  onSlugDeprecated?.(resolution);

  return resolution;
}

async function lookUp(
  client: ReuniteApi,
  organization: string,
  project: string
): Promise<ProjectRefResolution> {
  try {
    const found = await client.projects.find(organization, project);

    if (!found) {
      throw new ReuniteApiError(
        `Project "${project}" was not found in organization "${organization}". Use the IDs from the organization and project settings in Reunite.`,
        404
      );
    }

    const organizationId = found.uri.match(ORGANIZATION_ID_IN_URI)?.[1];

    if (!organizationId) {
      throw new Error(`Could not read the organization ID from the project URI "${found.uri}".`);
    }

    return { organizationId, projectId: found.id, resolved: true };
  } catch (err) {
    if (err instanceof ReuniteApiError && DENIED_STATUSES.includes(err.status)) {
      return { organizationId: organization, projectId: project, resolved: false };
    }

    throw err;
  }
}
