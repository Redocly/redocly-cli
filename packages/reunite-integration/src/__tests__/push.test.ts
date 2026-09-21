import { slash } from '@redocly/openapi-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { ReuniteApi, ReuniteApiError } from '../api/index.js';
import { collectFilesToPush, pushFiles, type PushOptions } from '../push.js';

vi.mock('../api/index.js', async () => {
  const actual = await vi.importActual('../api/index.js');
  return { ...actual, ReuniteApi: vi.fn() };
});
vi.mock('@redocly/openapi-core', async () => {
  const actual = await vi.importActual('@redocly/openapi-core');
  return { ...actual, slash: vi.fn() };
});
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return { ...actual };
});

const remotes = {
  push: vi.fn(),
  upsert: vi.fn(),
  getDefaultBranch: vi.fn(),
};

const options: PushOptions = {
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
  version: '1.2.3',
};

describe('pushFiles()', () => {
  beforeEach(() => {
    remotes.getDefaultBranch.mockResolvedValue('test-default-branch');
    remotes.upsert.mockResolvedValue({ id: 'test-remote-id', mountPath: 'remote-mount-path' });
    remotes.push.mockResolvedValue({ id: 'test-id' });
    vi.mocked(ReuniteApi).mockImplementation(function (this: any): any {
      this.remotes = remotes;
      this.getSunsetWarning = vi.fn();
    });
    vi.mocked(slash).mockImplementation((filePath) => filePath);
    vi.spyOn(fs, 'createReadStream').mockReturnValue('stream' as any);
  });

  it('upserts the remote, reports it, and pushes the files to it', async () => {
    const onUploadStart = vi.fn();

    const result = await pushFiles({ ...options, onUploadStart });

    expect(ReuniteApi).toHaveBeenCalledWith({
      domain: 'test-domain',
      apiKey: 'test-api-key',
      command: 'push',
      version: '1.2.3',
    });
    expect(remotes.getDefaultBranch).toHaveBeenCalledWith('test-org', 'test-project');
    expect(remotes.upsert).toHaveBeenCalledWith('test-org', 'test-project', {
      mountBranchName: 'test-default-branch',
      mountPath: 'test-mount-path',
    });
    expect(remotes.push).toHaveBeenCalledWith(
      'test-org',
      'test-project',
      { remoteId: 'test-remote-id', commit: options.commit, isMainBranch: true },
      [{ path: 'test-file', stream: 'stream' }]
    );
    expect(onUploadStart).toHaveBeenCalledWith({
      id: 'test-remote-id',
      mountPath: 'remote-mount-path',
    });
    expect(onUploadStart.mock.invocationCallOrder[0]).toBeLessThan(
      remotes.push.mock.invocationCallOrder[0]
    );
    expect(result).toEqual({ pushId: 'test-id' });
  });

  it('marks the push as not on the main branch when the branch differs from the default', async () => {
    await pushFiles({ ...options, defaultBranch: 'main' });

    expect(remotes.push).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ isMainBranch: false }),
      expect.anything()
    );
  });

  it('lets API errors through', async () => {
    remotes.push.mockRejectedValue(new ReuniteApiError('Deprecated.', 412));

    await expect(pushFiles(options)).rejects.toThrow('Deprecated.');
  });

  it('hands the sunset warning to the caller', async () => {
    const sunsetWarning = { sunsetDate: new Date('2030-01-01T00:00:00Z'), isSunsetExpired: false };
    vi.mocked(ReuniteApi).mockImplementation(function (this: any): any {
      this.remotes = remotes;
      this.getSunsetWarning = vi.fn(() => sunsetWarning);
    });
    const onSunsetWarning = vi.fn();

    await pushFiles({ ...options, onSunsetWarning });

    expect(onSunsetWarning).toHaveBeenCalledWith(sunsetWarning);
  });
});

describe('collectFilesToPush()', () => {
  it('collects files from a directory and preserves the file structure', () => {
    /*
      test-folder
      ├── app
      │   └── index.html
      ├── another-ref.yaml
      └── openapi.yaml
    */
    vi.spyOn(fs, 'statSync').mockImplementation(
      (filePath) =>
        ({
          isDirectory() {
            return filePath === 'test-folder' || filePath === path.join('test-folder', 'app');
          },
        }) as any
    );
    vi.spyOn(fs, 'readdirSync').mockImplementation((dirPath): any => {
      if (dirPath === 'test-folder') {
        return ['app', 'another-ref.yaml', 'openapi.yaml'];
      }
      if (dirPath === path.join('test-folder', 'app')) {
        return ['index.html'];
      }
      throw new Error('Not a directory');
    });

    expect(collectFilesToPush(['test-folder'])).toEqual([
      {
        name: path.join('app', 'index.html'),
        path: path.resolve('test-folder', 'app', 'index.html'),
      },
      { name: 'another-ref.yaml', path: path.resolve('test-folder', 'another-ref.yaml') },
      { name: 'openapi.yaml', path: path.resolve('test-folder', 'openapi.yaml') },
    ]);
  });

  it('collects nothing when no files are given', () => {
    expect(collectFilesToPush([])).toEqual([]);
  });
});
