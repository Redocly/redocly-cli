import { HandledError, logger } from '@redocly/openapi-core';
import { RedoclyOAuthClient, ReuniteApiClient } from '@redocly/reunite-integration';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';

import type { CommandArgv } from '../../../types.js';
import type { CommandArgs } from '../../../wrapper.js';
import { type ProjectPrCreateArgv, handleProjectPrCreate, handleProjectPrStatus } from '../pr.js';
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
const PROJECT_API_URL = 'https://app.cloud.redocly.com/api/orgs/acme/projects/my%20docs';
const PROJECT_UI_URL = 'https://app.cloud.redocly.com/org/acme/project/my%20docs';
const PREVIEW_URL = 'https://my-docs-fix-typo.preview.redocly.app';
const HEAD = 'c'.repeat(40);

function commandArgs<T extends CommandArgv>(argv: T): CommandArgs<T> {
  return { argv, config: {} as any, version: '2.0.0' };
}

describe('redocly project pr', () => {
  const getAccessToken = vi.fn();
  const request = vi.fn();
  let gitOutput: Record<string, string | undefined>;
  let responses: Record<string, unknown>;

  beforeEach(() => {
    gitOutput = { ...GIT_OUTPUT };
    responses = { 'POST /pull-requests': { number: 7 } };
    vi.mocked(readGit).mockImplementation(async (args) => gitOutput[args.join(' ')]);
    vi.mocked(RedoclyOAuthClient).mockImplementation(function () {
      return { getAccessToken } as any;
    });
    vi.mocked(ReuniteApiClient).mockImplementation(function () {
      return { request } as any;
    });
    getAccessToken.mockResolvedValue('token');
    request.mockImplementation(async (url: string, { method = 'GET' }: { method?: string }) => {
      const key = `${method} ${url.slice(PROJECT_API_URL.length)}`;
      return key in responses
        ? Response.json(responses[key])
        : Response.json({ title: 'Not Found' }, { status: 404 });
    });
    vi.spyOn(logger, 'output').mockImplementation(() => {});
  });

  describe('create', () => {
    it('opens a pull request for the current branch, titled with the last commit, and prints its URL', async () => {
      await handleProjectPrCreate(commandArgs<ProjectPrCreateArgv>({}));

      expect(getAccessToken).toHaveBeenCalledWith('https://app.cloud.redocly.com');
      expect(request).toHaveBeenCalledWith(
        `${PROJECT_API_URL}/pull-requests`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Cookie: 'accessToken=token' }),
        })
      );
      expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
        branchName: 'fix-typo',
        title: 'Fix a typo in the quickstart',
      });
      expect(logger.output).toHaveBeenCalledWith(`${PROJECT_UI_URL}/pull-requests/7\n`);
    });

    it('sends the title, body, base branch, and draft state it is given', async () => {
      await handleProjectPrCreate(
        commandArgs<ProjectPrCreateArgv>({
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

      await handleProjectPrCreate(commandArgs<ProjectPrCreateArgv>({ 'body-file': bodyFile }));

      expect(JSON.parse(request.mock.calls[0][1].body).description).toBe(
        'Adds the install step.\n'
      );
    });

    it('reads the body from standard input for `--body-file -`', async () => {
      vi.spyOn(process, 'stdin', 'get').mockReturnValue(
        Readable.from(['Adds the ', 'install step.']) as any
      );

      await handleProjectPrCreate(commandArgs<ProjectPrCreateArgv>({ 'body-file': '-' }));

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
        error: 'Check out a branch first.',
      },
      {
        when: 'the branch is not pushed',
        git: { 'rev-parse --verify --quiet refs/remotes/origin/fix-typo': undefined },
        error: 'Push the branch first: `git push -u origin fix-typo`.',
      },
    ])('fails without a request when $when', async ({ git, argv = {}, error }) => {
      Object.assign(gitOutput, git);

      await expect(handleProjectPrCreate(commandArgs<ProjectPrCreateArgv>(argv))).rejects.toThrow(
        error
      );
      expect(request).not.toHaveBeenCalled();
    });

    it('asks to log in when there is no token for the host', async () => {
      getAccessToken.mockResolvedValue(null);

      await expect(handleProjectPrCreate(commandArgs<ProjectPrCreateArgv>({}))).rejects.toThrow(
        'Run `redocly login --residency https://app.cloud.redocly.com`.'
      );
      expect(request).not.toHaveBeenCalled();
    });

    it('reports the reason Reunite gives for a rejected pull request', async () => {
      responses = {};
      request.mockResolvedValueOnce(
        Response.json({ title: 'Forbidden', detail: 'Missing permission.' }, { status: 403 })
      );

      const result = handleProjectPrCreate(commandArgs<ProjectPrCreateArgv>({}));

      await expect(result).rejects.toBeInstanceOf(HandledError);
      await expect(result).rejects.toThrow('Failed to open a pull request: Missing permission.');
    });

    it('reports a failed connection as a handled error', async () => {
      request.mockRejectedValueOnce(new Error('Failed to fetch. Caused by ECONNREFUSED.'));

      await expect(handleProjectPrCreate(commandArgs<ProjectPrCreateArgv>({}))).rejects.toThrow(
        new HandledError('Failed to open a pull request: Failed to fetch. Caused by ECONNREFUSED.')
      );
    });
  });

  describe('status', () => {
    const pullRequest = {
      id: 'pr_1',
      number: 7,
      title: 'Fix a typo in the quickstart',
      status: 'OPEN',
      isDraft: false,
      reviewDecision: 'APPROVED',
      headCommitHash: HEAD,
    };

    beforeEach(() => {
      responses = {
        'GET /pull-requests?branchName=fix-typo&limit=1': { data: [pullRequest] },
        'GET /pull-requests/pr_1/checks': [
          {
            context: 'Redocly preview',
            state: 'SUCCESS',
            description: 'Build succeeded',
            targetUrl: PREVIEW_URL,
          },
          { context: 'Link check', state: 'IN_PROGRESS' },
        ],
        [`GET /builds?limit=1&filter=commitHash:${HEAD}`]: {
          data: [{ url: PREVIEW_URL, deploymentStatus: 'SUCCESS' }],
        },
      };
    });

    it('prints the state, review, checks, and preview URL of the pull request for the current branch', async () => {
      await handleProjectPrStatus({ version: '2.0.0' });

      expect(logger.output).toHaveBeenCalledWith(
        [
          '#7 Fix a typo in the quickstart',
          `${PROJECT_UI_URL}/pull-requests/7`,
          'State: open',
          'Review: approved',
          'Checks:',
          `  passed    Redocly preview - Build succeeded ${PREVIEW_URL}`,
          '  pending   Link check',
          `Preview: ${PREVIEW_URL}`,
          '',
        ].join('\n')
      );
    });

    it('shows a draft without a review or checks, and no preview before it is deployed', async () => {
      responses['GET /pull-requests?branchName=fix-typo&limit=1'] = {
        data: [{ ...pullRequest, isDraft: true, reviewDecision: undefined }],
      };
      responses['GET /pull-requests/pr_1/checks'] = [];
      responses[`GET /builds?limit=1&filter=commitHash:${HEAD}`] = {
        data: [{ url: PREVIEW_URL, deploymentStatus: 'IN_PROGRESS' }],
      };

      await handleProjectPrStatus({ version: '2.0.0' });

      expect(logger.output).toHaveBeenCalledWith(
        expect.stringContaining('State: draft\nReview: none\nChecks: none\nPreview: not ready\n')
      );
    });

    it.each([
      ['MERGED', 'merged'],
      ['CLOSED', 'closed'],
    ])('shows a %s pull request as %s', async (status, state) => {
      responses['GET /pull-requests?branchName=fix-typo&limit=1'] = {
        data: [{ ...pullRequest, status, isDraft: true }],
      };

      await handleProjectPrStatus({ version: '2.0.0' });

      expect(logger.output).toHaveBeenCalledWith(expect.stringContaining(`State: ${state}\n`));
    });

    it('points to `pr create` when the branch has no pull request', async () => {
      responses['GET /pull-requests?branchName=fix-typo&limit=1'] = { data: [] };

      await expect(handleProjectPrStatus({ version: '2.0.0' })).rejects.toThrow(
        'No pull request for `fix-typo`. Open one with `redocly project pr create`.'
      );
    });
  });
});
