import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes, type SpecVersion } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiAnalysis } from '../build-graph.js';
import { resolvePointerSelector } from '../pointer.js';
import { DEPS_CONTENT_CAP_BYTES } from '../slice.js';

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

describe('resolvePointerSelector: container pointers', () => {
  it('routes the document root (and an empty pointer) to the overview container kind', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    expect(resolvePointerSelector(analysis, '#/', { cwd })).toEqual({ kind: 'overview' });
    expect(resolvePointerSelector(analysis, '', { cwd })).toEqual({ kind: 'overview' });
  });

  it('routes #/paths to the all-operations container kind', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    expect(resolvePointerSelector(analysis, '#/paths', { cwd })).toEqual({
      kind: 'all-operations',
    });
  });

  it('routes #/webhooks to the all-webhooks container kind', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'webhooks'));

    expect(resolvePointerSelector(analysis, '#/webhooks', { cwd })).toEqual({
      kind: 'all-webhooks',
    });
  });

  it('routes #/components to the components-root container kind', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    expect(resolvePointerSelector(analysis, '#/components', { cwd })).toEqual({
      kind: 'components-root',
    });
  });

  it('routes #/components/<section> to that section, only when it names a real section', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    expect(resolvePointerSelector(analysis, '#/components/schemas', { cwd })).toEqual({
      kind: 'component-section',
      section: 'schemas',
    });
    // A bogus section isn't a container match — it falls through to the generic (here:
    // unresolved) resolution below instead of being misreported as a component section.
    expect(resolvePointerSelector(analysis, '#/components/bogus', { cwd }).kind).toBe('unresolved');
  });

  it('routes #/paths/<path> to that path, only when the path exists', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    expect(resolvePointerSelector(analysis, '#/paths/~1tickets', { cwd })).toEqual({
      kind: 'path-operations',
      path: '/tickets',
    });
    expect(resolvePointerSelector(analysis, '#/paths/~1nope', { cwd }).kind).toBe('unresolved');
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
    expect(result.ancestor!.pointer).toBe('#/components/schemas/TicketAlert');
    expect(result.ancestor!.usedByCount).toBeGreaterThan(0);
  });

  it('truncates a deep node whose sliced content exceeds the deps-style cap', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'pointer-cap'));

    const result = resolvePointerSelector(analysis, '#/info', { cwd });

    expect(result.kind).toBe('deep');
    if (result.kind !== 'deep') throw new Error('expected a deep resolution');
    expect(result.envelope.truncated).toBe(true);
    expect(result.envelope.content.length).toBe(DEPS_CONTENT_CAP_BYTES);
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

  it('does not resolve an inherited prototype property like constructor', async () => {
    const { analysis, cwd } = await analysisOfFixture(join(__dirname, 'fixtures', 'split'));

    const result = resolvePointerSelector(analysis, '#/info/constructor', { cwd });

    expect(result.kind).toBe('unresolved');
  });
});
