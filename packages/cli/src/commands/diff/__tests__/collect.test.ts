import {
  createConfig,
  detectSpec,
  getTypes,
  makeDocumentFromString,
  normalizeTypes,
} from '@redocly/openapi-core';
import { outdent } from 'outdent';

import { collectDocumentMap } from '../engine/collect.js';
import type { NodeEntry } from '../engine/types.js';

async function collect(yaml: string) {
  const document = makeDocumentFromString(yaml, '');
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return collectDocumentMap({ document, types, specVersion, config });
}

/** `stable pointer  (real pointer)  TypeName` per node — the map the comparison runs on. */
function tree(entries: Map<string, NodeEntry>): string {
  return [...entries.values()]
    .map((entry) => `${entry.pointer}  (${entry.realPointer})  ${entry.typeName}`)
    .join('\n');
}

describe('collectDocumentMap', () => {
  it('keys every node by a stable pointer while remembering the real one', async () => {
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

    // The parameters are keyed by `in` + `name`, so reordering them cannot read as a
    // change, while the real pointer still points at the index they sit at today.
    expect(tree(entries)).toMatchInlineSnapshot(`
      "#/  (#/)  Root
      #/info  (#/info)  Info
      #/paths  (#/paths)  Paths
      #/paths/~1pets  (#/paths/~1pets)  PathItem
      #/paths/~1pets/get  (#/paths/~1pets/get)  Operation
      #/paths/~1pets/get/parameters  (#/paths/~1pets/get/parameters)  ParameterList
      #/paths/~1pets/get/parameters/{query:filter}  (#/paths/~1pets/get/parameters/0)  Parameter
      #/paths/~1pets/get/parameters/{query:filter}/schema  (#/paths/~1pets/get/parameters/0/schema)  Schema
      #/paths/~1pets/get/parameters/{query:limit}  (#/paths/~1pets/get/parameters/1)  Parameter
      #/paths/~1pets/get/parameters/{query:limit}/schema  (#/paths/~1pets/get/parameters/1/schema)  Schema
      #/paths/~1pets/get/responses  (#/paths/~1pets/get/responses)  Responses
      #/paths/~1pets/get/responses/200  (#/paths/~1pets/get/responses/200)  Response"
    `);
    expect(entries.get('#/paths/~1pets/get/parameters/{query:limit}')!.scalars).toMatchObject({
      name: 'limit',
      in: 'query',
      required: true,
    });
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
    // The site is the media type node that holds the `$ref`, since the reference
    // itself is not a node and could not be looked up later.
    expect(usageEdges).toContainEqual({
      site: '#/paths/~1pets/get/responses/200/content/application~1json',
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

  it('keys list items by their identity, with pointer escaping inside the key', async () => {
    const { entries } = await collect(outdent`
      openapi: 3.1.0
      info: { title: Test, version: '1.0' }
      servers:
        - url: https://api.example.com/v1
        - url: https://staging.example.com/v1
      tags:
        - name: pets
      paths: {}
    `);

    // Reordering these must not read as a change, so the key is the url, not the index.
    // The slashes in it are escaped, or they would split the pointer into more segments.
    expect(entries.has('#/servers/{https:~1~1api.example.com~1v1}')).toBe(true);
    expect(entries.get('#/servers/{https:~1~1api.example.com~1v1}')!.realPointer).toBe(
      '#/servers/0'
    );
    expect(entries.has('#/tags/{pets}')).toBe(true);
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
