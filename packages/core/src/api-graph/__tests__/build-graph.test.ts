import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { BaseResolver, makeDocumentFromString, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { buildApiGraph } from '../build-graph.js';
import type { DependencyGraph } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CWD = '/project';

async function graphOfString(yaml: string): Promise<DependencyGraph> {
  const document = makeDocumentFromString(yaml, '/project/openapi.yaml');
  return graphOfDocument(document, CWD);
}

async function graphOfDocument(document: Document, cwd: string): Promise<DependencyGraph> {
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(getTypes(specVersion), {});
  return buildApiGraph({
    rootDocument: document,
    specVersion,
    types,
    externalRefResolver: new BaseResolver(),
    cwd,
    resolveRef: (base, uri) => join(dirname(base), uri),
  });
}

describe('buildApiGraph', () => {
  it('builds the root -> path -> operation spine for a single file', async () => {
    const graph = await graphOfString(
      [
        'openapi: 3.0.0',
        'info: { title: t, version: "1" }',
        'paths:',
        '  /pets:',
        '    get:',
        '      operationId: listPets',
        "      responses: { '200': { description: ok } }",
      ].join('\n')
    );

    expect(graph.roots).toEqual(['openapi.yaml']);
    const operation = graph.nodes.find((node) => node.id === 'GET /pets');
    expect(operation).toMatchObject({
      kind: 'operation',
      operationId: 'listPets',
      file: 'openapi.yaml',
      resolved: true,
    });
    expect(graph.edges).toContainEqual({ from: 'openapi.yaml', to: '/pets', refs: [] });
    expect(graph.edges).toContainEqual({ from: '/pets', to: 'GET /pets', refs: [] });
  });

  it('marks an unresolvable ref as an unresolved node instead of failing', async () => {
    const graph = await graphOfString(
      [
        'openapi: 3.0.0',
        'info: { title: t, version: "1" }',
        'paths:',
        '  /pets:',
        '    get:',
        '      responses:',
        "        '200':",
        '          description: ok',
        '          content:',
        '            application/json:',
        '              schema:',
        "                $ref: '#/components/schemas/Missing'",
      ].join('\n')
    );

    const missing = graph.nodes.find((node) => node.id === 'schemas/Missing');
    expect(missing).toMatchObject({ kind: 'component', resolved: false });
  });

  it('attaches real files and operationId for a split multi-file description', async () => {
    const fixtureRoot = join(__dirname, 'fixtures', 'split');
    const resolver = new BaseResolver();
    const rootDocument = (await resolver.resolveDocument(
      null,
      join(fixtureRoot, 'openapi.yaml'),
      true
    )) as Document;

    const graph = await graphOfDocument(rootDocument, fixtureRoot);

    const operation = graph.nodes.find((node) => node.id === 'POST /tickets');
    expect(operation).toMatchObject({
      kind: 'operation',
      operationId: 'buyTickets',
      file: 'paths/tickets.yaml',
    });

    // The root's `components.schemas.Ticket` alias has no INCOMING edge on the original
    // document (the operation's $ref points straight at the file), so the graph drops it
    // as unreachable — the real file node replaces it. Phase 2's index view restores
    // semantic component names from the Named* visitors.
    expect(graph.nodes.find((node) => node.id === 'schemas/Ticket')).toBeUndefined();

    const schemaFile = graph.nodes.find((node) => node.id === 'components/schemas/Ticket.yaml');
    expect(schemaFile).toMatchObject({ kind: 'file', resolved: true });

    const pathItemFile = graph.nodes.find((node) => node.id === 'paths/tickets.yaml');
    expect(pathItemFile).toMatchObject({ kind: 'file', resolved: true });

    expect(
      graph.edges.some((edge) => edge.from === '/tickets' && edge.to === 'paths/tickets.yaml')
    ).toBe(true);
    // The operation's response schema $ref lives directly in the operation's own file, so its
    // owner is the operation itself, not the file — matching the old bundled walk, where this
    // ref's owner was the operation. (A ref found after hopping into a further file, e.g. a
    // component schema referencing another schema, would still collapse to the file — that
    // case isn't exercised by this fixture.)
    expect(
      graph.edges.some(
        (edge) => edge.from === 'POST /tickets' && edge.to === 'components/schemas/Ticket.yaml'
      )
    ).toBe(true);
    expect(
      graph.edges.some(
        (edge) => edge.from === 'paths/tickets.yaml' && edge.to === 'components/schemas/Ticket.yaml'
      )
    ).toBe(false);

    const pathNode = graph.nodes.find((node) => node.id === '/tickets');
    expect(pathNode).toMatchObject({ kind: 'path', file: 'paths/tickets.yaml' });

    // The operation's own `callbacks.onEvent` nested operation must not be misattributed to
    // the outer /tickets path: its operationId must not leak onto any node, and it must not
    // get its own top-level spine node under a synthesized callback-expression "path".
    expect(graph.nodes.some((node) => node.operationId === 'handleEvent')).toBe(false);
    expect(
      graph.nodes.find((node) => node.id === 'POST {$request.body#/callbackUrl}')
    ).toBeUndefined();
  });
});
