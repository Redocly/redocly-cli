import { getPushStatus, waitForDeployment, type PushResponse } from '@redocly/reunite-integration';

import { handlePushStatus } from '../push-status.js';

vi.mock('@redocly/reunite-integration', async () => {
  const actual = await vi.importActual('@redocly/reunite-integration');
  return { ...actual, getPushStatus: vi.fn(), waitForDeployment: vi.fn() };
});
vi.mock('colorette', async () => {
  const actual = await vi.importActual('colorette');
  const plain = (text: string) => text;
  return {
    ...actual,
    green: plain,
    yellow: plain,
    red: plain,
    gray: plain,
    magenta: plain,
    cyan: plain,
  };
});

const version = '1.2.3';
const config = { apis: {} } as any;
const argv = {
  domain: 'test-domain',
  organization: 'test-org',
  project: 'test-project',
  pushId: 'test-push-id',
};

const commitStub: PushResponse['commit'] = {
  message: 'test-commit-message',
  branchName: 'test-branch-name',
  sha: null,
  url: null,
  createdAt: null,
  namespaceId: null,
  repositoryId: null,
  author: { name: 'test-author-name', email: 'test-author-email', image: null },
  statuses: [],
};

const pushResponseStub: PushResponse = {
  id: 'test-push-id',
  remoteId: 'test-remote-id',
  replace: false,
  scoutJobId: null,
  uploadedFiles: [],
  commit: commitStub,
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

describe('handlePushStatus()', () => {
  beforeEach(() => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    delete process.env.REDOCLY_AUTHORIZATION;
  });

  it('prints the preview deployment status and returns the summary', async () => {
    vi.mocked(getPushStatus).mockResolvedValue(pushResponseStub);

    const result = await handlePushStatus({ argv, config, version });

    expect(getPushStatus).toHaveBeenCalledWith({
      domain: 'test-domain',
      apiKey: 'test-api-key',
      organization: 'test-org',
      project: 'test-project',
      pushId: 'test-push-id',
      version,
      onSunsetWarning: expect.any(Function),
    });
    expect(process.stdout.write).toHaveBeenCalledTimes(1);
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Preview deploy success.\nPreview URL: https://preview-test-url\n'
    );
    expect(result).toEqual({
      preview: pushResponseStub.status.preview,
      production: null,
      commit: commitStub,
    });
  });

  it('prints the preview and production statuses for a main branch push', async () => {
    vi.mocked(getPushStatus).mockResolvedValue({ ...pushResponseStub, isMainBranch: true });

    const result = await handlePushStatus({ argv, config, version });

    expect(process.stdout.write).toHaveBeenCalledTimes(2);
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Preview deploy success.\nPreview URL: https://preview-test-url\n'
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Production deploy success.\nProduction URL: https://production-test-url\n'
    );
    expect(result?.production).toEqual(pushResponseStub.status.production);
  });

  it('prints the scorecard', async () => {
    vi.mocked(getPushStatus).mockResolvedValue({
      ...pushResponseStub,
      status: {
        ...pushResponseStub.status,
        preview: {
          deploy: { status: 'success', url: 'https://preview-test-url' },
          scorecard: [
            {
              name: 'test-name',
              status: 'success',
              description: 'test-description',
              url: 'test-url',
            },
          ],
        },
      },
    });

    await handlePushStatus({ argv, config, version });

    expect(process.stdout.write).toHaveBeenCalledTimes(4);
    expect(process.stdout.write).toHaveBeenCalledWith('\nScorecard:');
    expect(process.stdout.write).toHaveBeenCalledWith(
      '\n    Name: test-name\n    Status: success\n    URL: test-url\n    Description: test-description\n'
    );
  });

  it('fails on a failed preview deployment', async () => {
    vi.mocked(getPushStatus).mockResolvedValue({
      ...pushResponseStub,
      status: {
        ...pushResponseStub.status,
        preview: { deploy: { status: 'failed', url: 'https://preview-test-url' }, scorecard: [] },
      },
    });

    await expect(handlePushStatus({ argv, config, version })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      [Error: ❌ Preview deploy fail.
      Preview URL: https://preview-test-url]
    `);
  });

  it('does not fail on a failed deployment with "continue-on-deploy-failures"', async () => {
    const failedPreview = {
      deploy: { status: 'failed' as const, url: 'https://preview-test-url' },
      scorecard: [],
    };
    vi.mocked(getPushStatus).mockResolvedValue({
      ...pushResponseStub,
      status: { ...pushResponseStub.status, preview: failedPreview },
    });

    await expect(
      handlePushStatus({ argv: { ...argv, 'continue-on-deploy-failures': true }, config, version })
    ).resolves.toEqual({ preview: failedPreview, production: null, commit: commitStub });
  });

  it('prints the sunset warning even when the deployment failed', async () => {
    vi.mocked(getPushStatus).mockImplementation(async ({ onSunsetWarning }) => {
      onSunsetWarning?.({ sunsetDate: new Date('2030-01-01T00:00:00Z'), isSunsetExpired: false });
      return {
        ...pushResponseStub,
        status: {
          ...pushResponseStub.status,
          preview: { deploy: { status: 'failed', url: null }, scorecard: [] },
        },
      };
    });

    await expect(handlePushStatus({ argv, config, version })).rejects.toThrow(
      'Preview deploy fail'
    );
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('The "push-status" command will be incompatible')
    );
  });

  describe('"wait" option', () => {
    it('waits for the preview deployment and shows its progress', async () => {
      vi.mocked(waitForDeployment).mockImplementation(async ({ onRetry }) => {
        await onRetry?.({
          ...pushResponseStub,
          status: {
            ...pushResponseStub.status,
            preview: { deploy: { status: 'pending', url: null }, scorecard: [] },
          },
        });
        return pushResponseStub;
      });

      const result = await handlePushStatus({ argv: { ...argv, wait: true }, config, version });

      expect(waitForDeployment).toHaveBeenCalledTimes(1);
      expect(waitForDeployment).toHaveBeenCalledWith({
        domain: 'test-domain',
        apiKey: 'test-api-key',
        organization: 'test-org',
        project: 'test-project',
        pushId: 'test-push-id',
        version,
        onSunsetWarning: expect.any(Function),
        buildType: 'preview',
        maxExecutionTime: undefined,
        retryIntervalMs: undefined,
        startTime: expect.any(Number),
        onRetry: expect.any(Function),
      });
      expect(process.stderr.write).toHaveBeenCalledWith('Pending preview...\n');
      expect(result?.preview).toEqual(pushResponseStub.status.preview);
    });

    it('waits for the production deployment after a successful preview on the main branch', async () => {
      vi.mocked(waitForDeployment).mockResolvedValue({ ...pushResponseStub, isMainBranch: true });

      const result = await handlePushStatus({
        argv: { ...argv, wait: true, 'retry-interval': 0.5, 'max-execution-time': 10 },
        config,
        version,
      });

      expect(waitForDeployment).toHaveBeenCalledTimes(2);
      expect(waitForDeployment).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          buildType: 'preview',
          retryIntervalMs: 500,
          maxExecutionTime: 10,
        })
      );
      expect(waitForDeployment).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ buildType: 'production' })
      );
      const [[previewOptions], [productionOptions]] = vi.mocked(waitForDeployment).mock.calls;
      expect(productionOptions.startTime).toBe(previewOptions.startTime);
      expect(result?.production).toEqual(pushResponseStub.status.production);
    });

    it('warns when the push has no changes', async () => {
      vi.mocked(waitForDeployment).mockResolvedValue({ ...pushResponseStub, hasChanges: false });

      await handlePushStatus({ argv: { ...argv, wait: true }, config, version });

      expect(process.stderr.write).toHaveBeenCalledWith(
        'Files not added to your project. Reason: no changes.\n'
      );
    });

    it('reports an exceeded maximum execution time as a handled error', async () => {
      vi.mocked(waitForDeployment).mockRejectedValue(new Error('Timeout exceeded.'));

      await expect(handlePushStatus({ argv: { ...argv, wait: true }, config, version })).rejects
        .toThrowErrorMatchingInlineSnapshot(`
        [Error: ✗ Failed to get push status. Reason: Timeout exceeded.
        ]
      `);
    });

    it('prints a sunset warning once even when both deployments report it', async () => {
      vi.mocked(waitForDeployment).mockImplementation(async ({ onSunsetWarning }) => {
        onSunsetWarning?.({ sunsetDate: new Date('2030-01-01T00:00:00Z'), isSunsetExpired: false });
        return { ...pushResponseStub, isMainBranch: true };
      });

      await handlePushStatus({ argv: { ...argv, wait: true }, config, version });

      expect(waitForDeployment).toHaveBeenCalledTimes(2);
      const stderrWrite = vi.mocked(process.stderr.write);
      const sunsetMessages = stderrWrite.mock.calls.filter(([text]) =>
        String(text).includes('will be incompatible')
      );
      expect(sunsetMessages).toHaveLength(1);
    });
  });
});
