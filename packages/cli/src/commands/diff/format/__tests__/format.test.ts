import { createConfig, diffDocuments, makeDocumentFromString } from '@redocly/openapi-core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { printGithubActions } from '../github-actions.js';
import { htmlDiff } from '../html.js';
import { jsonDiff } from '../json.js';
import { markdownDiff } from '../markdown.js';
import { nextVersionDiff } from '../next-version.js';
import { stylishDiff } from '../stylish.js';

const documentOf = (fixture: string, side: 'base' | 'revision') =>
  makeDocumentFromString(
    readFileSync(join(import.meta.dirname, 'fixtures', fixture, `${side}.yaml`), 'utf8'),
    `${side}.yaml`
  );

const config = await createConfig({ extends: ['diff-recommended'] });

// Every shape a report has to survive: a removal found in the base document, changes found in
// the revision, an addition, a change no rule judges, a webhook — and content that fights the
// output format, so the escaping shows up in the snapshots.
const cafe = diffDocuments({
  base: documentOf('cafe', 'base'),
  revision: documentOf('cafe', 'revision'),
  config,
});

const kitchen = diffDocuments({
  base: documentOf('kitchen', 'base'),
  revision: documentOf('kitchen', 'revision'),
  config,
});

// vitest runs with FORCE_COLOR=1, so the stylish report is snapshotted without its colours.
describe('stylishDiff', () => {
  it('should group the changes per endpoint and webhook, worst first, with their verdicts and location', () => {
    expect(stripVTControlCharacters(stylishDiff(cafe))).toMatchSnapshot();
  });

  it('should group AsyncAPI changes per channel, operation and server', () => {
    expect(stripVTControlCharacters(stylishDiff(kitchen))).toMatchSnapshot();
  });
});

describe('markdownDiff', () => {
  it('should render one table row per change', () => {
    expect(markdownDiff(cafe)).toMatchSnapshot();
  });
});

describe('htmlDiff', () => {
  it('should render a self-contained page', () => {
    const output = htmlDiff(cafe);

    expect(output).toMatchSnapshot();
    // The report is opened straight from disk, so it must pull in nothing.
    expect(output).not.toMatch(/src="http|href="http/);
  });
});

describe('jsonDiff', () => {
  it('should render the result with each change located in its file', () => {
    expect(jsonDiff(cafe)).toMatchSnapshot();
  });
});

describe('printGithubActions', () => {
  it('should annotate each verdict of a breaking change as an error and skip the rest', () => {
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((text: string | Uint8Array) => {
      output += text;
      return true;
    });

    printGithubActions(cafe);

    expect(output).toMatchSnapshot();
  });
});

describe('nextVersionDiff', () => {
  it('should bump the base version as far as the changes require', () => {
    expect(nextVersionDiff(cafe)).toMatchSnapshot();
  });
});
