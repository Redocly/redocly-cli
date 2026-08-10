import { createConfig, makeDocumentFromString } from '@redocly/openapi-core';
import { outdent } from 'outdent';

import { DiffError, diffDocuments } from '../engine/index.js';
import type { DiffResult } from '../engine/types.js';

const BASE = outdent`
  openapi: 3.1.0
  info: { title: Test, version: '1.0' }
  paths:
    /pets:
      get:
        parameters:
          - name: limit
            in: query
            schema: { type: integer }
          - name: filter
            in: query
            schema: { type: string }
        responses:
          '200': { description: OK }
`;

const REVISION = outdent`
  openapi: 3.1.0
  info: { title: Test, version: '1.0' }
  paths:
    /pets:
      get:
        parameters:
          - name: filter
            in: query
            schema: { type: string }
          - name: limit
            in: query
            required: true
            schema: { type: number }
        responses:
          '200': { description: List of pets }
`;

/** One line per change: verdict, what moved, and where it sits on each side. */
function report(result: DiffResult): string {
  return result.changes
    .map((change) => {
      const at = [change.base, change.revision]
        .filter(Boolean)
        .map((side) => `${side!.file}:${side!.line} ${side!.pointer}`)
        .join('  →  ');
      const name = `${change.pointer}${change.property ? ` · ${change.property}` : ''}`;
      return [
        `${change.compat}  ${change.kind}  ${name}`,
        ...(change.verdicts ?? []).map((verdict) => `    ${verdict.ruleId}: ${verdict.message}`),
        `    at ${at}`,
      ].join('\n');
    })
    .join('\n');
}

describe('diffDocuments', () => {
  it('matches reordered parameters by identity and judges what actually changed', async () => {
    const config = await createConfig({});
    const result = diffDocuments({
      base: makeDocumentFromString(BASE, 'base.yaml'),
      revision: makeDocumentFromString(REVISION, 'rev.yaml'),
      config,
    });

    // The two parameters swapped places, which is not a change. What remains: the
    // parameter became required (breaking), its type widened from integer to number
    // (accepts more, so a request tolerates it), and a description was reworded.
    // The real pointers differ per side, which is how the swap stays visible.
    expect(report(result)).toMatchInlineSnapshot(`
      "breaking  changed  #/paths/~1pets/get/parameters/{query:limit} · required
          parameter-became-required: Parameter became required.
          at base.yaml:7 #/paths/~1pets/get/parameters/0/required  →  rev.yaml:12 #/paths/~1pets/get/parameters/1/required
      non-breaking  changed  #/paths/~1pets/get/parameters/{query:limit}/schema · type
          at base.yaml:9 #/paths/~1pets/get/parameters/0/schema/type  →  rev.yaml:13 #/paths/~1pets/get/parameters/1/schema/type
      non-breaking  changed  #/paths/~1pets/get/responses/200 · description
          at base.yaml:14 #/paths/~1pets/get/responses/200/description  →  rev.yaml:15 #/paths/~1pets/get/responses/200/description"
    `);
    expect(result.summary).toEqual({ breaking: 1, nonBreaking: 2 });
  });

  it('throws DiffError for different spec families', async () => {
    const config = await createConfig({});
    const oas2 = makeDocumentFromString(
      outdent`
        swagger: '2.0'
        info: { title: Test, version: '1.0' }
        paths: {}
      `,
      ''
    );
    expect(() =>
      diffDocuments({ base: oas2, revision: makeDocumentFromString(REVISION, ''), config })
    ).toThrow(DiffError);
  });

  it('matches renamed path parameters instead of remove+add', async () => {
    const config = await createConfig({});
    const makeSpec = (param: string) => outdent`
        openapi: 3.1.0
        info: { title: T, version: '1' }
        paths:
          /pet/{${param}}:
            get:
              parameters:
                - name: ${param}
                  in: path
                  required: true
                  schema: { type: string }
              responses:
                '200': { description: OK }
      `;
    const result = diffDocuments({
      base: makeDocumentFromString(makeSpec('id'), 'base.yaml'),
      revision: makeDocumentFromString(makeSpec('petId'), 'rev.yaml'),
      config,
    });

    // The endpoint is the same one under a new parameter name, so nothing is removed:
    // the path template and the parameter name are reported as changes of their own,
    // both keyed on the base pointer.
    expect(report(result)).toMatchInlineSnapshot(`
      "non-breaking  changed  #/paths/~1pet~1{id} · path
          at base.yaml:5 #/paths/~1pet~1{id}  →  rev.yaml:5 #/paths/~1pet~1{petId}
      non-breaking  changed  #/paths/~1pet~1{id}/get/parameters/{path:id} · name
          at base.yaml:7 #/paths/~1pet~1{id}/get/parameters/0/name  →  rev.yaml:7 #/paths/~1pet~1{petId}/get/parameters/0/name"
    `);
    expect(result.summary.breaking).toBe(0);
  });

  it('reports ambiguous path renames as remove+add', async () => {
    const config = await createConfig({});
    const base = makeDocumentFromString(
      outdent`
          openapi: 3.1.0
          info: { title: T, version: '1' }
          paths:
            /a/{x}/b:
              get:
                responses:
                  '200': { description: OK }
        `,
      'base.yaml'
    );
    const revision = makeDocumentFromString(
      outdent`
          openapi: 3.1.0
          info: { title: T, version: '1' }
          paths:
            /a/{y}/b:
              get:
                responses:
                  '200': { description: OK }
            /a/{z}/b:
              get:
                responses:
                  '200': { description: OK }
        `,
      'rev.yaml'
    );
    const result = diffDocuments({ base, revision, config });

    // Two candidates differ from `/a/{x}/b` only in the parameter name, so there is no
    // way to tell which one it became. The paths are compared by their literal keys.
    expect(report(result)).toMatchInlineSnapshot(`
      "breaking  removed  #/paths/~1a~1{x}~1b
          path-removed: Path was removed.
          at base.yaml:5 #/paths/~1a~1{x}~1b
      non-breaking  added  #/paths/~1a~1{y}~1b
          at rev.yaml:5 #/paths/~1a~1{y}~1b
      non-breaking  added  #/paths/~1a~1{z}~1b
          at rev.yaml:9 #/paths/~1a~1{z}~1b"
    `);
  });
});
