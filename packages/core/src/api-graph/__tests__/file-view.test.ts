import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiAnalysis } from '../build-graph.js';
import { buildFileCard, buildFileUsedByReport } from '../file-view.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function analysisOfFixture(
  fixtureRoot: string
): Promise<{ analysis: ApiAnalysis; cwd: string }> {
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
  return { analysis, cwd: fixtureRoot };
}

describe('buildFileCard', () => {
  it('lists the component a component file defines', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    const card = buildFileCard(analysis, 'components/schemas/Ticket.yaml', { cwd });

    expect(card).toBeDefined();
    expect(card!.file).toBe('components/schemas/Ticket.yaml');
    expect(card!.defines).toHaveLength(1);
    expect(card!.defines[0]).toMatchObject({ component: 'schemas', name: 'Ticket' });
  });

  it('lists every operation a multi-operation path file defines', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    const card = buildFileCard(analysis, 'paths/tickets.yaml', { cwd });

    expect(card).toBeDefined();
    expect(card!.defines).toHaveLength(2);
    expect(card!.defines[0]).toMatchObject({ method: 'get', path: '/tickets' });
    expect(card!.defines[1]).toMatchObject({
      method: 'post',
      path: '/tickets',
      operationId: 'buyTickets',
    });
  });

  it('returns an empty-defines card for a graph-node file that defines nothing itself', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    // The root document is a node in the graph but every operation and component in this split
    // layout resolves into another file, so the root itself defines nothing directly.
    const card = buildFileCard(analysis, 'openapi.yaml', { cwd });

    expect(card).toEqual({ file: 'openapi.yaml', defines: [] });
  });

  it('returns undefined for a file that plays no part in the graph', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    expect(buildFileCard(analysis, 'nonexistent.yaml', { cwd })).toBeUndefined();
  });
});

describe('buildFileUsedByReport', () => {
  it('reports the operation that references a component file, with a via chain', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    const report = buildFileUsedByReport(analysis, 'components/schemas/Ticket.yaml', cwd);

    expect(report.target).toEqual({
      id: 'components/schemas/Ticket.yaml',
      file: 'components/schemas/Ticket.yaml',
    });
    const post = report.affectedOperations.find((entry) => entry.id === 'POST /tickets');
    expect(post).toBeDefined();
    expect(post!.via[0]).toBe('schemas/Ticket');
    expect(post!.via[post!.via.length - 1]).toBe('POST /tickets');
  });

  it("excludes a referrer that lives in the target file itself — a file can't affect itself", async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'webhooks'));
    // The webhook and the schema it references are both declared in this single-file fixture, so
    // without the same-file exclusion the webhook would incorrectly show up as affected by it.
    const report = buildFileUsedByReport(analysis, 'openapi.yaml', cwd);

    expect(report.affectedOperations).toEqual([]);
    expect(report.affectedComponents).toEqual([]);
  });

  it('keeps the shortest via chain when a referrer is reachable through more than one seed', async () => {
    const { analysis, cwd } = await analysisOfFixture(
      join(__dirname, 'fixtures', 'shared-components')
    );
    // shared.yaml defines WidgetA, WidgetB, and WidgetRequest (WidgetRequest refs WidgetB). The
    // operation in widgets.yaml reaches the file two ways: directly via WidgetA (2 hops) and
    // indirectly via WidgetRequest -> WidgetB (3 hops). The merge must keep the shorter one.
    const report = buildFileUsedByReport(analysis, 'shared.yaml', cwd);

    const operation = report.affectedOperations.find((entry) => entry.id === 'POST /widgets');
    expect(operation).toBeDefined();
    expect(operation!.via).toEqual(['shared.yaml#/components/schemas/WidgetA', 'POST /widgets']);
  });
});
