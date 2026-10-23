import { HandledError, logger } from '@redocly/openapi-core';
import { RedoclyOAuthClient, ReuniteApiClient } from '@redocly/reunite-integration';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';

import type { CommandArgv } from '../../../types.js';
import type { CommandArgs } from '../../../wrapper.js';
import {
  type ProjectPullRequestCreateArgv,
  handleProjectPullRequestCreate,
} from '../pull-request.js';
import type * as GitUtils from '../utils.js';
import { readGit } from '../utils.js';

vi.mock('../utils.js', async () => {
  const actual = await vi.importActual<typeof GitUtils>('../utils.js');
  return { ...actual, readGit: vi.fn() };
});
vi.mock('@redocly/reunite-integration', async () => {
  const actual = await vi.importActual<object>('@redocly/reunite-integration');
  return { ...actual, RedoclyOAuthClient: vi.fn(), ReuniteApiClient: vi.fn() };
});

const GIT_OUTPUT: Record<string, string | undefined> = {
  'remote get-url origin': 'https://app.cloud.redocly.com/api/orgs/acme/projects/my%20docs/git',
  'branch --show-current': 'fix-typo',
  'rev-parse --verify --quiet refs/remotes/origin/fix-typo': 'c'.repeat(40),
  'log -1 --format=%s': 'Fix a typo in the quickstart',
};

function commandArgs<T extends CommandArgv>(argv: T): CommandArgs<T> {
  return { argv, config: {} as any, version: '2.0.0' };
}

describe('redocly project pull-request create', () => {
  const getAccessToken = vi.fn();
  const request = vi.fn();
  let gitOutput: Record<string, string | undefined>;

  beforeEach(() => {
    gitOutput = { ...GIT_OUTPUT };
    vi.mocked(readGit).mockImplementation(async (args) => gitOutput[args.join(' ')]);
    vi.mocked(RedoclyOAuthClient).mockImplementation(function () {
      return { getAccessToken } as any;
    });
    vi.mocked(ReuniteApiClient).mockImplementation(function () {
      return { request } as any;
    });
    getAccessToken.mockResolvedValue('token');
    request.mockResolvedValue(Response.json({ number: 7 }));
    vi.spyOn(logger, 'output').mockImplementation(() => {});
  });

  it('opens a pull request for the current branch, titled with the last commit, and prints its URL', async () => {
    await handleProjectPullRequestCreate(commandArgs<ProjectPullRequestCreateArgv>({}));

    expect(getAccessToken).toHaveBeenCalledWith('https://app.cloud.redocly.com');
    expect(request).toHaveBeenCalledWith(
      'https://app.cloud.redocly.com/api/orgs/acme/projects/my%20docs/pull-requests',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Cookie: 'accessToken=token' }),
      })
    );
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      branchName: 'fix-typo',
      title: 'Fix a typo in the quickstart',
    });
    expect(logger.output).toHaveBeenCalledWith(
      'https://app.cloud.redocly.com/org/acme/project/my%20docs/pull-requests/7\n'
    );
  });

  it('sends the title, body, base branch, and draft state it is given', async () => {
    await handleProjectPullRequestCreate(
      commandArgs<ProjectPullRequestCreateArgv>({
        title: 'Update the quickstart',
        body: 'Adds the install step.',
        base: 'next',
        draft: true,
      })
    );

    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      branchName: 'fix-typo',
      targetBranchName: 'next',
      title: 'Update the quickstart',
      description: 'Adds the install step.',
      isDraft: true,
    });
  });

  it('reads the body from a file', async () => {
    const bodyFile = path.join(mkdtempSync(path.join(tmpdir(), 'pr-body-')), 'body.md');
    writeFileSync(bodyFile, 'Adds the install step.\n');

    await handleProjectPullRequestCreate(
      commandArgs<ProjectPullRequestCreateArgv>({ 'body-file': bodyFile })
    );

    expect(JSON.parse(request.mock.calls[0][1].body).description).toBe('Adds the install step.\n');
  });

  it('reads the body from standard input for `--body-file -`', async () => {
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(
      Readable.from(['Adds the ', 'install step.']) as any
    );

    await handleProjectPullRequestCreate(
      commandArgs<ProjectPullRequestCreateArgv>({ 'body-file': '-' })
    );

    expect(JSON.parse(request.mock.calls[0][1].body).description).toBe('Adds the install step.');
  });

  it.each([
    {
      when: 'the body file cannot be read',
      git: {},
      argv: { 'body-file': path.join(tmpdir(), 'missing-pr-body.md') },
      error: "Can't read the body file",
    },
    {
      when: 'origin is not a Redocly-hosted project',
      git: { 'remote get-url origin': 'https://github.com/acme/docs.git' },
      error: 'Run this command in a clone of a Redocly-hosted project',
    },
    {
      when: 'the repository has no origin',
      git: { 'remote get-url origin': undefined },
      error: 'Run this command in a clone of a Redocly-hosted project',
    },
    {
      when: 'no branch is checked out',
      git: { 'branch --show-current': '' },
      error: 'Check out the branch',
    },
    {
      when: 'the branch is not pushed',
      git: { 'rev-parse --verify --quiet refs/remotes/origin/fix-typo': undefined },
      error: 'Push the branch first: `git push -u origin fix-typo`.',
    },
  ])('fails without a request when $when', async ({ git, argv = {}, error }) => {
    Object.assign(gitOutput, git);

    await expect(
      handleProjectPullRequestCreate(commandArgs<ProjectPullRequestCreateArgv>(argv))
    ).rejects.toThrow(error);
    expect(request).not.toHaveBeenCalled();
  });

  it('asks to log in when there is no token for the host', async () => {
    getAccessToken.mockResolvedValue(null);

    await expect(
      handleProjectPullRequestCreate(commandArgs<ProjectPullRequestCreateArgv>({}))
    ).rejects.toThrow('Run `redocly login --residency https://app.cloud.redocly.com`.');
    expect(request).not.toHaveBeenCalled();
  });

  it('reports the reason Reunite gives for a rejected pull request', async () => {
    request.mockResolvedValue(
      Response.json({ title: 'Forbidden', detail: 'Missing permission.' }, { status: 403 })
    );

    const result = handleProjectPullRequestCreate(commandArgs<ProjectPullRequestCreateArgv>({}));

    await expect(result).rejects.toBeInstanceOf(HandledError);
    await expect(result).rejects.toThrow('Failed to open a pull request: Missing permission.');
  });
});
