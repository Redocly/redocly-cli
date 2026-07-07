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
      base: makeDocumentFromString(BASE, ''),
      revision: makeDocumentFromString(REVISION, ''),
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
    expect(becameRequired.ruleIds).toEqual(['parameter-became-required']);
    expect(becameRequired.base?.pointer).toBe('#/paths/~1pets/get/parameters/0/required');
    expect(becameRequired.revision?.pointer).toBe('#/paths/~1pets/get/parameters/1/required');

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
});
