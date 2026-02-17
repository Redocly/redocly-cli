import * as fs from 'node:fs';
import * as path from 'node:path';
import { handlePush } from '../push.js';
import { ReuniteApi, ReuniteApiError } from '../../api/index.js';
import { type MockInstance } from 'vitest';
import { slash } from '@redocly/openapi-core';
import { version } from '../../../utils/package.js';

const remotes = {
  push: vi.fn(),
  upsert: vi.fn(),
  getDefaultBranch: vi.fn(),
};

describe('handlePush()', () => {
  let pathResolveSpy: MockInstance;
  let pathRelativeSpy: MockInstance;
  let pathDirnameSpy: MockInstance;
  let fsStatSyncSpy: MockInstance;
  let fsReaddirSyncSpy: MockInstance;

  beforeEach(() => {
    remotes.getDefaultBranch.mockResolvedValueOnce('test-default-branch');
    remotes.upsert.mockResolvedValueOnce({ id: 'test-remote-id', mountPath: 'test-mount-path' });
    remotes.push.mockResolvedValueOnce({ branchName: 'uploaded-to-branch', id: 'test-id' });

    vi.mock('../../api/index.js', async () => {
      const actual = await vi.importActual('../../api/index.js');
      return {
        ...actual,
        ReuniteApi: vi.fn(),
      };
    });
    vi.mocked(ReuniteApi).mockImplementation(function (this: any, ...args): any {
      this.remotes = remotes;
      this.reportSunsetWarnings = vi.fn();
    });

    vi.mock('@redocly/openapi-core', async () => {
      const actual = await vi.importActual('@redocly/openapi-core');
      return { ...actual, slash: vi.fn() };
    });
    vi.mocked(slash).mockImplementation((p) => p);

    vi.mock('node:path', async () => {
      const actual = await vi.importActual('node:path');
      return { ...actual };
    });
    pathResolveSpy = vi.spyOn(path, 'resolve');
    pathRelativeSpy = vi.spyOn(path, 'relative');
    pathDirnameSpy = vi.spyOn(path, 'dirname');

    vi.mock('node:fs', async () => {
      const actual = await vi.importActual('node:fs');
      return { ...actual };
    });
    vi.spyOn(fs, 'createReadStream').mockReturnValue('stream' as any);
    fsStatSyncSpy = vi.spyOn(fs, 'statSync');
    fsReaddirSyncSpy = vi.spyOn(fs, 'readdirSync');
  });

  afterEach(() => {
    process.env.REDOCLY_AUTHORIZATION = undefined;
  });

  it('should upload files', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    fsStatSyncSpy.mockReturnValueOnce({
      isDirectory() {
        return false;
      },
    } as any);

    pathResolveSpy.mockImplementationOnce((p) => p);
    pathRelativeSpy.mockImplementationOnce((_, p) => p);
    pathDirnameSpy.mockImplementation((_: string) => '.');

    await handlePush({
      argv: {
        domain: 'test-domain',
        'mount-path': 'test-mount-path',
        organization: 'test-org',
        project: 'test-project',
        branch: 'test-branch',
        namespace: 'test-namespace',
        repository: 'test-repository',
        'commit-sha': 'test-commit-sha',
        'commit-url': 'test-commit-url',
        'default-branch': 'test-branch',
        'created-at': 'test-created-at',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        files: ['test-file'],
        'max-execution-time': 10,
      },
      config: mockConfig,
      version,
    });

    expect(remotes.getDefaultBranch).toHaveBeenCalledWith('test-org', 'test-project');
    expect(remotes.upsert).toHaveBeenCalledWith('test-org', 'test-project', {
      mountBranchName: 'test-default-branch',
      mountPath: 'test-mount-path',
    });
    expect(remotes.push).toHaveBeenCalledWith(
      'test-org',
      'test-project',
      {
        isMainBranch: true,
        remoteId: 'test-remote-id',
        commit: {
          message: 'Test message',
          branchName: 'test-branch',
          createdAt: 'test-created-at',
          namespace: 'test-namespace',
          repository: 'test-repository',
          sha: 'test-commit-sha',
          url: 'test-commit-url',
          author: {
            name: 'TestAuthor',
            email: 'test-author@mail.com',
          },
        },
      },
      [
        {
          path: 'test-file',
          stream: 'stream',
        },
      ]
    );
  });

  it('should return push id', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    fsStatSyncSpy.mockReturnValueOnce({
      isDirectory() {
        return false;
      },
    } as any);

    pathResolveSpy.mockImplementationOnce((p) => p);
    pathRelativeSpy.mockImplementationOnce((_, p) => p);
    pathDirnameSpy.mockImplementation((_: string) => '.');

    const result = await handlePush({
      argv: {
        domain: 'test-domain',
        'mount-path': 'test-mount-path',
        organization: 'test-org',
        project: 'test-project',
        branch: 'test-branch',
        namespace: 'test-namespace',
        repository: 'test-repository',
        'commit-sha': 'test-commit-sha',
        'commit-url': 'test-commit-url',
        'default-branch': 'test-branch',
        'created-at': 'test-created-at',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        files: ['test-file'],
        'max-execution-time': 10,
      },
      config: mockConfig,
      version,
    });

    expect(result).toEqual({ pushId: 'test-id' });
  });

  it('should collect files from directory and preserve file structure', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    /*
      ├── app
      │   ├── index.html
      ├── openapi.yaml
      └── some-ref.yaml
    */

    fsStatSyncSpy.mockImplementation(
      (filePath) =>
        ({
          isDirectory() {
            return filePath === 'test-folder' || filePath === 'test-folder/app';
          },
        }) as any
    );

    fsReaddirSyncSpy.mockImplementation((dirPath): any => {
      if (dirPath === 'test-folder') {
        return ['app', 'another-ref.yaml', 'openapi.yaml'];
      }

      if (dirPath === 'test-folder/app') {
        return ['index.html'];
      }

      throw new Error('Not a directory');
    });

    await handlePush({
      argv: {
        domain: 'test-domain',
        'mount-path': 'test-mount-path',
        organization: 'test-org',
        project: 'test-project',
        branch: 'test-branch',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        'default-branch': 'main',
        files: ['test-folder'],
        'max-execution-time': 10,
      },
      config: mockConfig,
      version,
    });

    expect(remotes.push).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      [
        {
          path: 'app/index.html',
          stream: 'stream',
        },

        {
          path: 'another-ref.yaml',
          stream: 'stream',
        },
        {
          path: 'openapi.yaml',
          stream: 'stream',
        },
      ]
    );
  });

  it('should not upload files if no files passed', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    await handlePush({
      argv: {
        domain: 'test-domain',
        'mount-path': 'test-mount-path',
        organization: 'test-org',
        project: 'test-project',
        branch: 'test-branch',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        'default-branch': 'main',
        files: [],
        'max-execution-time': 10,
      },
      config: mockConfig,
      version,
    });

    expect(remotes.getDefaultBranch).not.toHaveBeenCalled();
    expect(remotes.upsert).not.toHaveBeenCalled();
    expect(remotes.push).not.toHaveBeenCalled();
  });

  it('should get domain from env if not passed', async () => {
    const mockConfig = { organization: 'test-org-from-config', apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';
    process.env.REDOCLY_DOMAIN = 'test-domain-from-env';

    fsStatSyncSpy.mockReturnValueOnce({
      isDirectory() {
        return false;
      },
    });

    pathResolveSpy.mockImplementationOnce((p) => p);
    pathRelativeSpy.mockImplementationOnce((_, p) => p);
    pathDirnameSpy.mockImplementation((_: string) => '.');

    await handlePush({
      argv: {
        'mount-path': 'test-mount-path',
        project: 'test-project',
        branch: 'test-branch',
        'default-branch': 'main',
        author: 'TestAuthor <test-author@mail.com>',
        message: 'Test message',
        files: ['test-file'],
        'max-execution-time': 10,
        organization: 'redocly-test',
      },
      config: mockConfig,
      version,
    });

    expect(ReuniteApi).toBeCalledWith({
      domain: 'test-domain-from-env',
      apiKey: 'test-api-key',
      command: 'push',
    });
  });

  it('should print error message', async () => {
    const mockConfig = { apis: {} } as any;
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    remotes.push.mockRestore();
    remotes.push.mockRejectedValueOnce(new ReuniteApiError('Deprecated.', 412));

    fsStatSyncSpy.mockReturnValueOnce({
      isDirectory() {
        return false;
      },
    } as any);

    pathResolveSpy.mockImplementationOnce((p) => p);
    pathRelativeSpy.mockImplementationOnce((_, p) => p);
    pathDirnameSpy.mockImplementation((_: string) => '.');

    expect(
      handlePush({
        argv: {
          domain: 'test-domain',
          'mount-path': 'test-mount-path',
          organization: 'test-org',
          project: 'test-project',
          branch: 'test-branch',
          namespace: 'test-namespace',
          repository: 'test-repository',
          'commit-sha': 'test-commit-sha',
          'commit-url': 'test-commit-url',
          'default-branch': 'test-branch',
          'created-at': 'test-created-at',
          author: 'TestAuthor <test-author@mail.com>',
          message: 'Test message',
          files: ['test-file'],
          'max-execution-time': 10,
        },
        config: mockConfig,
        version,
      })
    ).rejects.toThrow('✗ File upload failed. Reason: Deprecated.');
  });
});
