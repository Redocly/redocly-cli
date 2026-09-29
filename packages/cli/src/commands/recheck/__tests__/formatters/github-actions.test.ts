import type { Problem } from '@redocly/recheck';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { outputGitHubActionsFormat } from '../../formatters/github-actions.js';
import { captureLogger } from '../capture-logger.js';

afterEach(() => vi.restoreAllMocks());

describe('outputGitHubActionsFormat', () => {
  it('escapes the properties and the message like core', () => {
    const { stdout } = captureLogger();
    const problem: Problem = {
      file: 'x,y.md',
      line: 3,
      column: 1,
      text: '',
      match: '',
      ruleName: 'a:b,c',
      severity: 'error',
      message: '100% done\r\nnext',
    };

    outputGitHubActionsFormat([problem]);

    expect(stdout).toEqual([
      '::error title=a%3Ab%2Cc,file=x%2Cy.md,line=3,endLine=3,col=1,endColumn=2::100%25 done%0D%0Anext\n',
    ]);
  });
});
