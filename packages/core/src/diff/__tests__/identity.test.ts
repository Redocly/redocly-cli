import { outdent } from 'outdent';

import { createConfig } from '../../config/index.js';
import { detectSpec } from '../../detect-spec.js';
import { collectNodeMap } from '../../node-map/collect.js';
import { getTypes } from '../../oas-types.js';
import { makeDocumentFromString } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { identityOf } from '../identity.js';

async function keysOf(yaml: string): Promise<Map<string, Record<string, unknown>>> {
  const document = makeDocumentFromString(yaml, 'api.yaml');
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  const { entries } = collectNodeMap({ document, types, specVersion, identityOf });
  return new Map([...entries.values()].map((entry) => [entry.key, entry.properties]));
}

describe('identityOf', () => {
  it('keys a path by its shape and keeps the template as a property', async () => {
    const keys = await keysOf(outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      paths:
        /pets/{petId}/toys/{toyId}:
          get:
            parameters:
              - { name: toyId, in: path, required: true, schema: { type: string } }
              - { name: petId, in: path, required: true, schema: { type: string } }
              - { name: q, in: query, schema: { type: string } }
            responses: {}
    `);

    expect(keys.get('#/paths/~1pets~1{0}~1toys~1{1}')).toEqual({
      path: '/pets/{petId}/toys/{toyId}',
    });
    expect(
      [...keys.keys()].filter((key) => key.includes('parameters/') && !key.endsWith('/schema'))
    ).toEqual([
      '#/paths/~1pets~1{0}~1toys~1{1}/get/parameters/{path:1}',
      '#/paths/~1pets~1{0}~1toys~1{1}/get/parameters/{path:0}',
      '#/paths/~1pets~1{0}~1toys~1{1}/get/parameters/{query:q}',
    ]);
  });

  it('keeps a callback key as it is and falls back to the parameter name there', async () => {
    const keys = await keysOf(outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      paths:
        /subscribe:
          post:
            responses: {}
            callbacks:
              onEvent:
                '{$request.body#/url}':
                  post:
                    parameters:
                      - { name: id, in: path, required: true, schema: { type: string } }
                    responses: {}
    `);

    expect(keys.has('#/paths/~1subscribe/post/callbacks/onEvent/{$request.body#~1url}')).toBe(true);
    expect(
      keys.has(
        '#/paths/~1subscribe/post/callbacks/onEvent/{$request.body#~1url}/post/parameters/{path:id}'
      )
    ).toBe(true);
  });

  it('keys servers by url, tags by name, and security requirements by their scheme names', async () => {
    const keys = await keysOf(outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      servers:
        - url: https://a.example/v1
      tags:
        - name: pets
      security:
        - oauth: [read]
          apiKey: []
      paths: {}
    `);

    expect(keys.has('#/servers/{https:~1~1a.example~1v1}')).toBe(true);
    expect(keys.has('#/tags/{pets}')).toBe(true);
    expect(keys.has('#/security/{apiKey+oauth}')).toBe(true);
  });
});
