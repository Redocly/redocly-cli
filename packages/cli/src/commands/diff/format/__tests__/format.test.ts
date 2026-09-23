import { Location, Source, type DiffResult } from '@redocly/openapi-core';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { htmlDiff } from '../html.js';
import { markdownDiff } from '../markdown.js';
import { stylishDiff } from '../stylish.js';
import { loneNode } from './diff-node.js';

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
          summary: List pets
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
          summary: List all pets
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
  summary: { major: 3, minor: 1, patch: 1 },
  bump: 'major',
  changes: [
    {
      key: '#/paths/~1pets/delete',
      kind: 'removed',
      node: loneNode('Operation', at(base, '#/paths/~1pets/delete')),
      base: {
        location: at(base, '#/paths/~1pets/delete'),
        value: { summary: '<script>alert(1)</script>' },
      },
      impact: 'major',
      verdicts: [
        {
          ruleId: 'operation-removed',
          impact: 'major',
          message: 'Operation was removed.',
          location: at(base, '#/paths/~1pets/delete'),
        },
      ],
    },
    {
      key: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'modified',
      node: loneNode('Parameter', at(base, '#/paths/~1pets/get/parameters/{query:limit}')),
      base: {
        location: at(base, '#/paths/~1pets/get/parameters/0/required'),
        value: undefined,
      },
      revision: {
        location: at(revision, '#/paths/~1pets/get/parameters/0/required'),
        value: true,
      },
      impact: 'major',
      verdicts: [
        {
          ruleId: 'parameter-became-required',
          impact: 'major',
          message: 'Parameter became required.',
          location: at(revision, '#/paths/~1pets/get/parameters/0/required'),
        },
      ],
    },
    {
      key: '#/paths/~1pets/post/requestBody/content/application~1json/schema',
      property: 'pattern',
      kind: 'modified',
      node: loneNode(
        'Schema',
        at(base, '#/paths/~1pets/post/requestBody/content/application~1json/schema')
      ),
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
      impact: 'major',
      verdicts: [
        {
          ruleId: 'string-length-changed',
          impact: 'major',
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
      key: '#/paths/~1pets/get',
      property: 'summary',
      kind: 'modified',
      node: loneNode('Operation', at(base, '#/paths/~1pets/get')),
      base: {
        location: at(base, '#/paths/~1pets/get/summary'),
        value: 'List pets',
      },
      revision: {
        location: at(revision, '#/paths/~1pets/get/summary'),
        value: 'List all pets',
      },
      impact: 'patch',
      verdicts: [],
    },
    {
      key: '#/components/schemas/Pet',
      kind: 'added',
      node: loneNode('Schema', at(base, '#/components/schemas/Pet')),
      revision: {
        location: at(revision, '#/components/schemas/Pet'),
        value: { type: 'object' },
      },
      impact: 'minor',
      verdicts: [],
    },
  ],
};

describe('stylishDiff', () => {
  it('groups changes per operation, worst first, each with its verdicts and location', () => {
    expect(stripColors(stylishDiff(RESULT))).toMatchInlineSnapshot(`
      "components
        ✔ minor  added     schemas/Pet
            at revision.yaml:20:7

      DELETE /pets
        ✖ major  removed   paths · /pets · delete
            Operation was removed. (operation-removed)
            at base.yaml:17:7

      GET /pets
        ✖ major  modified  parameters/{query:limit} · required
            Parameter became required. (parameter-became-required)
            at revision.yaml:9:21
        · patch  modified  summary
            at revision.yaml:5:16

      POST /pets
        ✖ major  modified  requestBody/content/application/json/schema · pattern
            \`pattern\` changed from 'a' to 'a|b'. (string-length-changed)
            at revision.yaml:16:24

      3 major, 1 minor, 1 patch."
    `);
  });
});

describe('markdownDiff', () => {
  it('renders one table row per change', () => {
    expect(markdownDiff(RESULT)).toMatchInlineSnapshot(`
      "## API diff

      **3** major · **1** minor · **1** patch · requires a **major** bump

      | Impact | Change | Location | Details |
      | --- | --- | --- | --- |
      | 🟢 minor | added | \`#/components/schemas/Pet\` |  |
      | 🔴 major | removed | \`#/paths/~1pets/delete\` | Operation was removed. \`operation-removed\` |
      | ⚪ patch | modified | \`#/paths/~1pets/get · summary\` |  |
      | 🔴 major | modified | \`#/paths/~1pets/get/parameters/{query:limit} · required\` | Parameter became required. \`parameter-became-required\` |
      | 🔴 major | modified | \`#/paths/~1pets/post/requestBody/content/application~1json/schema · pattern\` | \\\`pattern\\\` changed from 'a' to 'a\\|b'. \`string-length-changed\` |"
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
