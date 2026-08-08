import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiAnalysis } from '../build-graph.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function analyzeFixture(fixtureRoot: string): Promise<ApiAnalysis> {
  const resolver = new BaseResolver();
  const rootDocument = (await resolver.resolveDocument(
    null,
    join(fixtureRoot, 'openapi.yaml'),
    true
  )) as Document;
  const specVersion = detectSpec(rootDocument.parsed);
  const types = normalizeTypes(getTypes(specVersion), {});
  return analyzeApi({
    rootDocument,
    specVersion,
    types,
    externalRefResolver: resolver,
    cwd: fixtureRoot,
    resolveRef: (base, uri) => join(dirname(base), uri),
  });
}

describe('analyzeApi', () => {
  it('collects index metadata alongside the graph in one walk', async () => {
    const { graph, meta } = await analyzeFixture(join(__dirname, 'fixtures', 'split'));

    expect(meta.info).toMatchObject({
      title: 'Split API',
      description: 'Multi-file description for api-graph tests.',
    });
    expect(meta.servers?.urls).toEqual(['https://api.example.com/v1']);
    expect(meta.declaredTags.map((tag) => tag.name)).toEqual(['Tickets']);
    expect(meta.declaredTags[0].description).toBe('Buy tickets and manage reservations.');

    const buyTickets = meta.operations.find((operation) => operation.id === 'POST /tickets');
    expect(buyTickets).toMatchObject({
      method: 'POST',
      containerKey: '/tickets',
      isWebhook: false,
      tags: ['Tickets'],
      summary: 'Buy museum tickets',
      operationId: 'buyTickets',
    });
    expect(buyTickets!.location.source.absoluteRef.endsWith('paths/tickets.yaml')).toBe(true);

    const ticketComponent = meta.components.find(
      (component) => component.section === 'schemas' && component.name === 'Ticket'
    );
    expect(ticketComponent).toBeDefined();
    expect(ticketComponent!.location.source.absoluteRef.endsWith('Ticket.yaml')).toBe(true);

    expect(meta.pathsLocation).toBeDefined();
    expect(meta.componentsLocation).toBeDefined();

    // The graph is unchanged by metadata collection.
    expect(graph.nodes.some((node) => node.id === 'POST /tickets')).toBe(true);
  });

  it('collects webhook operations for the index without adding them to the graph', async () => {
    const { graph, meta } = await analyzeFixture(join(__dirname, 'fixtures', 'webhooks'));

    const alert = meta.operations.find((operation) => operation.isWebhook);
    expect(alert).toMatchObject({
      method: 'POST',
      containerKey: 'newTicket',
      summary: 'New ticket alert',
    });
    expect(meta.webhooksLocation).toBeDefined();
    expect(graph.nodes.some((node) => node.id === 'POST newTicket')).toBe(false);
  });
});
