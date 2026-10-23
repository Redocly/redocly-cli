import { fetch } from 'undici';
import type * as undici from 'undici';

import { ReuniteApiError } from '../api/api-client.js';
import {
  buildProjectGitUrl,
  createPullRequest,
  getPullRequestStatus,
  parseProjectGitUrl,
} from '../hosted-project.js';

vi.mock('undici', async (importOriginal) => ({
  ...(await importOriginal<typeof undici>()),
  fetch: vi.fn(),
}));

const PROJECT_API_URL = 'https://app.cloud.redocly.com/api/orgs/acme/projects/my%20docs';
const HEAD = 'c'.repeat(40);
const options = {
  reuniteUrl: 'https://app.cloud.redocly.com',
  organization: 'acme',
  project: 'my docs',
  accessToken: 'token',
};

describe('project git URL', () => {
  it('builds the project git URL and encodes the segments', () => {
    expect(buildProjectGitUrl('http://localhost', 'acme', 'my docs')).toBe(
      'http://localhost/api/orgs/acme/projects/my%20docs/git'
    );
  });

  it('reads back the parts of a project git URL', () => {
    const url = buildProjectGitUrl('https://app.cloud.redocly.com', 'acme', 'my docs');

    expect(parseProjectGitUrl(url)).toEqual({
      reuniteUrl: 'https://app.cloud.redocly.com',
      organization: 'acme',
      project: 'my docs',
    });
    expect(parseProjectGitUrl(`${url}/`)).toEqual(parseProjectGitUrl(url));
  });

  it.each([
    'https://github.com/acme/docs.git',
    'git@github.com:acme/docs.git',
    'https://app.cloud.redocly.com/api/orgs/acme/projects/docs',
    'http://example.com/api/orgs/acme/projects/docs/git',
  ])('rejects %s', (url) => {
    expect(parseProjectGitUrl(url)).toBeUndefined();
  });
});

describe('pull requests', () => {
  const pullRequest = {
    id: 'pr_1',
    number: 7,
    title: 'Fix a typo',
    status: 'OPEN',
    headCommitHash: HEAD,
  };
  const checks = [{ context: 'Redocly preview', state: 'SUCCESS' }];
  let responses: Record<string, { status: number; body: unknown }>;

  beforeEach(() => {
    responses = {
      'POST /pull-requests': { status: 200, body: pullRequest },
      'GET /pull-requests?branchName=fix-typo&limit=1': {
        status: 200,
        body: { data: [pullRequest] },
      },
      'GET /pull-requests/pr_1/checks': { status: 200, body: checks },
      [`GET /builds?limit=1&filter=commitHash%3A${HEAD}`]: {
        status: 200,
        body: { data: [{ url: 'https://preview.example.com', deploymentStatus: 'SUCCESS' }] },
      },
    };
    vi.mocked(fetch).mockImplementation((async (url: string, { method }: { method: string }) => {
      const { status, body } = responses[`${method} ${url.slice(PROJECT_API_URL.length)}`] ?? {
        status: 404,
        body: { title: 'Not found' },
      };
      return { ok: status < 400, status, json: async () => body };
    }) as any);
  });

  it('opens a pull request as the logged-in user', async () => {
    await expect(
      createPullRequest({
        ...options,
        branch: 'fix-typo',
        title: 'Fix a typo',
        description: 'Fixes the quickstart.',
        base: 'next',
        draft: true,
      })
    ).resolves.toEqual(pullRequest);

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, any];
    expect(url).toBe(`${PROJECT_API_URL}/pull-requests`);
    expect(init.headers).toMatchObject({ Cookie: 'accessToken=token' });
    expect(JSON.parse(init.body)).toEqual({
      branchName: 'fix-typo',
      title: 'Fix a typo',
      description: 'Fixes the quickstart.',
      targetBranchName: 'next',
      isDraft: true,
    });
  });

  it('returns the latest pull request of the branch with its checks and preview URL', async () => {
    await expect(getPullRequestStatus({ ...options, branch: 'fix-typo' })).resolves.toEqual({
      pullRequest,
      checks,
      previewUrl: 'https://preview.example.com',
    });
  });

  it('returns no preview URL before the preview of the head commit is deployed', async () => {
    responses[`GET /builds?limit=1&filter=commitHash%3A${HEAD}`] = {
      status: 200,
      body: { data: [{ url: 'https://preview.example.com', deploymentStatus: 'IN_PROGRESS' }] },
    };

    const status = await getPullRequestStatus({ ...options, branch: 'fix-typo' });

    expect(status?.previewUrl).toBeUndefined();
  });

  it('looks for no build when the pull request has no head commit yet', async () => {
    responses['GET /pull-requests?branchName=fix-typo&limit=1'] = {
      status: 200,
      body: { data: [{ ...pullRequest, headCommitHash: undefined }] },
    };

    const status = await getPullRequestStatus({ ...options, branch: 'fix-typo' });

    expect(status?.previewUrl).toBeUndefined();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/builds'), expect.anything());
  });

  it('returns nothing when the branch has no pull request', async () => {
    responses['GET /pull-requests?branchName=fix-typo&limit=1'] = {
      status: 200,
      body: { data: [] },
    };

    await expect(getPullRequestStatus({ ...options, branch: 'fix-typo' })).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('names the failed step in a rejected request', async () => {
    responses['POST /pull-requests'] = { status: 403, body: { title: 'Forbidden' } };

    await expect(
      createPullRequest({ ...options, branch: 'fix-typo', title: 'Fix a typo' })
    ).rejects.toThrow(new ReuniteApiError('Failed to open a pull request. Forbidden.', 403));
  });

  it('names the failed step in a failed connection', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    await expect(getPullRequestStatus({ ...options, branch: 'fix-typo' })).rejects.toThrow(
      'Failed to get the pull request. Failed to fetch. Caused by getaddrinfo ENOTFOUND.'
    );
  });
});
