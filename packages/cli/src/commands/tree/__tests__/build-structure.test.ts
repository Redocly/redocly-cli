import {
  BaseResolver,
  detectSpec,
  getTypes,
  normalizeTypes,
  resolveDocument,
  Source,
  type Document,
  type WalkContext,
} from '@redocly/openapi-core';
import * as path from 'node:path';

import { buildStructure } from '../build-structure.js';
import type { DependencyGraph } from '../types.js';

const CWD = '/project';
const ROOT_ABS = '/project/openapi.yaml';

async function structureOf(
  parsed: Record<string, unknown>,
  externalRefResolver: BaseResolver = new BaseResolver()
): Promise<DependencyGraph> {
  const document = { source: new Source(ROOT_ABS, ''), parsed } as Document;
  const specVersion = detectSpec(parsed);
  const types = normalizeTypes(getTypes(specVersion), {});
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });
  const ctx = { problems: [], specVersion, visitorsData: {} } as unknown as WalkContext;
  return buildStructure({
    document,
    types,
    resolvedRefMap,
    ctx,
    cwd: CWD,
    resolveRef: (base, uri) => path.resolve(path.dirname(base), uri),
  });
}

function edgeRefs(graph: DependencyGraph, from: string, to: string): string[] | undefined {
  return graph.edges.find((edge) => edge.from === from && edge.to === to)?.refs;
}

describe('buildStructure', () => {
  it('builds the root -> path -> operation spine without refs', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          get: { responses: { '200': { description: 'ok' } } },
          post: { responses: { '201': { description: 'created' } } },
        },
        '/users': {
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
    });

    expect(graph).toEqual({
      roots: ['openapi.yaml'],
      nodes: [
        { id: '/pets', resolved: true, kind: 'path', file: 'openapi.yaml' },
        { id: '/users', resolved: true, kind: 'path', file: 'openapi.yaml' },
        { id: 'GET /pets', resolved: true, kind: 'operation', file: 'openapi.yaml' },
        { id: 'GET /users', resolved: true, kind: 'operation', file: 'openapi.yaml' },
        { id: 'POST /pets', resolved: true, kind: 'operation', file: 'openapi.yaml' },
        { id: 'openapi.yaml', root: true, resolved: true, kind: 'root', file: 'openapi.yaml' },
      ],
      edges: [
        { from: '/pets', to: 'GET /pets', refs: [] },
        { from: '/pets', to: 'POST /pets', refs: [] },
        { from: '/users', to: 'GET /users', refs: [] },
        { from: 'openapi.yaml', to: '/pets', refs: [] },
        { from: 'openapi.yaml', to: '/users', refs: [] },
      ],
    });
  });

  it('links an operation to the component it references', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Pet' } },
                },
              },
            },
          },
        },
      },
      components: { schemas: { Pet: { type: 'object' } } },
    });

    expect(edgeRefs(graph, 'GET /pets', 'schemas/Pet')).toEqual(['#/components/schemas/Pet']);
    expect(graph.nodes).toContainEqual({
      id: 'schemas/Pet',
      resolved: true,
      kind: 'component',
      file: 'openapi.yaml',
    });
  });

  it('follows transitive component-to-component references', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Pet' } },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: { type: 'object', properties: { home: { $ref: '#/components/schemas/Address' } } },
          Address: { type: 'object' },
        },
      },
    });

    expect(edgeRefs(graph, 'schemas/Pet', 'schemas/Address')).toEqual([
      '#/components/schemas/Address',
    ]);
  });

  it('normalizes a nested target pointer to its top-level component', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Pet/properties/name' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: { Pet: { type: 'object', properties: { name: { type: 'string' } } } },
      },
    });

    expect(edgeRefs(graph, 'GET /pets', 'schemas/Pet')).toEqual([
      '#/components/schemas/Pet/properties/name',
    ]);
  });

  it('attributes a path-level parameter ref to the path node', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          parameters: [{ $ref: '#/components/parameters/PetId' }],
          get: { responses: { '200': { description: 'ok' } } },
        },
      },
      components: {
        parameters: { PetId: { name: 'petId', in: 'query', schema: { type: 'string' } } },
      },
    });

    expect(edgeRefs(graph, '/pets', 'parameters/PetId')).toEqual(['#/components/parameters/PetId']);
  });

  it('keeps a self-edge for a recursive schema', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Node' } },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Node: { type: 'object', properties: { next: { $ref: '#/components/schemas/Node' } } },
        },
      },
    });

    expect(edgeRefs(graph, 'schemas/Node', 'schemas/Node')).toEqual(['#/components/schemas/Node']);
  });

  it('attributes a callback ref to its outer operation without callback-expression nodes', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          post: {
            responses: { '201': { description: 'created' } },
            callbacks: {
              onEvent: {
                '{$request.body#/url}': {
                  post: {
                    requestBody: {
                      content: {
                        'application/json': { schema: { $ref: '#/components/schemas/Event' } },
                      },
                    },
                    responses: { '200': { description: 'ok' } },
                  },
                },
              },
            },
          },
        },
      },
      components: { schemas: { Event: { type: 'object' } } },
    });

    expect(edgeRefs(graph, 'POST /pets', 'schemas/Event')).toEqual(['#/components/schemas/Event']);
    // The callback's `$ref` is attributed to the outer operation: no callback-expression node and
    // no extra operation node for the callback's inner POST. (`/pets` is the operation's spine parent.)
    expect(graph.nodes.map((node) => node.id)).toEqual([
      '/pets',
      'POST /pets',
      'openapi.yaml',
      'schemas/Event',
    ]);
  });

  it('represents a webhook with a root spine edge and its component edge', async () => {
    const graph = await structureOf({
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      webhooks: {
        newPet: {
          post: {
            requestBody: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
            },
            responses: { '200': { description: 'ok' } },
          },
        },
      },
      components: { schemas: { Pet: { type: 'object' } } },
    });

    expect(edgeRefs(graph, 'openapi.yaml', 'webhooks/newPet')).toEqual([]);
    expect(edgeRefs(graph, 'webhooks/newPet', 'schemas/Pet')).toEqual(['#/components/schemas/Pet']);
  });

  it('represents an unresolved file ref as a resolved:false file node', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: './missing.yaml#/Pet' } },
                },
              },
            },
          },
        },
      },
    });

    expect(graph.nodes).toContainEqual({
      id: 'missing.yaml',
      resolved: false,
      kind: 'file',
      file: 'missing.yaml',
    });
    expect(edgeRefs(graph, 'GET /pets', 'missing.yaml')).toEqual(['./missing.yaml#/Pet']);
  });

  it('represents an external URL component without touching the network', async () => {
    const URL_REF = 'https://example.com/shared.yaml#/components/schemas/S';
    // A resolver that never reaches the network for the external URL: it returns a fake document.
    class OfflineResolver extends BaseResolver {
      async resolveDocument<T = unknown>(base: string | null, ref: string, isRoot = false) {
        if (ref === 'https://example.com/shared.yaml' || ref === URL_REF) {
          return {
            source: new Source('https://example.com/shared.yaml', ''),
            parsed: { components: { schemas: { S: { type: 'object' } } } },
          } as Document<T>;
        }
        return super.resolveDocument<T>(base, ref, isRoot);
      }
    }

    const graph = await structureOf(
      {
        openapi: '3.0.0',
        info: { title: 't', version: '1' },
        paths: {
          '/pets': {
            get: {
              responses: {
                '200': {
                  description: 'ok',
                  content: { 'application/json': { schema: { $ref: URL_REF } } },
                },
              },
            },
          },
        },
      },
      new OfflineResolver()
    );

    expect(graph.nodes).toContainEqual({
      id: URL_REF,
      external: true,
      resolved: true,
      kind: 'component',
      file: 'https://example.com/shared.yaml',
    });
    expect(edgeRefs(graph, 'GET /pets', URL_REF)).toEqual([URL_REF]);
  });

  it('prunes components that are unreachable from the root', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Pet' } },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: { type: 'object' },
          Orphan: { type: 'object' },
        },
      },
    });

    expect(graph.nodes.map((node) => node.id)).not.toContain('schemas/Orphan');
    expect(graph.nodes.map((node) => node.id)).toContain('schemas/Pet');
  });

  it('maps OAS2 definitions referenced from a response', async () => {
    const graph = await structureOf({
      swagger: '2.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          get: {
            responses: { '200': { description: 'ok', schema: { $ref: '#/definitions/Pet' } } },
          },
        },
      },
      definitions: { Pet: { type: 'object' } },
    });

    expect(edgeRefs(graph, 'GET /pets', 'definitions/Pet')).toEqual(['#/definitions/Pet']);
    expect(graph.nodes).toContainEqual({
      id: 'definitions/Pet',
      resolved: true,
      kind: 'component',
      file: 'openapi.yaml',
    });
  });

  it('emits nodes sorted by codepoint for deterministic output', async () => {
    // Uppercase 'Z' (0x5A) sorts before lowercase 'a' (0x61); path ids ('/…') sort before 'G'
    // (0x47 > 0x2F '/') which sorts before 'o' ('openapi.yaml') and 's' ('schemas/…').
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/Zebra': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Apple' } } },
              },
            },
          },
        },
        '/apple': { get: { responses: { '200': { description: 'ok' } } } },
      },
      components: { schemas: { Apple: { type: 'object' } } },
    });

    expect(graph.nodes.map((node) => node.id)).toEqual([
      '/Zebra',
      '/apple',
      'GET /Zebra',
      'GET /apple',
      'openapi.yaml',
      'schemas/Apple',
    ]);
  });

  it('fan-in: two operations referencing the same component produce one node and two edges', async () => {
    const graph = await structureOf({
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Shared' } },
                },
              },
            },
          },
        },
        '/users': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Shared' } },
                },
              },
            },
          },
        },
      },
      components: { schemas: { Shared: { type: 'object' } } },
    });

    expect(graph.nodes.filter((node) => node.id === 'schemas/Shared')).toHaveLength(1);
    expect(edgeRefs(graph, 'GET /pets', 'schemas/Shared')).toEqual(['#/components/schemas/Shared']);
    expect(edgeRefs(graph, 'GET /users', 'schemas/Shared')).toEqual([
      '#/components/schemas/Shared',
    ]);
  });
});
