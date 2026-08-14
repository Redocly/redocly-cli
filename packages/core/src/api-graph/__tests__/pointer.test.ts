import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes, type SpecVersion } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiAnalysis } from '../build-graph.js';
import { resolvePointerSelector } from '../pointer.js';

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

describe('resolvePointerSelector: indexed nodes', () => {
  it('resolves a component pointer to the named component', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    const result = resolvePointerSelector(analysis, '#/components/schemas/Ticket', { cwd });

    expect(result.kind).toBe('component');
    if (result.kind !== 'component') throw new Error('expected a component resolution');
    expect(result.component.section).toBe('schemas');
    expect(result.component.name).toBe('Ticket');
  });

  it('resolves an operation pointer with ~1-escaped path segments', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    const result = resolvePointerSelector(analysis, '#/paths/~1tickets/post', { cwd });

    expect(result.kind).toBe('operation');
    if (result.kind !== 'operation') throw new Error('expected an operation resolution');
    expect(result.operation.operationId).toBe('buyTickets');
    expect(result.operation.containerKey).toBe('/tickets');
  });

  it('accepts a pointer without a leading #', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    const result = resolvePointerSelector(analysis, '/components/schemas/Ticket', { cwd });

    expect(result.kind).toBe('component');
    if (result.kind !== 'component') throw new Error('expected a component resolution');
    expect(result.component.name).toBe('Ticket');
  });
});

describe('resolvePointerSelector: deep pointers', () => {
  it('resolves a pointer into a schema property with coordinates, content, and its ancestor', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'webhooks'));

    const result = resolvePointerSelector(
      analysis,
      '#/components/schemas/TicketAlert/properties/ticketId',
      { cwd }
    );

    expect(result.kind).toBe('deep');
    if (result.kind !== 'deep') throw new Error('expected a deep resolution');
    expect(result.pointer).toBe('#/components/schemas/TicketAlert/properties/ticketId');
    expect(result.envelope.file).toBe('openapi.yaml');
    expect(result.envelope.start_line).toBe(24);
    expect(result.envelope.end_line).toBe(24);
    expect(result.envelope.content).toContain('type: string');
    expect(result.ancestor).toBeDefined();
    expect(result.ancestor!.id).toBe('schemas/TicketAlert');
    expect(result.ancestor!.component?.name).toBe('TicketAlert');
    expect(result.ancestor!.usedByCount).toBeGreaterThan(0);
  });
});

describe('resolvePointerSelector: unresolved pointers', () => {
  it('reports the nearest resolvable ancestor for a pointer that resolves nowhere', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    const result = resolvePointerSelector(analysis, '#/components/schemas/Ticket/bogus', { cwd });

    expect(result.kind).toBe('unresolved');
    if (result.kind !== 'unresolved') throw new Error('expected an unresolved resolution');
    expect(result.pointer).toBe('#/components/schemas/Ticket/bogus');
    expect(result.nearestResolvable).toBe('#/components/schemas/Ticket');
  });
});
