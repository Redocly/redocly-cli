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

describe('handlePushStatus()', () => {
  const mockConfig = { apis: {} } as any;

  const pushResponseStub: PushResponse = {
    id: 'test-push-id',
    remoteId: 'test-remote-id',
    commit: {
      message: 'test-commit-message',
      branchName: 'test-branch-name',
      sha: null,
      url: null,
      createdAt: null,
      namespace: null,
      repository: null,
      author: {
        name: 'test-author-name',
        email: 'test-author-email',
        image: null,
      },
    },
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
    let caughtError;
    try {
      await handlePushStatus(
        {
          domain: 'test-domain',
          organization: '',
          project: 'test-project',
          pushId: 'test-push-id',
          'max-execution-time': 1000,
        },
        mockConfig
      );
    } catch (error) {
      caughtError = error;
    }
    expect(process.stderr.write).toHaveBeenCalledWith(
      `No organization provided, please use --organization option or specify the 'organization' field in the config file.` +
        '\n\n'
    );

    expect(caughtError).toBeDefined();
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
        'max-execution-time': 1000,
      },
      mockConfig
    );
    expect(process.stdout.write).toHaveBeenCalledTimes(1);
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Preview deploy succeed.\nPreview URL: https://preview-test-url\n'
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
        'max-execution-time': 1000,
      },
      mockConfig
    );
    expect(process.stdout.write).toHaveBeenCalledTimes(2);
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Preview deploy succeed.\nPreview URL: https://preview-test-url\n'
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Production deploy succeed.\nProduction URL: https://production-test-url\n'
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

    let caughtError;
    try {
      await handlePushStatus(
        {
          domain: 'test-domain',
          organization: 'test-org',
          project: 'test-project',
          pushId: 'test-push-id',
          'max-execution-time': 1000,
        },
        mockConfig
      );
    } catch (error) {
      caughtError = error;
    }

    expect(process.stderr.write).toHaveBeenCalledWith(
      '❌ Preview deploy failed.\nPreview URL: https://preview-test-url' + '\n\n'
    );

    expect(caughtError).toBeDefined();
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
        'max-execution-time': 1000,
      },
      mockConfig
    );
    expect(process.stdout.write).toHaveBeenCalledTimes(4);
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 Preview deploy succeed.\nPreview URL: https://preview-test-url\n'
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
      },
    });

    await handlePushStatus(
      {
        domain: 'test-domain',
        organization: 'test-org',
        project: 'test-project',
        pushId: 'test-push-id',
        wait: true,
        'max-execution-time': 1000,
      },
      mockConfig
    );

    expect(process.stderr.write).toHaveBeenCalledWith('Files not uploaded. Reason: no changes.\n');
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
          'max-execution-time': 1000,
        },
        mockConfig
      );

      expect(result).toEqual({
        preview: {
          status: 'success',
          url: 'https://preview-test-url',
          scorecard: [],
          isOutdated: false,
          noChanges: false,
        },
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
          'max-execution-time': 1000,
        },
        mockConfig
      );

      expect(result).toEqual({
        preview: {
          status: 'success',
          url: 'https://preview-test-url',
          scorecard: [],
          isOutdated: false,
          noChanges: false,
        },
        production: {
          status: 'success',
          url: 'https://production-test-url',
          scorecard: [],
          isOutdated: false,
          noChanges: false,
        },
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
          'max-execution-time': 1000,
          wait: true,
        },
        mockConfig
      );

      expect(result).toEqual({
        preview: {
          status: 'success',
          url: 'https://preview-test-url',
          scorecard: [],
          isOutdated: false,
          noChanges: false,
        },
      });
    }, 15000);

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
          'max-execution-time': 1000,
          wait: true,
        },
        mockConfig
      );

      expect(result).toEqual({
        preview: {
          status: 'success',
          url: 'https://preview-test-url',
          scorecard: [],
          isOutdated: false,
          noChanges: false,
        },
        production: {
          status: 'success',
          url: 'https://production-test-url',
          scorecard: [],
          isOutdated: false,
          noChanges: false,
        },
      });
    }, 30000);
  });

  describe('"ignore-deployment-failures" option', () => {
    it('should throw error if option is false', async () => {
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

      let caughtError;
      try {
        await handlePushStatus(
          {
            domain: 'test-domain',
            organization: 'test-org',
            project: 'test-project',
            pushId: 'test-push-id',
            'max-execution-time': 1000,
            'ignore-deployment-failures': false,
          },
          mockConfig
        );
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeDefined();
    });

    it('should not throw error if option is true', async () => {
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

      let caughtError;
      try {
        await handlePushStatus(
          {
            domain: 'test-domain',
            organization: 'test-org',
            project: 'test-project',
            pushId: 'test-push-id',
            'max-execution-time': 1000,
            'ignore-deployment-failures': true,
          },
          mockConfig
        );
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeUndefined();
    });
  });
});
