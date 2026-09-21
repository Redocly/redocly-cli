import { ReuniteApi } from '../api/index.js';
import type { PushResponse } from '../api/types.js';
import { getPushStatus, waitForDeployment, type BuildType } from '../push-status.js';

vi.mock('../api/index.js', async () => {
  const actual = await vi.importActual('../api/index.js');
  return { ...actual, ReuniteApi: vi.fn() };
});

const remotes = { getPush: vi.fn() };

const options = {
  domain: 'test-domain',
  apiKey: 'test-api-key',
  organization: 'test-org',
  project: 'test-project',
  pushId: 'test-push-id',
  version: '1.2.3',
};

const pushResponseStub: PushResponse = {
  id: 'test-push-id',
  remoteId: 'test-remote-id',
  replace: false,
  scoutJobId: null,
  uploadedFiles: [],
  commit: {
    message: 'test-commit-message',
    branchName: 'test-branch-name',
    sha: null,
    url: null,
    createdAt: null,
    namespaceId: null,
    repositoryId: null,
    author: { name: 'test-author-name', email: 'test-author-email', image: null },
    statuses: [],
  },
  remote: { commits: [] },
  isOutdated: false,
  isMainBranch: false,
  hasChanges: true,
  status: {
    preview: { scorecard: [], deploy: { url: 'https://preview-test-url', status: 'success' } },
    production: {
      scorecard: [],
      deploy: { url: 'https://production-test-url', status: 'success' },
    },
  },
};

function withDeployStatus(
  buildType: BuildType,
  status: PushResponse['status']['preview']['deploy']['status']
): PushResponse {
  return {
    ...pushResponseStub,
    status: {
      ...pushResponseStub.status,
      [buildType]: { ...pushResponseStub.status[buildType], deploy: { url: null, status } },
    },
  };
}

beforeEach(() => {
  vi.mocked(ReuniteApi).mockImplementation(function (this: any): any {
    this.remotes = remotes;
    this.getSunsetWarning = vi.fn();
  });
});

describe('getPushStatus()', () => {
  it('fetches the push by its id', async () => {
    remotes.getPush.mockResolvedValue(pushResponseStub);

    const result = await getPushStatus(options);

    expect(ReuniteApi).toHaveBeenCalledWith({
      domain: 'test-domain',
      apiKey: 'test-api-key',
      command: 'push-status',
      version: '1.2.3',
    });
    expect(remotes.getPush).toHaveBeenCalledWith({
      organizationId: 'test-org',
      projectId: 'test-project',
      pushId: 'test-push-id',
    });
    expect(result).toBe(pushResponseStub);
  });
});

describe('waitForDeployment()', () => {
  it('polls until the deployment is no longer pending and reports each pending status', async () => {
    remotes.getPush
      .mockResolvedValueOnce(withDeployStatus('preview', 'pending'))
      .mockResolvedValueOnce(withDeployStatus('preview', 'running'))
      .mockResolvedValueOnce(withDeployStatus('preview', 'success'));
    const onRetry = vi.fn();

    const result = await waitForDeployment({
      ...options,
      buildType: 'preview',
      retryIntervalMs: 10,
      onRetry,
    });

    expect(remotes.getPush).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenNthCalledWith(1, withDeployStatus('preview', 'pending'));
    expect(onRetry).toHaveBeenNthCalledWith(2, withDeployStatus('preview', 'running'));
    expect(result).toEqual(withDeployStatus('preview', 'success'));
  });

  it('stops polling when the deployment has failed', async () => {
    remotes.getPush.mockResolvedValue(withDeployStatus('preview', 'failed'));

    const result = await waitForDeployment({
      ...options,
      buildType: 'preview',
      retryIntervalMs: 10,
    });

    expect(remotes.getPush).toHaveBeenCalledTimes(1);
    expect(result.status.preview.deploy.status).toBe('failed');
  });

  it('waits for the production deployment when asked to', async () => {
    remotes.getPush
      .mockResolvedValueOnce(withDeployStatus('production', 'pending'))
      .mockResolvedValueOnce(withDeployStatus('production', 'success'));

    const result = await waitForDeployment({
      ...options,
      buildType: 'production',
      retryIntervalMs: 10,
    });

    expect(remotes.getPush).toHaveBeenCalledTimes(2);
    expect(result.status.production.deploy.status).toBe('success');
  });

  it('fails when the maximum execution time is exceeded', async () => {
    remotes.getPush.mockResolvedValue(withDeployStatus('preview', 'pending'));

    await expect(
      waitForDeployment({
        ...options,
        buildType: 'preview',
        maxExecutionTime: 1,
        startTime: Date.now() - 2000,
      })
    ).rejects.toThrow('Timeout exceeded.');
  });

  it('hands the sunset warning to the caller once the deployment finished', async () => {
    const sunsetWarning = { sunsetDate: new Date('2030-01-01T00:00:00Z'), isSunsetExpired: false };
    vi.mocked(ReuniteApi).mockImplementation(function (this: any): any {
      this.remotes = remotes;
      this.getSunsetWarning = vi.fn(() => sunsetWarning);
    });
    remotes.getPush.mockResolvedValue(withDeployStatus('preview', 'success'));
    const onSunsetWarning = vi.fn();

    await waitForDeployment({ ...options, buildType: 'preview', onSunsetWarning });

    expect(onSunsetWarning).toHaveBeenCalledTimes(1);
    expect(onSunsetWarning).toHaveBeenCalledWith(sunsetWarning);
  });
});
