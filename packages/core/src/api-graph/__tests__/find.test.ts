import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiAnalysis, type CollectedOperation } from '../build-graph.js';
import { findMatches, FIND_LIMIT } from '../find.js';

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

/** Repeats the fixture's real entries to push the match count past FIND_LIMIT without fabricating data. */
function repeat<EntryType>(entries: EntryType[], count: number): EntryType[] {
  return Array.from({ length: count }, (_, index) => entries[index % entries.length]);
}

describe('findMatches', () => {
  // The fixture (packages/core/src/api-graph/__tests__/fixtures/split) is a "Tickets" API with two
  // real operations (GET/POST /tickets) and one real component (schemas/Ticket) -- not the
  // pet/order domain the task brief sketched. Terms below are adapted to what it actually contains.

  it('ranks a path/operationId hit above a hit that only appears in prose', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    // Both real operations sit on the same "/tickets" path, so any term that matches one of them
    // through the path matches both, tied. To prove a path/operationId hit outranks a hit that
    // only shows up in prose, add one operation whose path/operationId don't mention "ticket" at
    // all -- only its description does. It borrows a real operation's location so
    // buildOperationListCard still resolves real content for it instead of throwing.
    const proseOnlyMatch: CollectedOperation = {
      id: 'GET /status',
      method: 'GET',
      containerKey: '/status',
      isWebhook: false,
      tags: ['Status'],
      summary: 'Check availability',
      description: 'Look up ticket availability for an event.',
      location: analysis.meta.operations[0].location,
      pathItemLocation: analysis.meta.operations[0].pathItemLocation,
    };
    const analysisWithProseMatch: ApiAnalysis = {
      ...analysis,
      meta: { ...analysis.meta, operations: [...analysis.meta.operations, proseOnlyMatch] },
    };

    const report = findMatches(analysisWithProseMatch, ['ticket'], { cwd });

    expect(report.operations).toHaveLength(3);
    for (const operation of report.operations) {
      const haystack = [
        operation.path,
        operation.operationId,
        operation.summary,
        operation.description,
        operation.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      expect(haystack).toContain('ticket');
    }
    // The two real operations match through their path; the synthetic one matches only through
    // its description, so it must rank last.
    expect(report.operations[0].path).toContain('ticket');
    expect(report.operations[2].path).toBe('/status');
  });

  it('requires every term to match, excluding an operation that only satisfies one of them', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    // "buy" only appears on the POST operation (operationId "buyTickets" / summary "Buy museum
    // tickets"); "ticket" appears on both. An AND search for both terms should keep only POST,
    // proving a partial match doesn't qualify.
    const report = findMatches(analysis, ['ticket', 'buy'], { cwd });

    expect(report.operations.map((operation) => operation.operationId)).toEqual(['buyTickets']);
  });

  it('matches components by name and reports totals', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    const report = findMatches(analysis, ['ticket'], { cwd });

    expect(
      report.components.some((component) => component.name.toLowerCase().includes('ticket'))
    ).toBe(true);
    expect(report.totalOperations).toBeGreaterThanOrEqual(report.operations.length);
    expect(report.totalComponents).toBeGreaterThanOrEqual(report.components.length);
  });

  it('returns empty lists when a term matches nothing', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    const report = findMatches(analysis, ['zzz-nothing'], { cwd });

    expect(report.operations).toEqual([]);
    expect(report.components).toEqual([]);
    expect(report.totalOperations).toBe(0);
    expect(report.totalComponents).toBe(0);
  });

  it('caps each kind at FIND_LIMIT but still reports the full totals', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));
    const matchCount = FIND_LIMIT + 5;
    // Both real operations and the real component already match "ticket"; repeat them past
    // FIND_LIMIT to exercise the cap without inventing data the fixture doesn't have.
    const paddedAnalysis: ApiAnalysis = {
      ...analysis,
      meta: {
        ...analysis.meta,
        operations: repeat(analysis.meta.operations, matchCount),
        components: repeat(analysis.meta.components, matchCount),
      },
    };

    const report = findMatches(paddedAnalysis, ['ticket'], { cwd });

    expect(report.operations).toHaveLength(FIND_LIMIT);
    expect(report.totalOperations).toBe(matchCount);
    expect(report.components).toHaveLength(FIND_LIMIT);
    expect(report.totalComponents).toBe(matchCount);
  });
});
