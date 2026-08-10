import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanColors } from '../../../utils/miscellaneous.js';
import type { DiffResult } from '../engine/types.js';
import { htmlDiff } from '../serializers/html.js';
import { markdownDiff } from '../serializers/markdown.js';
import { stylishDiff } from '../serializers/stylish.js';

/**
 * One result carrying every shape the reports have to survive: a removal located in the
 * base document, a property change located in both, an added component, the synthetic
 * path-rename change, a change no rule judged — and content that fights the output
 * format, so the escaping shows up in the snapshots below.
 */
const RESULT: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 3, nonBreaking: 2 },
  changes: [
    {
      pointer: '#/paths/~1pets/delete',
      kind: 'removed',
      typeName: 'Operation',
      base: {
        pointer: '#/paths/~1pets/delete',
        file: 'base.yaml',
        line: 30,
        col: 3,
        value: { summary: '<script>alert(1)</script>' },
      },
      compat: 'breaking',
      verdicts: [
        { ruleId: 'operation-removed', compat: 'breaking', message: 'Operation was removed.' },
      ],
    },
    {
      pointer: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'changed',
      typeName: 'Parameter',
      base: {
        pointer: '#/paths/~1pets/get/parameters/0/required',
        file: 'base.yaml',
        line: 9,
        col: 21,
      },
      revision: {
        pointer: '#/paths/~1pets/get/parameters/1/required',
        file: 'revision.yaml',
        line: 11,
        col: 21,
        value: true,
      },
      compat: 'breaking',
      verdicts: [
        {
          ruleId: 'parameter-became-required',
          compat: 'breaking',
          message: 'Parameter became required.',
        },
      ],
    },
    {
      pointer: '#/paths/~1pets/post/requestBody/content/application~1json/schema',
      property: 'pattern',
      kind: 'changed',
      typeName: 'Schema',
      revision: {
        pointer: '#/paths/~1pets/post/requestBody/content/application~1json/schema/pattern',
        file: 'revision.yaml',
        line: 18,
        col: 22,
        value: 'a|b',
      },
      compat: 'breaking',
      verdicts: [
        {
          ruleId: 'string-length-changed',
          compat: 'breaking',
          // A pattern is free text, so a message about it can hold the markdown cell
          // separator and the code-span marker.
          message: "`pattern` changed from 'a' to 'a|b'.",
        },
      ],
    },
    {
      pointer: '#/components/schemas/Pet',
      kind: 'added',
      typeName: 'Schema',
      revision: {
        pointer: '#/components/schemas/Pet',
        file: 'revision.yaml',
        line: 20,
        col: 5,
        value: { type: 'object' },
      },
      compat: 'non-breaking',
    },
    {
      pointer: '#/paths/~1pet~1{id}',
      property: 'path',
      kind: 'changed',
      typeName: 'PathItem',
      base: {
        pointer: '#/paths/~1pet~1{id}',
        file: 'base.yaml',
        line: 4,
        col: 3,
        value: '/pet/{id}',
      },
      revision: {
        pointer: '#/paths/~1pet~1{petId}',
        file: 'revision.yaml',
        line: 4,
        col: 3,
        value: '/pet/{petId}',
      },
      compat: 'non-breaking',
    },
  ],
};

describe('stylishDiff', () => {
  it('groups changes per operation, worst first, each with its verdicts and location', () => {
    // vitest.config.ts forces FORCE_COLOR=1, so the ANSI codes are stripped here.
    expect(cleanColors(stylishDiff(RESULT))).toMatchInlineSnapshot(`
      "/pet/{petId}
        ✔ non-breaking  changed  paths · /pet/{id} · path
            at revision.yaml:4:3

      components
        ✔ non-breaking  added  components/schemas/Pet
            at revision.yaml:20:5

      DELETE /pets
        ✖ breaking      removed  paths · /pets · delete
            Operation was removed. (operation-removed)
            at base.yaml:30:3

      GET /pets
        ✖ breaking      changed  parameters/{query:limit} · required
            Parameter became required. (parameter-became-required)
            at revision.yaml:11:21

      POST /pets
        ✖ breaking      changed  requestBody/content/application~1json/schema · pattern
            \`pattern\` changed from 'a' to 'a|b'. (string-length-changed)
            at revision.yaml:18:22

      3 breaking, 2 non-breaking."
    `);
  });
});

describe('markdownDiff', () => {
  it('renders one table row per change', () => {
    expect(markdownDiff(RESULT)).toMatchInlineSnapshot(`
      "## API diff

      **3** breaking · **2** non-breaking

      | Impact | Change | Location | Details |
      | --- | --- | --- | --- |
      | 🔴 breaking | removed | \`#/paths/~1pets/delete\` | Operation was removed. \`operation-removed\` |
      | 🔴 breaking | changed | \`#/paths/~1pets/get/parameters/{query:limit} · required\` | Parameter became required. \`parameter-became-required\` |
      | 🔴 breaking | changed | \`#/paths/~1pets/post/requestBody/content/application~1json/schema · pattern\` | \\\`pattern\\\` changed from 'a' to 'a\\|b'. \`string-length-changed\` |
      | 🟢 non-breaking | added | \`#/components/schemas/Pet\` |  |
      | 🟢 non-breaking | changed | \`#/paths/~1pet~1{id} · path\` |  |"
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
