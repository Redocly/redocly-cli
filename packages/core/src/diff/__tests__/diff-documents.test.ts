import { outdent } from 'outdent';

import { createConfig } from '../../config/index.js';
import { makeDocumentFromString } from '../../resolve.js';
import { HandledError } from '../../utils/error.js';
import { diffDocuments } from '../index.js';
import type { DiffResult } from '../types.js';

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
      const sides = [
        change.kind !== 'added' ? change.base : undefined,
        change.kind !== 'removed' ? change.revision : undefined,
      ].filter((side) => side !== undefined);
      const at = sides
        .map((side) => `${side.location.source.absoluteRef} ${side.location.pointer}`)
        .join('  →  ');
      const name = change.kind === 'modified' ? `${change.key} · ${change.property}` : change.key;
      return [
        `${change.impact}  ${change.kind}  ${name}`,
        ...change.verdicts.map((verdict) => `    ${verdict.ruleId}: ${verdict.message}`),
        `    at ${at}`,
      ].join('\n');
    })
    .join('\n');
}

describe('diffDocuments', () => {
  it('takes the direction of a component from a site that exists only in the revision', async () => {
    const shared = outdent`
      components:
        schemas:
          Size:
            type: string
    `;
    const base = outdent`
      openapi: 3.1.0
      info: { title: T, version: '1.0.0' }
      paths: {}
      ${shared}
            enum: [s, m, l]
    `;
    const revision = outdent`
      openapi: 3.1.0
      info: { title: T, version: '1.0.0' }
      paths:
        /pets:
          post:
            requestBody:
              content:
                application/json:
                  schema: { $ref: '#/components/schemas/Size' }
            responses: { '201': { description: Created } }
      ${shared}
            enum: [s, m]
    `;
    const config = await createConfig({ extends: ['diff-recommended'] });

    const result = diffDocuments({
      base: makeDocumentFromString(base, 'base.yaml'),
      revision: makeDocumentFromString(revision, 'rev.yaml'),
      config,
    });

    const enumChange = result.changes.find(
      (change) => change.kind === 'modified' && change.property === 'enum'
    );
    expect(enumChange?.direction).toBe('request');
    expect(enumChange?.verdicts.map((verdict) => verdict.ruleId)).toEqual(['enum-values-removed']);
  });

  it('matches reordered parameters by identity and judges what actually changed', async () => {
    const config = await createConfig({ extends: ['diff-recommended'] });
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
      "major  modified  #/paths/~1pets/get/parameters/{query:limit} · required
          parameter-became-required: Parameter became required.
          at base.yaml #/paths/~1pets/get/parameters/0  →  rev.yaml #/paths/~1pets/get/parameters/1/required
      patch  modified  #/paths/~1pets/get/parameters/{query:limit}/schema · type
          at base.yaml #/paths/~1pets/get/parameters/0/schema/type  →  rev.yaml #/paths/~1pets/get/parameters/1/schema/type
      patch  modified  #/paths/~1pets/get/responses/200 · description
          at base.yaml #/paths/~1pets/get/responses/200/description  →  rev.yaml #/paths/~1pets/get/responses/200/description"
    `);
    expect(result.summary).toEqual({ major: 1, minor: 0, patch: 2 });
    expect(result.bump).toBe('major');
  });

  it('throws a handled error for different spec families', async () => {
    const config = await createConfig({ extends: ['diff-recommended'] });
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
    ).toThrow(HandledError);
  });

  it('matches renamed path parameters instead of remove+add', async () => {
    const config = await createConfig({ extends: ['diff-recommended'] });
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
    // both keyed by the path's shape.
    expect(report(result)).toMatchInlineSnapshot(`
      "patch  modified  #/paths/~1pet~1{0} · path
          at base.yaml #/paths/~1pet~1{id}  →  rev.yaml #/paths/~1pet~1{petId}
      patch  modified  #/paths/~1pet~1{0}/get/parameters/{path:0} · name
          at base.yaml #/paths/~1pet~1{id}/get/parameters/0/name  →  rev.yaml #/paths/~1pet~1{petId}/get/parameters/0/name"
    `);
    expect(result.summary.major).toBe(0);
    expect(result.bump).toBe('patch');
  });

  it('keys two templates of the same shape in document order, suffixing the second', async () => {
    const config = await createConfig({ extends: ['diff-recommended'] });
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
    // The revision is spec-invalid: `/a/{y}/b` and `/a/{z}/b` are the same path. The first one
    // matches the base by shape, the second is a new key like any duplicate identity (2.1.4).
    const result = diffDocuments({ base, revision, config });

    expect(report(result)).toMatchInlineSnapshot(`
      "patch  modified  #/paths/~1a~1{0}~1b · path
          at base.yaml #/paths/~1a~1{x}~1b  →  rev.yaml #/paths/~1a~1{y}~1b
      minor  added  #/paths/~1a~1{0}~1b#2
          at rev.yaml #/paths/~1a~1{z}~1b"
    `);
  });
});
