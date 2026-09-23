import { outdent } from 'outdent';

import { createConfig } from '../../config/index.js';
import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { makeDocumentFromString } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { collectNodes } from '../collect.js';
import type { NodeEntry } from '../types.js';

async function collect(yaml: string) {
  const document = makeDocumentFromString(yaml, 'api.yaml');
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return collectNodes({ document, types, specVersion });
}

/** `pointer  key  Type` per node — the map every reader starts from. */
function tree(nodes: Map<string, NodeEntry>): string {
  return [...nodes].map(([pointer, node]) => `${pointer}  ${node.key}  ${node.type}`).join('\n');
}

const PETSTORE = outdent`
  openapi: 3.1.0
  info: { title: Pets, version: '1.0' }
  paths:
    /pets:
      get:
        parameters:
          - { name: limit, in: query, schema: { type: integer, maximum: 100 } }
        responses:
          '200':
            content:
              application/json:
                schema: { $ref: '#/components/schemas/Pet' }
  components:
    schemas:
      Pet:
        type: object
        required: [id]
        properties:
          id: { type: string }
`;

describe('collectNodes', () => {
  it('records every object and array node under its pointer, with the walker location and key', async () => {
    const { nodes } = await collect(PETSTORE);

    expect(tree(nodes)).toMatchInlineSnapshot(`
      "#/    Root
      #/info  info  Info
      #/paths  paths  Paths
      #/paths/~1pets  /pets  PathItem
      #/paths/~1pets/get  get  Operation
      #/paths/~1pets/get/parameters  parameters  ParameterList
      #/paths/~1pets/get/parameters/0  0  Parameter
      #/paths/~1pets/get/parameters/0/schema  schema  Schema
      #/paths/~1pets/get/responses  responses  Responses
      #/paths/~1pets/get/responses/200  200  Response
      #/paths/~1pets/get/responses/200/content  content  MediaTypesMap
      #/paths/~1pets/get/responses/200/content/application~1json  application/json  MediaType
      #/components  components  Components
      #/components/schemas  schemas  NamedSchemas
      #/components/schemas/Pet  Pet  Schema
      #/components/schemas/Pet/properties  properties  SchemaProperties
      #/components/schemas/Pet/properties/id  id  Schema"
    `);
    expect(nodes.get('#/info')?.location.source.absoluteRef).toBe('api.yaml');
    expect(nodes.get('#/info')?.parent).toBe(nodes.get('#/'));
    expect(nodes.get('#/paths/~1pets/get/parameters/0')?.parent).toBe(
      nodes.get('#/paths/~1pets/get/parameters')
    );
    expect(nodes.get('#/paths')?.children).toEqual([nodes.get('#/paths/~1pets')]);
  });

  it('keeps the node itself as the value, children included', async () => {
    const { nodes } = await collect(PETSTORE);

    expect(nodes.get('#/paths/~1pets/get/parameters/0')?.value).toEqual({
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', maximum: 100 },
    });
    expect(nodes.get('#/paths/~1pets/get/parameters')?.value).toHaveLength(1);
  });
});

describe('collectNodes references', () => {
  it('resolves a $ref to the node it points at, wherever the $ref is written', async () => {
    const { references } = await collect(outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      paths:
        /p:
          get:
            parameters:
              - $ref: '#/components/parameters/Limit'
            responses:
              '200':
                content:
                  application/json:
                    schema: { $ref: '#/components/schemas/Pet' }
      components:
        parameters:
          Limit: { name: limit, in: query }
        schemas:
          Pet: { type: object }
    `);

    expect(references.map(({ from, to }) => [from.location.pointer, to.location.pointer])).toEqual([
      ['#/paths/~1p/get/parameters', '#/components/parameters/Limit'],
      ['#/paths/~1p/get/responses/200/content/application~1json', '#/components/schemas/Pet'],
    ]);
  });
});
