import { ReuniteApiError, type ReuniteApi } from '../api/api-client.js';
import { resolveProjectRef } from '../resolve-project-ref.js';

const ORG_ID = 'org_01hksn7dgmb6jpak0tzzepreq1';
const PROJECT_ID = 'prj_01hksn7dhbmf3nby0aeax6bkvf';
const PROJECT = {
  id: PROJECT_ID,
  slug: 'docs',
  name: 'Docs',
  uri: `https://app.cloud.redocly.com/api/orgs/${ORG_ID}/projects/${PROJECT_ID}`,
};

const projects = { find: vi.fn() };
const client = { projects } as unknown as ReuniteApi;

describe('resolveProjectRef()', () => {
  beforeEach(() => {
    projects.find.mockResolvedValue(PROJECT);
  });

  it('looks the project up and keeps ids without a notice', async () => {
    const onSlugDeprecated = vi.fn();

    const result = await resolveProjectRef(client, {
      organization: ORG_ID,
      project: PROJECT_ID,
      onSlugDeprecated,
    });

    expect(projects.find).toHaveBeenCalledWith(ORG_ID, PROJECT_ID);
    expect(result).toEqual({ organizationId: ORG_ID, projectId: PROJECT_ID });
    expect(onSlugDeprecated).not.toHaveBeenCalled();
  });

  it('reports slugs with the ids from the lookup', async () => {
    const onSlugDeprecated = vi.fn();

    const result = await resolveProjectRef(client, {
      organization: 'acme',
      project: 'docs',
      onSlugDeprecated,
    });

    expect(projects.find).toHaveBeenCalledWith('acme', 'docs');
    expect(result).toEqual({ organizationId: ORG_ID, projectId: PROJECT_ID });
    expect(onSlugDeprecated).toHaveBeenCalledWith(result);
  });

  it('reports a slug given next to an id', async () => {
    const onSlugDeprecated = vi.fn();

    const result = await resolveProjectRef(client, {
      organization: ORG_ID,
      project: 'docs',
      onSlugDeprecated,
    });

    expect(result).toEqual({ organizationId: ORG_ID, projectId: PROJECT_ID });
    expect(onSlugDeprecated).toHaveBeenCalledWith(result);
  });

  it('keeps the given values when the API key may not look the project up', async () => {
    projects.find.mockRejectedValue(
      new ReuniteApiError('Missing required organization permissions.', 403)
    );
    const onSlugDeprecated = vi.fn();

    const result = await resolveProjectRef(client, {
      organization: 'acme',
      project: 'docs',
      onSlugDeprecated,
    });

    expect(result).toEqual({ organizationId: 'acme', projectId: 'docs' });
    expect(onSlugDeprecated).not.toHaveBeenCalled();
  });

  it('lets other lookup errors through', async () => {
    projects.find.mockRejectedValue(new ReuniteApiError('Bad Gateway.', 502));

    await expect(
      resolveProjectRef(client, { organization: 'acme', project: 'docs' })
    ).rejects.toThrow('Bad Gateway.');
  });

  it('fails with a pointer to the settings pages when the project is unknown', async () => {
    projects.find.mockResolvedValue(undefined);

    await expect(
      resolveProjectRef(client, { organization: 'acme', project: 'nope' })
    ).rejects.toThrow(
      new ReuniteApiError(
        'Project "nope" was not found in organization "acme". Use the IDs from the organization and project settings in Reunite.',
        404
      )
    );
  });

  it('fails when the project URI carries no organization id', async () => {
    projects.find.mockResolvedValue({
      ...PROJECT,
      uri: 'https://app.cloud.redocly.com/api/projects',
    });

    await expect(
      resolveProjectRef(client, { organization: 'acme', project: 'docs' })
    ).rejects.toThrow('Could not read the organization ID from the project URI');
  });
});
