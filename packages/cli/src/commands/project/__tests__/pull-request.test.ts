import { HandledError, logger } from '@redocly/openapi-core';
import { RedoclyOAuthClient, ReuniteApiClient } from '@redocly/reunite-integration';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { setTimeout } from 'node:timers/promises';

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
vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }));

const GIT_OUTPUT: Record<string, string | undefined> = {
  'remote get-url origin': 'https://app.cloud.redocly.com/api/orgs/acme/projects/my%20docs/git',
  'branch --show-current': 'fix-typo',
  'rev-parse --verify --quiet refs/remotes/origin/fix-typo': 'c'.repeat(40),
  'log -1 --format=%s': 'Fix a typo in the quickstart',
};
const PROJECT_UI_URL = 'https://app.cloud.redocly.com/org/acme/project/my%20docs';
const PREVIEW_URL = 'https://my-docs-fix-typo.preview.redocly.app';

function commandArgs<T extends CommandArgv>(argv: T): CommandArgs<T> {
  return { argv, config: {} as any, version: '2.0.0' };
}

describe('redocly project pull-request create', () => {
  const getAccessToken = vi.fn();
  const request = vi.fn();
  let gitOutput: Record<string, string | undefined>;
  let buildPages: { url: string }[][];

  beforeEach(() => {
    gitOutput = { ...GIT_OUTPUT };
    buildPages = [[{ url: PREVIEW_URL }]];
    vi.mocked(readGit).mockImplementation(async (args) => gitOutput[args.join(' ')]);
    vi.mocked(RedoclyOAuthClient).mockImplementation(function () {
      return { getAccessToken } as any;
    });
    vi.mocked(ReuniteApiClient).mockImplementation(function () {
      return { request } as any;
    });
    getAccessToken.mockResolvedValue('token');
    request.mockImplementation(async (url: string) =>
      url.includes('/builds?')
        ? Response.json({ data: buildPages.shift() ?? [] })
        : Response.json({ number: 7 })
    );
    vi.spyOn(logger, 'output').mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.mocked(setTimeout).mockImplementation((async (delay: number) => {
      vi.setSystemTime(Date.now() + delay);
    }) as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens a pull request for the current branch, titled with the last commit, and prints its URL and preview URL', async () => {
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
    expect(request).toHaveBeenLastCalledWith(
      'https://app.cloud.redocly.com/api/orgs/acme/projects/my%20docs/builds?limit=1&filter=branchName%3Afix-typo',
      expect.objectContaining({ headers: expect.objectContaining({ Cookie: 'accessToken=token' }) })
    );
    expect(vi.mocked(logger.output).mock.calls).toEqual([
      [`Pull request: ${PROJECT_UI_URL}/pull-requests/7\n`],
      [`Preview: ${PREVIEW_URL}\n`],
    ]);
  });

  it('waits for the first build of the branch to print its preview URL', async () => {
    buildPages = [[], [], [{ url: PREVIEW_URL }]];

    await handleProjectPullRequestCreate(commandArgs<ProjectPullRequestCreateArgv>({}));

    expect(logger.output).toHaveBeenLastCalledWith(`Preview: ${PREVIEW_URL}\n`);
  });

  it('links the builds page when no build starts in 20 seconds', async () => {
    buildPages = [];
    const startedAt = Date.now();

    await handleProjectPullRequestCreate(commandArgs<ProjectPullRequestCreateArgv>({}));

    expect(Date.now() - startedAt).toBe(20_000);
    expect(logger.output).toHaveBeenLastCalledWith(
      `Preview: no build yet. See the builds: ${PROJECT_UI_URL}/deployments?branch=fix-typo\n`
    );
  });

  it('still prints the pull request when the builds cannot be read', async () => {
    request.mockResolvedValueOnce(Response.json({ number: 7 }));
    request.mockRejectedValueOnce(new Error('Failed to fetch.'));

    await handleProjectPullRequestCreate(commandArgs<ProjectPullRequestCreateArgv>({}));

    expect(vi.mocked(logger.output).mock.calls).toEqual([
      [`Pull request: ${PROJECT_UI_URL}/pull-requests/7\n`],
      [`Preview: no build yet. See the builds: ${PROJECT_UI_URL}/deployments?branch=fix-typo\n`],
    ]);
  });

  it('quotes a branch name with a comma in the builds filter', async () => {
    gitOutput['branch --show-current'] = 'fix,typo';
    gitOutput['rev-parse --verify --quiet refs/remotes/origin/fix,typo'] = 'c'.repeat(40);

    await handleProjectPullRequestCreate(commandArgs<ProjectPullRequestCreateArgv>({}));

    expect(request).toHaveBeenLastCalledWith(
      expect.stringContaining(`&filter=${encodeURIComponent('branchName:"fix,typo"')}`),
      expect.anything()
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
