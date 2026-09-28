import { ReuniteApiError, type ReuniteApi } from '../api/api-client.js';
import { isOrganizationId, isProjectId, resolveProjectRef } from '../resolve-project-ref.js';

const ORG_ID = 'org_01hksn7dgmb6jpak0tzzepreq1';
const PROJECT_ID = 'prj_01hksn7dhbmf3nby0aeax6bkvf';

const organizations = { findBySlug: vi.fn(), findProjectBySlug: vi.fn() };
const client = { organizations } as unknown as ReuniteApi;

describe('isOrganizationId() / isProjectId()', () => {
  it('accepts Reunite ids and rejects slugs', () => {
    expect(isOrganizationId(ORG_ID)).toBe(true);
    expect(isOrganizationId('acme')).toBe(false);
    expect(isOrganizationId('org_acme')).toBe(false);
    expect(isProjectId(PROJECT_ID)).toBe(true);
    expect(isProjectId('docs')).toBe(false);
  });
});

describe('resolveProjectRef()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps ids without calling the API', async () => {
    const onSlugResolved = vi.fn();

    const result = await resolveProjectRef(client, {
      organization: ORG_ID,
      project: PROJECT_ID,
      onSlugResolved,
    });

    expect(result).toEqual({ organizationId: ORG_ID, projectId: PROJECT_ID });
    expect(organizations.findBySlug).not.toHaveBeenCalled();
    expect(organizations.findProjectBySlug).not.toHaveBeenCalled();
    expect(onSlugResolved).not.toHaveBeenCalled();
  });

  it('looks up slugs and reports the resolved ids', async () => {
    organizations.findBySlug.mockResolvedValue({ id: ORG_ID, slug: 'acme', name: 'Acme' });
    organizations.findProjectBySlug.mockResolvedValue({
      id: PROJECT_ID,
      slug: 'docs',
      name: 'Docs',
    });
    const onSlugResolved = vi.fn();

    const result = await resolveProjectRef(client, {
      organization: 'acme',
      project: 'docs',
      onSlugResolved,
    });

    expect(organizations.findBySlug).toHaveBeenCalledWith('acme');
    expect(organizations.findProjectBySlug).toHaveBeenCalledWith(ORG_ID, 'docs');
    expect(result).toEqual({ organizationId: ORG_ID, projectId: PROJECT_ID });
    expect(onSlugResolved).toHaveBeenCalledWith(result);
  });

  it('looks up only the value that is a slug', async () => {
    organizations.findProjectBySlug.mockResolvedValue({
      id: PROJECT_ID,
      slug: 'docs',
      name: 'Docs',
    });

    const result = await resolveProjectRef(client, { organization: ORG_ID, project: 'docs' });

    expect(organizations.findBySlug).not.toHaveBeenCalled();
    expect(organizations.findProjectBySlug).toHaveBeenCalledWith(ORG_ID, 'docs');
    expect(result).toEqual({ organizationId: ORG_ID, projectId: PROJECT_ID });
  });

  it('fails with a pointer to the settings page when the organization slug is unknown', async () => {
    organizations.findBySlug.mockResolvedValue(undefined);

    await expect(
      resolveProjectRef(client, { organization: 'nope', project: 'docs' })
    ).rejects.toThrow(
      new ReuniteApiError(
        'Organization "nope" was not found. Use the organization ID from the organization settings in Reunite.',
        404
      )
    );
    expect(organizations.findProjectBySlug).not.toHaveBeenCalled();
  });

  it('fails with a pointer to the settings page when the project slug is unknown', async () => {
    organizations.findProjectBySlug.mockResolvedValue(undefined);

    await expect(
      resolveProjectRef(client, { organization: ORG_ID, project: 'nope' })
    ).rejects.toThrow(
      new ReuniteApiError(
        'Project "nope" was not found. Use the project ID from the project settings in Reunite.',
        404
      )
    );
  });
});
