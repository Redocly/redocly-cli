import { handlePushStatus } from '../push-status';
import { PushResponse } from '../../api/types';
import { exitWithError } from '../../../utils/miscellaneous';

const remotes = {
  getPush: jest.fn(),
  getRemotesList: jest.fn(),
};

jest.mock('../../../utils/miscellaneous');

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

  const pushResponseStub = {
    hasChanges: true,
    status: {
      preview: {
        scorecard: [],
        deploy: {
          url: 'https://test-url',
          status: 'success',
        },
      },
      production: {
        scorecard: [],
        deploy: {
          url: 'https://test-url',
          status: 'success',
        },
      },
    },
  } as unknown as PushResponse;

  beforeEach(() => {
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if organization not provided', async () => {
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

    expect(exitWithError).toHaveBeenCalledWith(
      "No organization provided, please use --organization option or specify the 'organization' field in the config file."
    );
  });

  it('should return success push status for preview-build', async () => {
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
      '🚀 PREVIEW deploy success.\nPreview URL: https://test-url\n'
    );
  });

  it('should return success push status for preview and production builds', async () => {
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
      '🚀 PREVIEW deploy success.\nPreview URL: https://test-url\n'
    );
    expect(process.stdout.write).toHaveBeenCalledWith(
      '🚀 PRODUCTION deploy success.\nPreview URL: https://test-url\n'
    );
  });

  it('should return failed push status for preview build', async () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    remotes.getPush.mockResolvedValue({
      isOutdated: false,
      hasChanges: true,
      status: {
        preview: { deploy: { status: 'failed', url: 'https://test-url' }, scorecard: [] },
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
    expect(exitWithError).toHaveBeenCalledWith(
      '❌ PREVIEW deploy fail.\nPreview URL: https://test-url'
    );
  });

  it('should return success push status for preview build and print scorecards', async () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    remotes.getPush.mockResolvedValue({
      isOutdated: false,
      hasChanges: true,
      status: {
        preview: {
          deploy: { status: 'success', url: 'https://test-url' },
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
      '🚀 PREVIEW deploy success.\nPreview URL: https://test-url\n'
    );
    expect(process.stdout.write).toHaveBeenCalledWith('\nScorecard:');
    expect(process.stdout.write).toHaveBeenCalledWith(
      '\n    Name: test-name\n    Status: success\n    URL: test-url\n    Description: test-description\n'
    );
    expect(process.stdout.write).toHaveBeenCalledWith('\n');
  });

  it('should display message if there is no changes', async () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    remotes.getPush.mockResolvedValueOnce({
      isOutdated: false,
      hasChanges: false,
      status: {
        preview: { deploy: { status: 'skipped', url: 'https://test-url' }, scorecard: [] },
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
});
