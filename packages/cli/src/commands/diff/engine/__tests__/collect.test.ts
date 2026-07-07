import {
  createConfig,
  detectSpec,
  getTypes,
  makeDocumentFromString,
  normalizeTypes,
} from '@redocly/openapi-core';
import { outdent } from 'outdent';

import { collectDocumentMap } from '../collect.js';

async function collect(yaml: string) {
  const document = makeDocumentFromString(yaml, '');
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return collectDocumentMap({ document, types, specVersion, config });
}

describe('collectDocumentMap', () => {
  it('collects nodes with identity-keyed stable pointers and real pointers', async () => {
    const { entries } = await collect(outdent`
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
                schema: { type: integer }
            responses:
              '200': { description: OK }
    `);

    const limit = entries.get('#/paths/~1pets/get/parameters/{query:limit}');
    expect(limit).toBeDefined();
    expect(limit!.typeName).toBe('Parameter');
    expect(limit!.realPointer).toBe('#/paths/~1pets/get/parameters/1');
    expect(limit!.parentPointer).toBe('#/paths/~1pets/get/parameters');
    expect(limit!.scalars).toMatchObject({ name: 'limit', in: 'query', required: true });

    // nested schema is its own entry under the stable parent
    const schema = entries.get('#/paths/~1pets/get/parameters/{query:limit}/schema');
    expect(schema).toBeDefined();
    expect(schema!.typeName).toBe('Schema');
    expect(schema!.scalars).toMatchObject({ type: 'integer' });
  });

  it('records $ref values as attributes and does not follow them', async () => {
    const { entries, usageEdges } = await collect(outdent`
      openapi: 3.1.0
      info: { title: Test, version: '1.0' }
      paths:
        /pets:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Pet'
      components:
        schemas:
          Pet:
            type: object
            properties:
              name: { type: string }
    `);

    const mediaType = entries.get('#/paths/~1pets/get/responses/200/content/application~1json');
    expect(mediaType).toBeDefined();
    expect(mediaType!.refs).toEqual({ schema: '#/components/schemas/Pet' });

    // the component is collected once, at its canonical path
    const pet = entries.get('#/components/schemas/Pet');
    expect(pet).toBeDefined();
    expect(pet!.typeName).toBe('Schema');
    expect(entries.get('#/components/schemas/Pet/properties/name')).toBeDefined();

    // usage edge recorded
    expect(usageEdges).toContainEqual({
      site: '#/paths/~1pets/get/responses/200/content/application~1json/schema',
      target: '#/components/schemas/Pet',
    });
  });

  it('snapshots scalar arrays like enum and required', async () => {
    const { entries } = await collect(outdent`
      openapi: 3.1.0
      info: { title: Test, version: '1.0' }
      paths: {}
      components:
        schemas:
          Size:
            type: string
            enum: [s, m, l]
          Pet:
            type: object
            required: [name]
            properties:
              name: { type: string }
    `);

    expect(entries.get('#/components/schemas/Size')!.scalars.enum).toEqual(['s', 'm', 'l']);
    expect(entries.get('#/components/schemas/Pet')!.scalars.required).toEqual(['name']);
  });

  it('suffixes colliding identity keys deterministically', async () => {
    const { entries } = await collect(outdent`
      openapi: 3.1.0
      info: { title: Test, version: '1.0' }
      paths:
        /pets:
          get:
            parameters:
              - name: dup
                in: query
              - name: dup
                in: query
            responses:
              '200': { description: OK }
    `);

    expect(entries.has('#/paths/~1pets/get/parameters/{query:dup}')).toBe(true);
    expect(entries.has('#/paths/~1pets/get/parameters/{query:dup}#2')).toBe(true);
  });
});
