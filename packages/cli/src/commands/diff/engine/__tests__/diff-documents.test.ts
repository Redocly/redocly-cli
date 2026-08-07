import { createConfig, makeDocumentFromString } from '@redocly/openapi-core';
import { outdent } from 'outdent';

import { DiffError, diffDocuments } from '../index.js';

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

describe('diffDocuments', () => {
  it('produces the running example from the design spec', async () => {
    const config = await createConfig({});
    const result = diffDocuments({
      base: makeDocumentFromString(BASE, 'base.yaml'),
      revision: makeDocumentFromString(REVISION, 'rev.yaml'),
      config,
    });

    expect(result.version).toBe('1');
    expect(result.specVersions).toEqual({ base: 'oas3_1', revision: 'oas3_1' });

    // reordering parameters produces NO changes; three real changes remain
    const byKey = (c: { pointer: string; property?: string }) =>
      `${c.pointer}${c.property ? '::' + c.property : ''}`;
    const keys = result.changes.map(byKey).sort();
    // NOTE: '/' (0x2F) sorts before ':' (0x3A) in a plain string sort, so the
    // "{query:limit}/schema::type" entry sorts before "{query:limit}::required".
    expect(keys).toEqual([
      '#/paths/~1pets/get/parameters/{query:limit}/schema::type',
      '#/paths/~1pets/get/parameters/{query:limit}::required',
      '#/paths/~1pets/get/responses/200::description',
    ]);

    const becameRequired = result.changes.find((c) => c.property === 'required')!;
    expect(becameRequired.compat).toBe('breaking');
    expect(becameRequired.verdicts).toEqual([
      {
        ruleId: 'parameter-became-required',
        compat: 'breaking',
        message: 'Parameter became required.',
      },
    ]);
    expect(becameRequired.base?.pointer).toBe('#/paths/~1pets/get/parameters/0/required');
    expect(becameRequired.revision?.pointer).toBe('#/paths/~1pets/get/parameters/1/required');
    expect(becameRequired.base).toMatchObject({ file: 'base.yaml' });
    expect(becameRequired.revision).toMatchObject({ file: 'rev.yaml' });
    expect(becameRequired.revision?.line).toBeGreaterThan(1);

    // integer → number in request is a widening — non-breaking
    const typeChanged = result.changes.find((c) => c.property === 'type')!;
    expect(typeChanged.compat).toBe('non-breaking');

    const description = result.changes.find((c) => c.property === 'description')!;
    expect(description.compat).toBe('non-breaking');

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

    expect(result.summary.breaking).toBe(0);

    // the rename itself is an explicit, non-breaking change
    const renameChange = result.changes.find((c) => c.property === 'path')!;
    expect(renameChange).toMatchObject({
      pointer: '#/paths/~1pet~1{id}',
      kind: 'changed',
      typeName: 'PathItem',
      compat: 'non-breaking',
    });
    expect(renameChange.base?.value).toBe('/pet/{id}');
    expect(renameChange.revision?.value).toBe('/pet/{petId}');

    // the parameter matched; only its name changed
    const nameChange = result.changes.find((c) => c.property === 'name')!;
    expect(nameChange).toMatchObject({
      kind: 'changed',
      compat: 'non-breaking',
      pointer: '#/paths/~1pet~1{id}/get/parameters/{path:id}',
    });
    expect(nameChange.base?.value).toBe('id');
    expect(nameChange.revision?.value).toBe('petId');
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

    const kinds = result.changes.map((c) => c.kind).sort();
    expect(kinds).toEqual(['added', 'added', 'removed']);
    expect(result.changes.find((c) => c.property === 'path')).toBeUndefined();
  });
});
