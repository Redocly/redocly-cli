import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { Location } from '../../../ref-utils.js';
import { Source } from '../../../resolve.js';
import type { DiffResult } from '../../types.js';
import { htmlDiff } from '../html.js';
import { markdownDiff } from '../markdown.js';
import { stylishDiff } from '../stylish.js';

// format.test.ts — vitest runs with FORCE_COLOR=1, so the codes are stripped before snapshotting
function stripColors(output: string): string {
  // oxlint-disable-next-line no-control-regex
  return output.replace(/\x1b\[\d+m/g, '');
}

const base = new Source(
  'base.yaml',
  outdent`
    openapi: 3.1.0
    paths:
      /pets:
        get:
          parameters:
            - name: limit
              in: query
              schema: { type: integer }
        post:
          requestBody:
            content:
              application/json:
                schema:
                  pattern: 'a'
        delete:
          summary: <script>alert(1)</script>
  `
);

const revision = new Source(
  'revision.yaml',
  outdent`
    openapi: 3.1.0
    paths:
      /pets:
        get:
          parameters:
            - name: limit
              in: query
              required: true
              schema: { type: integer }
        post:
          requestBody:
            content:
              application/json:
                schema:
                  pattern: 'a|b'
    components:
      schemas:
        Pet:
          type: object
  `
);

const at = (source: Source, pointer: string) => new Location(source, pointer);

/**
 * One result carrying every shape the reports have to survive: a removal located in the
 * base document, a property change located in both, an added component, a change no rule
 * judged — and content that fights the output format, so the escaping shows up in the
 * snapshots below.
 */
const RESULT: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 3, nonBreaking: 1 },
  changes: [
    {
      key: '#/paths/~1pets/delete',
      kind: 'removed',
      typeName: 'Operation',
      base: {
        location: at(base, '#/paths/~1pets/delete'),
        value: { summary: '<script>alert(1)</script>' },
      },
      compat: 'breaking',
      verdicts: [
        {
          ruleId: 'operation-removed',
          message: 'Operation was removed.',
          location: at(base, '#/paths/~1pets/delete'),
        },
      ],
    },
    {
      key: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'modified',
      typeName: 'Parameter',
      base: {
        location: at(base, '#/paths/~1pets/get/parameters/0/required'),
        value: undefined,
      },
      revision: {
        location: at(revision, '#/paths/~1pets/get/parameters/0/required'),
        value: true,
      },
      compat: 'breaking',
      verdicts: [
        {
          ruleId: 'parameter-became-required',
          message: 'Parameter became required.',
          location: at(revision, '#/paths/~1pets/get/parameters/0/required'),
        },
      ],
    },
    {
      key: '#/paths/~1pets/post/requestBody/content/application~1json/schema',
      property: 'pattern',
      kind: 'modified',
      typeName: 'Schema',
      base: {
        location: at(
          base,
          '#/paths/~1pets/post/requestBody/content/application~1json/schema/pattern'
        ),
        value: 'a',
      },
      revision: {
        location: at(
          revision,
          '#/paths/~1pets/post/requestBody/content/application~1json/schema/pattern'
        ),
        value: 'a|b',
      },
      compat: 'breaking',
      verdicts: [
        {
          ruleId: 'string-length-changed',
          // A pattern is free text, so a message about it can hold the markdown cell
          // separator and the code-span marker.
          message: "`pattern` changed from 'a' to 'a|b'.",
          location: at(
            revision,
            '#/paths/~1pets/post/requestBody/content/application~1json/schema/pattern'
          ),
        },
      ],
    },
    {
      key: '#/components/schemas/Pet',
      kind: 'added',
      typeName: 'Schema',
      revision: {
        location: at(revision, '#/components/schemas/Pet'),
        value: { type: 'object' },
      },
      compat: 'non-breaking',
      verdicts: [],
    },
  ],
};

describe('stylishDiff', () => {
  it('groups changes per operation, worst first, each with its verdicts and location', () => {
    // vitest.config.ts forces FORCE_COLOR=1, so the ANSI codes are stripped here.
    expect(stripColors(stylishDiff(RESULT))).toMatchInlineSnapshot(`
      "components
        ✔ non-breaking  added  components/schemas/Pet
            at revision.yaml:19:7

      DELETE /pets
        ✖ breaking      removed  paths · /pets · delete
            Operation was removed. (operation-removed)
            at base.yaml:16:7

      GET /pets
        ✖ breaking      modified  parameters/{query:limit} · required
            Parameter became required. (parameter-became-required)
            at revision.yaml:8:21

      POST /pets
        ✖ breaking      modified  requestBody/content/application~1json/schema · pattern
            \`pattern\` changed from 'a' to 'a|b'. (string-length-changed)
            at revision.yaml:15:24

      3 breaking, 1 non-breaking."
    `);
  });
});

describe('markdownDiff', () => {
  it('renders one table row per change', () => {
    expect(markdownDiff(RESULT)).toMatchInlineSnapshot(`
      "## API diff

      **3** breaking · **1** non-breaking

      | Impact | Change | Location | Details |
      | --- | --- | --- | --- |
      | 🔴 breaking | removed | \`#/paths/~1pets/delete\` | Operation was removed. \`operation-removed\` |
      | 🔴 breaking | modified | \`#/paths/~1pets/get/parameters/{query:limit} · required\` | Parameter became required. \`parameter-became-required\` |
      | 🔴 breaking | modified | \`#/paths/~1pets/post/requestBody/content/application~1json/schema · pattern\` | \\\`pattern\\\` changed from 'a' to 'a\\|b'. \`string-length-changed\` |
      | 🟢 non-breaking | added | \`#/components/schemas/Pet\` |  |"
    `);
  });
});

describe('htmlDiff', () => {
  it('renders a self-contained page', async () => {
    const output = htmlDiff(RESULT);

    // Kept as a real .html file: the snapshot can be opened in a browser to review it.
    await expect(output).toMatchFileSnapshot(
      join(dirname(fileURLToPath(import.meta.url)), '__snapshots__', 'html-report.html')
    );
    // The report is opened straight from disk, so it must pull in nothing.
    expect(output).not.toMatch(/src="http|href="http/);
  });
});
