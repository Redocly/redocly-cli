import {
  collectFilesToPush,
  pushFiles,
  ReuniteApiError,
  waitForDeployment,
  type PushResponse,
  type UpsertRemoteResponse,
} from '@redocly/reunite-integration';

import { handlePush, type PushArgv } from '../push.js';

vi.mock('@redocly/reunite-integration', async () => {
  const actual = await vi.importActual('@redocly/reunite-integration');
  return { ...actual, collectFilesToPush: vi.fn(), pushFiles: vi.fn(), waitForDeployment: vi.fn() };
});

const version = '1.2.3';
const config = { apis: {} } as any;
const argv: PushArgv = {
  domain: 'test-domain',
  'mount-path': 'test-mount-path',
  organization: 'test-org',
  project: 'test-project',
  branch: 'test-branch',
  'default-branch': 'test-branch',
  namespace: 'test-namespace',
  repository: 'test-repository',
  'commit-sha': 'test-commit-sha',
  'commit-url': 'test-commit-url',
  'created-at': 'test-created-at',
  author: 'TestAuthor <test-author@mail.com>',
  message: 'Test message',
  files: ['test-file'],
};

describe('handlePush()', () => {
  beforeEach(() => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.mocked(collectFilesToPush).mockReturnValue([{ name: 'test-file', path: '/abs/test-file' }]);
    vi.mocked(pushFiles).mockImplementation(async ({ onUploadStart }) => {
      onUploadStart?.({ mountPath: 'remote-mount-path' } as UpsertRemoteResponse);
      return { pushId: 'test-id' };
    });
  });

  afterEach(() => {
    delete process.env.REDOCLY_AUTHORIZATION;
  });

  it('pushes the collected files with the commit details from the arguments', async () => {
    const result = await handlePush({ argv, config, version });

    expect(collectFilesToPush).toHaveBeenCalledWith(['test-file']);
    expect(pushFiles).toHaveBeenCalledWith({
      domain: 'test-domain',
      apiKey: 'test-api-key',
      organization: 'test-org',
      project: 'test-project',
      mountPath: 'test-mount-path',
      files: [{ name: 'test-file', path: '/abs/test-file' }],
      defaultBranch: 'test-branch',
      commit: {
        message: 'Test message',
        branchName: 'test-branch',
        sha: 'test-commit-sha',
        url: 'test-commit-url',
        createdAt: 'test-created-at',
        namespace: 'test-namespace',
        repository: 'test-repository',
        author: { name: 'TestAuthor', email: 'test-author@mail.com' },
      },
      version,
      onUploadStart: expect.any(Function),
    });
    expect(process.stderr.write).toHaveBeenCalledWith('Uploading to remote-mount-path 1 file:\n');
    expect(process.stderr.write).toHaveBeenCalledWith('Push ID: test-id\n');
    expect(result).toEqual({ pushId: 'test-id' });
  });

  it('does not push when there are no files to upload', async () => {
    vi.mocked(collectFilesToPush).mockReturnValue([]);

    await handlePush({ argv: { ...argv, files: [] }, config, version });

    expect(pushFiles).not.toHaveBeenCalled();
  });

  it('waits for the preview deployment when asked to', async () => {
    vi.mocked(waitForDeployment).mockResolvedValue({
      isMainBranch: false,
      isOutdated: false,
      hasChanges: true,
      status: { preview: { deploy: { status: 'success', url: null }, scorecard: [] } },
    } as unknown as PushResponse);

    await handlePush({ argv: { ...argv, 'wait-for-deployment': true }, config, version });

    expect(waitForDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ pushId: 'test-id', buildType: 'preview', domain: 'test-domain' })
    );
  });

  it('reports a Reunite API error as a handled error', async () => {
    vi.mocked(pushFiles).mockRejectedValue(new ReuniteApiError('Deprecated.', 412));

    await expect(handlePush({ argv, config, version })).rejects.toThrow(
      '✗ File upload failed. Reason: Deprecated. (status: 412)'
    );
  });

  it('keeps angle brackets in the author name and takes the email from the last pair', async () => {
    await handlePush({ argv: { ...argv, author: 'Ann <x> <ann@example.test>' }, config, version });

    expect(pushFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        commit: expect.objectContaining({ author: { name: 'Ann <x>', email: 'ann@example.test' } }),
      })
    );
  });

  it('rejects an author that is not in the "Name <email>" format', async () => {
    await expect(
      handlePush({ argv: { ...argv, author: 'TestAuthor' }, config, version })
    ).rejects.toThrow('Invalid author format');
    expect(pushFiles).not.toHaveBeenCalled();
  });

  it('reports a failed deployment wait with its own message, not as an upload failure', async () => {
    vi.mocked(waitForDeployment).mockRejectedValue(new Error('Timeout exceeded.'));

    await expect(
      handlePush({ argv: { ...argv, 'wait-for-deployment': true }, config, version })
    ).rejects.toThrow(/^✗ Failed to get push status\. Reason: Timeout exceeded\.\n$/);
    expect(process.stderr.write).toHaveBeenCalledWith('Push ID: test-id\n');
  });
});
