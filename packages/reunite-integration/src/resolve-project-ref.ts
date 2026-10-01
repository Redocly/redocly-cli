import { ReuniteApiError, type ReuniteApi } from './api/api-client.js';

const ORGANIZATION_ID_PATTERN = /^org_[0-9abcdefghjkmnpqrstvwxyz]{26}$/;
const PROJECT_ID_PATTERN = /^prj_[0-9abcdefghjkmnpqrstvwxyz]{26}$/;
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
    const organizationId = isOrganizationId(organization)
      ? organization
      : await findOrganizationId(client, organization);
    const projectId = isProjectId(project)
      ? project
      : await findProjectId(client, organizationId, project);

    return { organizationId, projectId, resolved: true };
  } catch (err) {
    if (err instanceof ReuniteApiError && DENIED_STATUSES.includes(err.status)) {
      return { organizationId: organization, projectId: project, resolved: false };
    }

    throw err;
  }
}

async function findOrganizationId(client: ReuniteApi, slug: string): Promise<string> {
  const organization = await client.organizations.findBySlug(slug);

  if (!organization) {
    throw new ReuniteApiError(
      `Organization "${slug}" was not found. Use the organization ID from the organization settings in Reunite.`,
      404
    );
  }

  return organization.id;
}

async function findProjectId(
  client: ReuniteApi,
  organizationId: string,
  slug: string
): Promise<string> {
  const project = await client.organizations.findProjectBySlug(organizationId, slug);

  if (!project) {
    throw new ReuniteApiError(
      `Project "${slug}" was not found. Use the project ID from the project settings in Reunite.`,
      404
    );
  }

  return project.id;
}
