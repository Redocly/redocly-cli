import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes, type SpecVersion } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiAnalysis } from '../build-graph.js';
import { findComponent, findOperationByPathMethod } from '../select.js';
import {
  buildComponentListing,
  buildComponentCard,
  buildOperationCard,
  buildOperationListing,
  buildOverview,
  buildPathListing,
} from '../views.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function analysisOfFixture(
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
    expect(overview.webhooks).toBe(0);
    expect(overview.components.find((entry) => entry.section === 'schemas')?.count).toBeGreaterThan(
      0
    );
  });

  it('lists operations flat and scoped, with coordinates and tags', async () => {
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
  });

  it('lists paths with their methods and components with coordinates', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    const paths = buildPathListing(analysis, { cwd });
    expect(paths.find((item) => item.path === '/tickets')?.methods).toEqual(['get', 'post']);

    const schemas = buildComponentListing(analysis, { cwd, section: 'schemas' });
    expect(schemas.find((item) => item.name === 'Ticket')).toMatchObject({
      file: 'components/schemas/Ticket.yaml',
      start_line: 1,
    });
  });

  it('counts webhook operations in the overview', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'webhooks')
    );
    const overview = buildOverview(analysis, { specVersion, cwd });
    expect(overview.webhooks).toBe(1);
  });
});

describe('views: used-by report', () => {
  it('lists affected operations with target-first via chains', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    const { buildUsedByReport } = await import('../views.js');
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
});
