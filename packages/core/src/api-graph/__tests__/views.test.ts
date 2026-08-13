import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes, type SpecVersion } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiAnalysis } from '../build-graph.js';
import { findComponent, findOperationByPathMethod, findWebhookOperation } from '../select.js';
import {
  buildComponentListing,
  buildComponentCard,
  buildOperationCard,
  buildOperationListing,
  buildOverview,
  buildUsedByReport,
} from '../views.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function analysisOfFixture(
  fixtureRoot: string
): Promise<{ analysis: ApiAnalysis; specVersion: SpecVersion; cwd: string }> {
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
  return { analysis, specVersion, cwd: fixtureRoot };
}

describe('views: overview and listings', () => {
  it('builds the overview with tag counts and component counts', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'split')
    );
    const overview = buildOverview(analysis, { specVersion, cwd });

    expect(overview.docName).toBe('openapi.yaml');
    expect(overview.spec).toBe('oas3_0');
    expect(overview.servers?.urls).toEqual(['https://api.example.com/v1']);
    expect(overview.tags).toEqual([
      { name: 'Tickets', summary: 'Buy tickets and manage reservations.', operations: 2 },
    ]);
    expect(overview.operations).toBe(2);
    expect(overview.webhooks).toEqual([]);
    expect(overview.components.find((entry) => entry.section === 'schemas')?.count).toBeGreaterThan(
      0
    );
  });

  it('lists operations flat and scoped, as cards with refs and usedBy', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    const allOperations = buildOperationListing(analysis, { cwd });
    expect(allOperations.map((item) => `${item.method} ${item.path}`)).toContain('post /tickets');
    const scoped = buildOperationListing(analysis, { cwd, tag: 'Tickets' });
    expect(scoped).toHaveLength(2);
    expect(scoped[1]).toMatchObject({
      method: 'post',
      path: '/tickets',
      operationId: 'buyTickets',
      tags: ['Tickets'],
      file: 'paths/tickets.yaml',
    });
    expect(scoped[1].start_line).toBeGreaterThanOrEqual(1);
    expect(scoped[1].refs.map((ref) => ref.name)).toContain('Ticket');
    expect(scoped[1].usedBy).toEqual([]);
    expect(scoped[1]).not.toHaveProperty('content');
    expect(scoped[1]).not.toHaveProperty('deps');
  });

  it('lists components as cards with refs and usedBy', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    const schemas = buildComponentListing(analysis, { cwd, section: 'schemas' });
    const ticket = schemas.find((item) => item.name === 'Ticket');
    expect(ticket).toMatchObject({
      file: 'components/schemas/Ticket.yaml',
      start_line: 1,
    });
    expect(ticket!.refs).toHaveLength(1);
    expect(ticket!.refs[0]).toMatchObject({
      resolved: true,
      file: 'components/schemas/TicketId.yaml',
    });
    expect(ticket!.usedBy.map((entry) => entry.id)).toContain('POST /tickets');
    expect(ticket).not.toHaveProperty('content');
    expect(ticket).not.toHaveProperty('deps');
  });

  it('names webhooks with their operation counts in the overview', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'webhooks')
    );
    const overview = buildOverview(analysis, { specVersion, cwd });
    expect(overview.webhooks).toEqual([{ name: 'newTicket', operations: 1 }]);
  });

  it('orders webhooks by first appearance, not alphabetically', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'multi-webhooks')
    );
    const overview = buildOverview(analysis, { specVersion, cwd });
    expect(overview.webhooks).toEqual([
      { name: 'zLast', operations: 1 },
      { name: 'aFirst', operations: 2 },
    ]);
  });
});

describe('views: used-by report', () => {
  it('lists affected operations with target-first via chains', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    const report = buildUsedByReport(analysis, 'schemas/Ticket', cwd);

    expect(report.target.id).toBe('schemas/Ticket');
    const post = report.affectedOperations.find((entry) => entry.id === 'POST /tickets');
    expect(post).toBeDefined();
    expect(post!.via[0]).toBe('schemas/Ticket');
    expect(post!.via[post!.via.length - 1]).toBe('POST /tickets');
    for (const entry of report.affectedComponents) {
      expect(entry.component).toBeDefined();
    }
  });

  it('surfaces a webhook operation that references a component', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'webhooks'));
    const report = buildUsedByReport(analysis, 'schemas/TicketAlert', cwd);

    const webhookEntry = report.affectedOperations.find((entry) => entry.id === 'POST newTicket');
    expect(webhookEntry).toMatchObject({ method: 'post', webhook: 'newTicket' });
    // `via` holds graph node ids, and every method under a webhook shares one container node
    // (see toUsedByEntry), so the chain ends at the container id, not at the operation id.
    expect(webhookEntry!.via[0]).toBe('schemas/TicketAlert');
    expect(webhookEntry!.via[webhookEntry!.via.length - 1]).toBe('webhooks/newTicket');
  });
});

describe('views: cards', () => {
  it('builds an operation card with typed refs and no content by default', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'split')
    );
    const operation = findOperationByPathMethod(analysis.meta, '/tickets', 'post')!;
    const card = buildOperationCard(analysis, operation, { specVersion, cwd });

    expect(card).toMatchObject({ method: 'post', path: '/tickets', operationId: 'buyTickets' });
    expect(card.content).toBeUndefined();
    const schemaRef = card.refs.find((ref) => ref.name === 'Ticket');
    expect(schemaRef).toMatchObject({ component: 'schemas', resolved: true });
    expect(card.usedBy).toEqual([]);
  });

  it('builds a component card whose usedBy lists the referencing operation', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'split')
    );
    const component = findComponent(analysis.meta, 'schemas', 'Ticket')!;
    const card = buildComponentCard(analysis, component, { specVersion, cwd });

    expect(card).toMatchObject({ component: 'schemas', name: 'Ticket' });
    expect(card.usedBy.map((entry) => entry.id)).toContain('POST /tickets');
    const operationEntry = card.usedBy.find((entry) => entry.id === 'POST /tickets');
    expect(operationEntry).toMatchObject({ method: 'post', path: '/tickets' });
  });

  it('appends content and the deps closure with withDeps', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'split')
    );
    const operation = findOperationByPathMethod(analysis.meta, '/tickets', 'post')!;
    const card = buildOperationCard(analysis, operation, { specVersion, cwd, withDeps: true });

    expect(card.content).toContain('operationId: buyTickets');
    expect(card.deps!.map((dep) => dep.id)).toContain('schemas/Ticket');
  });

  it('seeds the deps closure of a webhook operation from its container', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'webhooks')
    );
    const operation = findWebhookOperation(analysis.meta, 'newTicket')!;
    const card = buildOperationCard(analysis, operation, { specVersion, cwd, withDeps: true });

    // Every method under a webhook shares one container node, so this closure is scoped to the
    // container rather than to this one operation; the fixture defines only one method, so here
    // they're the same set.
    expect(card.content).toContain('New ticket alert');
    expect(card.deps!.map((dep) => dep.id)).toContain('schemas/TicketAlert');
  });

  it('buildComponentCard with withContent returns raw source without a deps closure', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'split')
    );
    const component = analysis.meta.components.find((candidate) => candidate.name === 'Ticket')!;
    const card = buildComponentCard(analysis, component, { specVersion, cwd, withContent: true });

    expect(card.content).toContain('type: object');
    expect(card.deps).toBeUndefined();
  });

  it('buildOperationCard with withContent returns raw source without a deps closure', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'split')
    );
    const operation = analysis.meta.operations[0];
    const card = buildOperationCard(analysis, operation, { specVersion, cwd, withContent: true });

    expect(card.content).toBeDefined();
    expect(card.deps).toBeUndefined();
  });
});
