import { outdent } from 'outdent';

import { createConfig } from '../../config/index.js';
import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { makeDocumentFromString } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { collectNodeMap } from '../collect.js';
import type { IdentityFn, NodeEntry } from '../types.js';

const noIdentity: IdentityFn = () => undefined;

async function collect(yaml: string, identityOf: IdentityFn = noIdentity) {
  const document = makeDocumentFromString(yaml, 'api.yaml');
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return collectNodeMap({ document, types, specVersion, identityOf });
}

/** `key  (real pointer)  TypeName` per node — the map the comparison runs on. */
function tree(entries: Map<string, NodeEntry>): string {
  return [...entries.values()]
    .map((entry) => `${entry.key}  (${entry.location.pointer})  ${entry.typeName}`)
    .join('\n');
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

describe('collectNodeMap', () => {
  it('keys every object and array node hierarchically and keeps the walker location on it', async () => {
    const { entries } = await collect(PETSTORE);

    expect(tree(entries)).toMatchInlineSnapshot(`
      "#/  (#/)  Root
      #/info  (#/info)  Info
      #/paths  (#/paths)  Paths
      #/paths/~1pets  (#/paths/~1pets)  PathItem
      #/paths/~1pets/get  (#/paths/~1pets/get)  Operation
      #/paths/~1pets/get/parameters  (#/paths/~1pets/get/parameters)  ParameterList
      #/paths/~1pets/get/parameters/0  (#/paths/~1pets/get/parameters/0)  Parameter
      #/paths/~1pets/get/parameters/0/schema  (#/paths/~1pets/get/parameters/0/schema)  Schema
      #/paths/~1pets/get/responses  (#/paths/~1pets/get/responses)  Responses
      #/paths/~1pets/get/responses/200  (#/paths/~1pets/get/responses/200)  Response
      #/paths/~1pets/get/responses/200/content  (#/paths/~1pets/get/responses/200/content)  MediaTypesMap
      #/paths/~1pets/get/responses/200/content/application~1json  (#/paths/~1pets/get/responses/200/content/application~1json)  MediaType
      #/components  (#/components)  Components
      #/components/schemas  (#/components/schemas)  NamedSchemas
      #/components/schemas/Pet  (#/components/schemas/Pet)  Schema
      #/components/schemas/Pet/properties  (#/components/schemas/Pet/properties)  SchemaProperties
      #/components/schemas/Pet/properties/id  (#/components/schemas/Pet/properties/id)  Schema"
    `);
    expect(entries.get('#/info')?.location.source.absoluteRef).toBe('api.yaml');
    expect(entries.get('#/info')?.parentKey).toBe('#/');
  });

  it('keeps scalars, scalar arrays and $refs as properties and leaves nested nodes out', async () => {
    const { entries, usageEdges } = await collect(PETSTORE);

    const parameter = entries.get('#/paths/~1pets/get/parameters/0');
    expect(parameter?.properties).toEqual({ name: 'limit', in: 'query' });
    expect(parameter?.raw).toEqual({
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', maximum: 100 },
    });
    expect(entries.get('#/components/schemas/Pet')?.properties).toEqual({
      type: 'object',
      required: ['id'],
    });
    const mediaType = entries.get('#/paths/~1pets/get/responses/200/content/application~1json');
    expect(mediaType?.properties).toEqual({ schema: { $ref: '#/components/schemas/Pet' } });
    expect(usageEdges).toEqual([
      {
        site: '#/paths/~1pets/get/responses/200/content/application~1json',
        target: '#/components/schemas/Pet',
      },
    ]);
  });

  it('lets the identity replace the walker key, add properties, and suffixes a duplicate identity', async () => {
    const byName: IdentityFn = (node, { typeName }) =>
      typeName === 'Parameter' && typeof node.name === 'string'
        ? { segment: `{${node.name}}`, properties: { identified: true } }
        : undefined;
    const { entries } = await collect(
      outdent`
        openapi: 3.1.0
        info: { title: T, version: '1' }
        paths:
          /p:
            get:
              parameters:
                - { name: a, in: query }
                - { name: a, in: header }
              responses: {}
      `,
      byName
    );

    const keys = [...entries.keys()].filter((key) => key.includes('parameters/'));
    expect(keys).toEqual(['#/paths/~1p/get/parameters/{a}', '#/paths/~1p/get/parameters/{a}#2']);
    expect(entries.get('#/paths/~1p/get/parameters/{a}')?.properties).toEqual({
      name: 'a',
      in: 'query',
      identified: true,
    });
    expect(entries.get('#/paths/~1p/get/parameters/{a}#2')?.location.pointer).toBe(
      '#/paths/~1p/get/parameters/1'
    );
  });
});
