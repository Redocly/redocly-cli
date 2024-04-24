import { handlePushStatus } from '../push-status';
import { PushResponse } from '../../api/types';

const remotes = {
  getPush: jest.fn(),
  getRemotesList: jest.fn(),
};

jest.mock('colorette', () => ({
  green: (str: string) => str,
  yellow: (str: string) => str,
  red: (str: string) => str,
  gray: (str: string) => str,
  magenta: (str: string) => str,
  cyan: (str: string) => str,
}));

jest.mock('../../api', () => ({
  ...jest.requireActual('../../api'),
  ReuniteApiClient: jest.fn().mockImplementation(function (this: any, ...args) {
    this.remotes = remotes;
  }),
}));

jest.mock('@redocly/openapi-core', () => ({
  pause: jest.requireActual('@redocly/openapi-core').pause,
}));

describe('handlePushStatus()', () => {
  const mockConfig = { apis: {} } as any;

  const commitStub: PushResponse['commit'] = {
    message: 'test-commit-message',
    branchName: 'test-branch-name',
    sha: null,
    url: null,
    createdAt: null,
    namespaceId: null,
    repositoryId: null,
    author: {
      name: 'test-author-name',
      email: 'test-author-email',
      image: null,
    },
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
      preview: {
        scorecard: [],
        deploy: {
          url: 'https://preview-test-url',
          status: 'success',
        },
      },
      production: {
        scorecard: [],
        deploy: {
          url: 'https://production-test-url',
          status: 'success',
        },
      },
    },
  };

  beforeEach(() => {
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if organization not provided', async () => {
    await expect(
      handlePushStatus(
        {
          domain: 'test-domain',
          organization: '',
          project: 'test-project',
          pushId: 'test-push-id',
        },
        mockConfig
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No organization provided, please use --organization option or specify the 'organization' field in the config file."`
    );

    expect(process.stderr.write).toHaveBeenCalledWith(
      `No organization provided, please use --organization option or specify the 'organization' field in the config file.` +
        '\n\n'
    );
  });

  it('should print success push status for preview-build', async () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';
    remotes.getPush.mockResolvedValueOnce(pushResponseStub);

    await handlePushStatus(
      {
        domain: 'test-domain',
        organization: 'test-org',
        project: 'test-project',
        pushId: 'test-push-id',
      },
      mockConfig
    );
    expect(process.stdout.write).toHaveBeenCalledTimes(1);
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Preview deploy success.\nPreview URL: https://preview-test-url\n'
    );
  });

  it('should print success push status for preview and production builds', async () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';
    remotes.getPush.mockResolvedValue({ ...pushResponseStub, isMainBranch: true });

    await handlePushStatus(
      {
        domain: 'test-domain',
        organization: 'test-org',
        project: 'test-project',
        pushId: 'test-push-id',
      },
      mockConfig
    );
    expect(process.stdout.write).toHaveBeenCalledTimes(2);
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Preview deploy success.\nPreview URL: https://preview-test-url\n'
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Production deploy success.\nProduction URL: https://production-test-url\n'
    );
  });

  it('should print failed push status for preview build', async () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    remotes.getPush.mockResolvedValue({
      isOutdated: false,
      hasChanges: true,
      status: {
        preview: { deploy: { status: 'failed', url: 'https://preview-test-url' }, scorecard: [] },
      },
    });

    await expect(
      handlePushStatus(
        {
          domain: 'test-domain',
          organization: 'test-org',
          project: 'test-project',
          pushId: 'test-push-id',
        },
        mockConfig
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "❌ Preview deploy fail.
      Preview URL: https://preview-test-url"
    `);

    expect(process.stderr.write).toHaveBeenCalledWith(
      '❌ Preview deploy fail.\nPreview URL: https://preview-test-url' + '\n\n'
    );
  });

  it('should print success push status for preview build and print scorecards', async () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    remotes.getPush.mockResolvedValue({
      isOutdated: false,
      hasChanges: true,
      status: {
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

    await handlePushStatus(
      {
        domain: 'test-domain',
        organization: 'test-org',
        project: 'test-project',
        pushId: 'test-push-id',
      },
      mockConfig
    );
    expect(process.stdout.write).toHaveBeenCalledTimes(4);
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Preview deploy success.\nPreview URL: https://preview-test-url\n'
    );
    expect(process.stdout.write).toHaveBeenCalledWith('\nScorecard:');
    expect(process.stdout.write).toHaveBeenCalledWith(
      '\n    Name: test-name\n    Status: success\n    URL: test-url\n    Description: test-description\n'
    );
    expect(process.stdout.write).toHaveBeenCalledWith('\n');
  });

  it('should print message if there is no changes', async () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    remotes.getPush.mockResolvedValueOnce({
      isOutdated: false,
      hasChanges: false,
      status: {
        preview: { deploy: { status: 'skipped', url: 'https://preview-test-url' }, scorecard: [] },
        production: {
          deploy: { status: 'skipped', url: null },
          scorecard: [],
        },
      },
    });

    await handlePushStatus(
      {
        domain: 'test-domain',
        organization: 'test-org',
        project: 'test-project',
        pushId: 'test-push-id',
        wait: true,
      },
      mockConfig
    );

    expect(process.stderr.write).toHaveBeenCalledWith(
      'Files not added to your project. Reason: no changes.\n'
    );
  });

  describe('return value', () => {
    it('should return preview deployment info', async () => {
      process.env.REDOCLY_AUTHORIZATION = 'test-api-key';
      remotes.getPush.mockResolvedValue({ ...pushResponseStub, isMainBranch: false });

      const result = await handlePushStatus(
        {
          domain: 'test-domain',
          organization: 'test-org',
          project: 'test-project',
          pushId: 'test-push-id',
        },
        mockConfig
      );

      expect(result).toEqual({
        preview: {
          deploy: {
            status: 'success',
            url: 'https://preview-test-url',
          },
          scorecard: [],
        },
        production: null,
        commit: commitStub,
      });
    });

    it('should return preview and production deployment info', async () => {
      process.env.REDOCLY_AUTHORIZATION = 'test-api-key';
      remotes.getPush.mockResolvedValue({ ...pushResponseStub, isMainBranch: true });

      const result = await handlePushStatus(
        {
          domain: 'test-domain',
          organization: 'test-org',
          project: 'test-project',
          pushId: 'test-push-id',
        },
        mockConfig
      );

      expect(result).toEqual({
        preview: {
          deploy: {
            status: 'success',
            url: 'https://preview-test-url',
          },
          scorecard: [],
        },
        production: {
          deploy: {
            status: 'success',
            url: 'https://production-test-url',
          },
          scorecard: [],
        },
        commit: commitStub,
      });
    });
  });

  describe('"wait" option', () => {
    it('should wait for preview "success" deployment status', async () => {
      process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        status: {
          preview: {
            deploy: { status: 'pending', url: 'https://preview-test-url' },
            scorecard: [],
          },
        },
      });

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        status: {
          preview: {
            deploy: { status: 'running', url: 'https://preview-test-url' },
            scorecard: [],
          },
        },
      });

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        status: {
          preview: {
            deploy: { status: 'success', url: 'https://preview-test-url' },
            scorecard: [],
          },
        },
      });

      const result = await handlePushStatus(
        {
          domain: 'test-domain',
          organization: 'test-org',
          project: 'test-project',
          pushId: 'test-push-id',
          'retry-interval': 0.5, // 500 ms
          wait: true,
        },
        mockConfig
      );

      expect(result).toEqual({
        preview: {
          deploy: {
            status: 'success',
            url: 'https://preview-test-url',
          },
          scorecard: [],
        },
        production: null,
        commit: commitStub,
      });
    });

    it('should wait for production "success" status after preview "success" status', async () => {
      process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        isMainBranch: true,
        status: {
          preview: {
            deploy: { status: 'success', url: 'https://preview-test-url' },
            scorecard: [],
          },
          production: {
            deploy: { status: 'pending', url: 'https://production-test-url' },
            scorecard: [],
          },
        },
      });

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        isMainBranch: true,
        status: {
          preview: {
            deploy: { status: 'success', url: 'https://preview-test-url' },
            scorecard: [],
          },
          production: {
            deploy: { status: 'running', url: 'https://production-test-url' },
            scorecard: [],
          },
        },
      });

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        isMainBranch: true,
        status: {
          preview: {
            deploy: { status: 'success', url: 'https://preview-test-url' },
            scorecard: [],
          },
          production: {
            deploy: { status: 'success', url: 'https://production-test-url' },
            scorecard: [],
          },
        },
      });

      const result = await handlePushStatus(
        {
          domain: 'test-domain',
          organization: 'test-org',
          project: 'test-project',
          pushId: 'test-push-id',
          'retry-interval': 0.5, // 500 ms
          wait: true,
        },
        mockConfig
      );

      expect(result).toEqual({
        preview: {
          deploy: { status: 'success', url: 'https://preview-test-url' },
          scorecard: [],
        },
        production: {
          deploy: { status: 'success', url: 'https://production-test-url' },
          scorecard: [],
        },
        commit: commitStub,
      });
    });
  });

  describe('"continue-on-deploy-failures" option', () => {
    it('should throw error if option value is false', async () => {
      process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        status: {
          preview: {
            deploy: { status: 'failed', url: 'https://preview-test-url' },
            scorecard: [],
          },
        },
      });

      await expect(
        handlePushStatus(
          {
            domain: 'test-domain',
            organization: 'test-org',
            project: 'test-project',
            pushId: 'test-push-id',
            'continue-on-deploy-failures': false,
          },
          mockConfig
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(`
        "❌ Preview deploy fail.
        Preview URL: https://preview-test-url"
      `);
    });

    it('should not throw error if option value is true', async () => {
      process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        status: {
          preview: {
            deploy: { status: 'failed', url: 'https://preview-test-url' },
            scorecard: [],
          },
        },
      });

      await expect(
        handlePushStatus(
          {
            domain: 'test-domain',
            organization: 'test-org',
            project: 'test-project',
            pushId: 'test-push-id',
            'continue-on-deploy-failures': true,
          },
          mockConfig
        )
      ).resolves.toStrictEqual({
        preview: {
          deploy: { status: 'failed', url: 'https://preview-test-url' },
          scorecard: [],
        },
        production: null,
        commit: commitStub,
      });
    });
  });

  describe('"onRetry" callback', () => {
    it('should be called when command retries request to API in wait mode for preview deploy', async () => {
      process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        status: {
          preview: {
            deploy: { status: 'pending', url: 'https://preview-test-url' },
            scorecard: [],
          },
        },
      });

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        status: {
          preview: {
            deploy: { status: 'running', url: 'https://preview-test-url' },
            scorecard: [],
          },
        },
      });

      remotes.getPush.mockResolvedValueOnce({
        ...pushResponseStub,
        status: {
          preview: {
            deploy: { status: 'success', url: 'https://preview-test-url' },
            scorecard: [],
          },
        },
      });

      const onRetrySpy = jest.fn();

      const result = await handlePushStatus(
        {
          domain: 'test-domain',
          organization: 'test-org',
          project: 'test-project',
          pushId: 'test-push-id',
          wait: true,
          'retry-interval': 0.5, // 500 ms
          onRetry: onRetrySpy,
        },
        mockConfig
      );

      expect(onRetrySpy).toBeCalledTimes(2);

      // first retry
      expect(onRetrySpy).toHaveBeenNthCalledWith(1, {
        preview: {
          deploy: {
            status: 'pending',
            url: 'https://preview-test-url',
          },
          scorecard: [],
        },
        production: null,
        commit: commitStub,
      });

      // second retry
      expect(onRetrySpy).toHaveBeenNthCalledWith(2, {
        preview: {
          deploy: {
            status: 'running',
            url: 'https://preview-test-url',
          },
          scorecard: [],
        },
        production: null,
        commit: commitStub,
      });

      // final result
      expect(result).toEqual({
        preview: {
          deploy: {
            status: 'success',
            url: 'https://preview-test-url',
          },
          scorecard: [],
        },
        production: null,
        commit: commitStub,
      });
    });
  });

  describe('"max-execution-time" option', () => {
    it('should throw error in case "max-execution-time" was exceeded', async () => {
      process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

      // Stuck deployment simulation
      remotes.getPush.mockResolvedValue({
        ...pushResponseStub,
        status: {
          preview: {
            deploy: { status: 'pending', url: 'https://preview-test-url' },
            scorecard: [],
          },
        },
      });

      await expect(
        handlePushStatus(
          {
            domain: 'test-domain',
            organization: 'test-org',
            project: 'test-project',
            pushId: 'test-push-id',
            'retry-interval': 2, // seconds
            'max-execution-time': 1, // seconds
            wait: true,
          },
          mockConfig
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(`
        "✗ Failed to get push status. Reason: Timeout exceeded
        "
      `);
    });
  });
});
