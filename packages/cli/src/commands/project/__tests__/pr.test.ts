import { HandledError } from '@redocly/openapi-core';
import type { PullRequestStatus } from '@redocly/reunite-integration';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';

import { formatPullRequestStatus, readBody } from '../pr.js';

const PR_URL = 'https://app.cloud.redocly.com/org/acme/project/docs/pull-requests/7';
const PREVIEW_URL = 'https://docs-fix-typo.preview.redocly.app';

describe('readBody', () => {
  it('returns the body it is given', async () => {
    await expect(readBody({ body: 'Adds the install step.' })).resolves.toBe(
      'Adds the install step.'
    );
  });

  it('reads the body from a file', async () => {
    const bodyFile = path.join(mkdtempSync(path.join(tmpdir(), 'pr-body-')), 'body.md');
    writeFileSync(bodyFile, 'Adds the install step.\n');

    await expect(readBody({ 'body-file': bodyFile })).resolves.toBe('Adds the install step.\n');
  });

  it('reads the body from standard input for `--body-file -`', async () => {
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(
      Readable.from(['Adds the ', 'install step.']) as any
    );

    await expect(readBody({ 'body-file': '-' })).resolves.toBe('Adds the install step.');
  });

  it('explains a body file it cannot read', async () => {
    const result = readBody({ 'body-file': path.join(tmpdir(), 'missing-pr-body.md') });

    await expect(result).rejects.toBeInstanceOf(HandledError);
    await expect(result).rejects.toThrow("Can't read the body file");
  });
});

describe('formatPullRequestStatus', () => {
  const status: PullRequestStatus = {
    pullRequest: {
      id: 'pr_1',
      number: 7,
      title: 'Fix a typo',
      status: 'OPEN',
      isDraft: false,
      reviewDecision: 'APPROVED',
    },
    checks: [
      {
        context: 'Redocly preview',
        state: 'SUCCESS',
        description: 'Build succeeded',
        targetUrl: PREVIEW_URL,
      },
      { context: 'Link check', state: 'IN_PROGRESS' },
    ],
    previewUrl: PREVIEW_URL,
  };

  it('prints the state, review, checks, and preview URL', () => {
    expect(formatPullRequestStatus(status, PR_URL)).toBe(
      [
        '#7 Fix a typo',
        PR_URL,
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

  it('shows a draft without a review or checks, and a preview that is not deployed', () => {
    const draft: PullRequestStatus = {
      pullRequest: { ...status.pullRequest, isDraft: true, reviewDecision: undefined },
      checks: [],
    };

    expect(formatPullRequestStatus(draft, PR_URL)).toContain(
      'State: draft\nReview: none\nChecks: none\nPreview: not ready\n'
    );
  });

  it.each([
    ['MERGED', 'merged'],
    ['CLOSED', 'closed'],
  ] as const)('shows a %s pull request as %s, draft or not', (state, shown) => {
    const pullRequest = { ...status.pullRequest, status: state, isDraft: true };

    expect(formatPullRequestStatus({ ...status, pullRequest }, PR_URL)).toContain(
      `State: ${shown}\n`
    );
  });
});
