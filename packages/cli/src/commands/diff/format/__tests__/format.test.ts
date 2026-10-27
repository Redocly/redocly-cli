import { createConfig, diffDocuments, makeDocumentFromString } from '@redocly/openapi-core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { outdent } from 'outdent';

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
const cafe = await diffDocuments({
  base: documentOf('cafe', 'base'),
  revision: documentOf('cafe', 'revision'),
  config,
});

const kitchen = await diffDocuments({
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

  it('should head the changes of a path by its path when its $ref points to another path item', async () => {
    const menu = (pathItem: string, side: 'base' | 'revision') =>
      makeDocumentFromString(
        outdent`
          openapi: 3.1.0
          info: { title: Cafe, version: 1.0.0 }
          paths:
            /menu: { $ref: '#/components/pathItems/${pathItem}' }
          components:
            pathItems:
              Menu:
                get: { responses: { '200': { description: OK } } }
                delete: { responses: { '204': { description: Removed } } }
              Dishes:
                get: { responses: { '200': { description: OK } } }
        `,
        `${side}.yaml`
      );

    const result = await diffDocuments({
      base: menu('Menu', 'base'),
      revision: menu('Dishes', 'revision'),
      config,
    });

    expect(stripVTControlCharacters(stylishDiff(result))).toMatchInlineSnapshot(`
      "DELETE /menu
        ✖ major  removed
            Operation \`DELETE /menu\` was removed. (operation-removed)
            at base.yaml:9:15

      1 major, 0 minor, 0 patch."
    `);
  });
});

describe('markdownDiff', () => {
  it('should render one table row per change', () => {
    expect(markdownDiff(cafe)).toMatchSnapshot();
  });

  it('should fence a pointer with a backtick in it, as a backslash does not escape in a code span', async () => {
    const menu = (path: string, side: 'base' | 'revision') =>
      makeDocumentFromString(
        outdent`
          openapi: 3.1.0
          info: { title: Cafe, version: 1.0.0 }
          paths:
            ${path}: { get: { responses: { '200': { description: OK } } } }
        `,
        `${side}.yaml`
      );

    const result = await diffDocuments({
      base: menu("'/menu/`special`'", 'base'),
      revision: menu('/menu', 'revision'),
      config,
    });

    expect(markdownDiff(result).split('\n').slice(6)).toMatchInlineSnapshot(`
      [
        "| 🔴 major | removed | \`\` #/paths/~1menu~1\`special\` \`\` | base.yaml:4:22 | Path \\\`/menu/\\\`special\\\`\\\` was removed. \`path-removed\` |",
        "| 🟢 minor | added | \`#/paths/~1menu\` | revision.yaml:4:10 |  |",
      ]
    `);
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
