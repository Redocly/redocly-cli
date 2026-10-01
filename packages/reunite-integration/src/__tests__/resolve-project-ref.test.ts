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
    const onSlugDeprecated = vi.fn();

    const result = await resolveProjectRef(client, {
      organization: ORG_ID,
      project: PROJECT_ID,
      onSlugDeprecated,
    });

    expect(result).toEqual({ organizationId: ORG_ID, projectId: PROJECT_ID, resolved: true });
    expect(organizations.findBySlug).not.toHaveBeenCalled();
    expect(organizations.findProjectBySlug).not.toHaveBeenCalled();
    expect(onSlugDeprecated).not.toHaveBeenCalled();
  });

  it('looks up slugs and reports the resolved ids', async () => {
    organizations.findBySlug.mockResolvedValue({ id: ORG_ID, slug: 'acme', name: 'Acme' });
    organizations.findProjectBySlug.mockResolvedValue({
      id: PROJECT_ID,
      slug: 'docs',
      name: 'Docs',
    });
    const onSlugDeprecated = vi.fn();

    const result = await resolveProjectRef(client, {
      organization: 'acme',
      project: 'docs',
      onSlugDeprecated,
    });

    expect(organizations.findBySlug).toHaveBeenCalledWith('acme');
    expect(organizations.findProjectBySlug).toHaveBeenCalledWith(ORG_ID, 'docs');
    expect(result).toEqual({ organizationId: ORG_ID, projectId: PROJECT_ID, resolved: true });
    expect(onSlugDeprecated).toHaveBeenCalledWith(result);
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
    expect(result).toEqual({ organizationId: ORG_ID, projectId: PROJECT_ID, resolved: true });
  });

  it('passes the slugs through when the API key may not look them up', async () => {
    organizations.findBySlug.mockResolvedValue({ id: ORG_ID, slug: 'acme', name: 'Acme' });
    organizations.findProjectBySlug.mockRejectedValue(
      new ReuniteApiError('Missing required organization permissions.', 403)
    );
    const onSlugDeprecated = vi.fn();

    const result = await resolveProjectRef(client, {
      organization: 'acme',
      project: 'docs',
      onSlugDeprecated,
    });

    expect(result).toEqual({ organizationId: 'acme', projectId: 'docs', resolved: false });
    expect(onSlugDeprecated).toHaveBeenCalledWith(result);
  });

  it('lets other lookup errors through', async () => {
    organizations.findBySlug.mockRejectedValue(new ReuniteApiError('Bad Gateway.', 502));

    await expect(
      resolveProjectRef(client, { organization: 'acme', project: 'docs' })
    ).rejects.toThrow('Bad Gateway.');
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
