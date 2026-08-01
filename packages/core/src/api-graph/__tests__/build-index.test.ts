import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi } from '../build-graph.js';
import { buildApiIndex, type ApiIndex, type IndexGroupBy } from '../build-index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function indexOfFixture(
  fixtureRoot: string,
  groupBy: IndexGroupBy = 'tags'
): Promise<ApiIndex> {
  const resolver = new BaseResolver();
  const rootDocument = (await resolver.resolveDocument(
    null,
    join(fixtureRoot, 'openapi.yaml'),
    true
  )) as Document;
  const specVersion = detectSpec(rootDocument.parsed);
  const types = normalizeTypes(getTypes(specVersion), {});
  const analysis = await analyzeApi({
    rootDocument,
    specVersion,
    types,
    externalRefResolver: resolver,
    cwd: fixtureRoot,
    resolveRef: (base, uri) => join(dirname(base), uri),
  });
  return buildApiIndex(analysis, { specVersion, cwd: fixtureRoot, groupBy });
}

describe('buildApiIndex', () => {
  it('assembles sections with semantic ids, real files, and line ranges', async () => {
    const index = await indexOfFixture(join(__dirname, 'fixtures', 'split'));

    expect(index.docName).toBe('openapi.yaml');
    expect(index.spec).toBe('oas3_0');
    expect(index.docDescription).toBe('Split API — Multi-file description for api-graph tests.');
    expect(index.structure.map((section) => section.id)).toEqual([
      'Overview',
      'Servers',
      'Operations',
      'Components',
    ]);

    const operations = index.structure.find((section) => section.id === 'Operations')!;
    expect(operations.pointer).toBe('#/paths');
    const tickets = operations.nodes!.find((group) => group.id === 'Tickets')!;
    expect(tickets.summary).toBe('Buy tickets and manage reservations.');
    const buyTickets = tickets.nodes!.find((node) => node.id === 'POST /tickets')!;
    expect(buyTickets).toMatchObject({
      title: 'POST /tickets — Buy museum tickets',
      operationId: 'buyTickets',
      file: 'paths/tickets.yaml',
    });
    expect(buyTickets.pointer).toBe('#/post');
    expect(buyTickets.start_line).toBeGreaterThanOrEqual(1);
    expect(buyTickets.end_line).toBeGreaterThanOrEqual(buyTickets.start_line!);

    // Phase 1's graph dropped split component aliases; the INDEX restores semantic names,
    // pointing at the real defining file.
    const components = index.structure.find((section) => section.id === 'Components')!;
    const schemas = components.nodes!.find((group) => group.id === 'components/schemas')!;
    const ticket = schemas.nodes!.find((node) => node.id === 'schemas/Ticket')!;
    expect(ticket.file).toBe('components/schemas/Ticket.yaml');
    expect(ticket.start_line).toBe(1);
  });

  it('groups by paths with --group-by paths', async () => {
    const index = await indexOfFixture(join(__dirname, 'fixtures', 'split'), 'paths');

    const operations = index.structure.find((section) => section.id === 'Operations')!;
    const ticketsPath = operations.nodes!.find((group) => group.id === '/tickets')!;
    expect(ticketsPath.nodes!.map((node) => node.id)).toEqual(['GET /tickets', 'POST /tickets']);
  });

  it('adds a Webhooks section from webhook operations', async () => {
    const index = await indexOfFixture(join(__dirname, 'fixtures', 'webhooks'));

    const webhooks = index.structure.find((section) => section.id === 'Webhooks')!;
    expect(webhooks.nodes!.map((node) => node.id)).toEqual(['POST newTicket']);
    expect(webhooks.nodes![0].title).toBe('POST newTicket — New ticket alert');
  });
});
