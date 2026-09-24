import { outdent } from 'outdent';

import { createConfig } from '../../config/index.js';
import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { makeDocumentFromString } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { buildNodeTree } from '../build.js';
import type { NodeEntry } from '../types.js';

async function build(yaml: string) {
  const document = makeDocumentFromString(yaml, 'api.yaml');
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return buildNodeTree({ document, types, specVersion });
}

/** Every node under the root by its pointer, in the order the walker reached them. */
function byPointer(root: NodeEntry): Map<string, NodeEntry> {
  const nodes = new Map<string, NodeEntry>();
  const visit = (node: NodeEntry) => {
    nodes.set(node.location.pointer, node);
    node.children.forEach(visit);
  };
  visit(root);
  return nodes;
}

/** `pointer  key  Type` per node. */
function outline(nodes: Map<string, NodeEntry>): string {
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

describe('buildNodeTree', () => {
  it('builds every object and array node into the tree, with the walker location and key', async () => {
    const nodes = byPointer((await build(PETSTORE)).root);

    expect(outline(nodes)).toMatchInlineSnapshot(`
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
      #/paths/~1pets/get/responses/200/content/application~1json/schema  schema  Schema
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
    const nodes = byPointer((await build(PETSTORE)).root);

    expect(nodes.get('#/paths/~1pets/get/parameters/0')?.value).toEqual({
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', maximum: 100 },
    });
    expect(nodes.get('#/paths/~1pets/get/parameters')?.value).toHaveLength(1);
  });
});

describe('buildNodeTree references', () => {
  it('resolves a $ref to the node it points at, wherever the $ref is written', async () => {
    const { references } = await build(outdent`
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
      ['#/paths/~1p/get/parameters/0', '#/components/parameters/Limit'],
      [
        '#/paths/~1p/get/responses/200/content/application~1json/schema',
        '#/components/schemas/Pet',
      ],
    ]);
    expect(references.map(({ from }) => from.type)).toEqual(['Parameter', 'Schema']);
  });

  it('resolves a $ref whose pointer is percent-encoded', async () => {
    const { references } = await build(outdent`
      openapi: 3.1.0
      info: { title: T, version: '1' }
      paths:
        /p:
          get:
            responses:
              '200':
                content:
                  application/json:
                    schema: { $ref: '#/components/schemas/Pet%20Name' }
      components:
        schemas:
          Pet Name: { type: object }
    `);

    expect(references.map(({ to }) => to.location.pointer)).toEqual([
      '#/components/schemas/Pet Name',
    ]);
  });
});
