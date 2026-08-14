import {
  analyzeApi,
  BaseResolver,
  detectSpec,
  getTypes,
  normalizeTypes,
  type Document,
} from '@redocly/openapi-core';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveTreeView, TreeSelectorError } from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, '../../../../../core/src/api-graph/__tests__/fixtures/split');
const FIXTURE_WEBHOOKS = join(
  __dirname,
  '../../../../../core/src/api-graph/__tests__/fixtures/webhooks'
);
const FIXTURE_MULTI_WEBHOOKS = join(
  __dirname,
  '../../../../../core/src/api-graph/__tests__/fixtures/multi-webhooks'
);
const FIXTURE_POINTER_DEEP = join(
  __dirname,
  '../../../../../core/src/api-graph/__tests__/fixtures/webhooks'
);

async function analysisOfFixture(fixtureRoot: string) {
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

describe('resolveTreeView', () => {
  it('routes bare invocation to the overview and selectors to their views', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({}).kind).toBe('overview');
    expect(route({ tag: 'Tickets' })).toMatchObject({ kind: 'operations', scope: 'Tickets' });
    expect(route({ operations: true }).kind).toBe('operations');
    expect(route({ path: '/tickets' }).kind).toBe('operations');
    expect(route({ path: '/tickets', operation: 'post' }).kind).toBe('operation-card');
    expect(route({ operation: 'buyTickets' }).kind).toBe('operation-card');
    expect(route({ component: 'schemas' })).toMatchObject({
      kind: 'components',
      section: 'schemas',
    });
    expect(route({ component: 'schema', name: 'Ticket' }).kind).toBe('component-card');
    expect(route({ component: 'schemas', name: 'Ticket', 'used-by': true }).kind).toBe('used-by');
    expect(route({ file: 'components/schemas/Ticket.yaml' })).toMatchObject({
      kind: 'file-card',
      card: { file: 'components/schemas/Ticket.yaml' },
    });
    expect(route({ file: 'components/schemas/Ticket.yaml', 'used-by': true }).kind).toBe('used-by');
  });

  it('lists every webhook operation with --webhooks, same shape as --operations', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE_MULTI_WEBHOOKS);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ webhooks: true })).toMatchObject({
      kind: 'operations',
      items: [
        { method: 'post', webhook: 'zLast' },
        { method: 'get', webhook: 'aFirst' },
        { method: 'post', webhook: 'aFirst' },
      ],
    });
  });

  it('resolves --file to a file card listing everything the file defines', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ file: 'paths/tickets.yaml' })).toMatchObject({
      kind: 'file-card',
      card: {
        file: 'paths/tickets.yaml',
        defines: [
          { method: 'get', path: '/tickets' },
          { method: 'post', path: '/tickets' },
        ],
      },
    });
  });

  it('resolves --file relative to the API root dir first, falling back to cwd-relative', async () => {
    const { analysis, specVersion } = await analysisOfFixture(FIXTURE);
    // FIXTURE's own directory is the API root; its parent is a cwd the file also happens to be
    // reachable from, but only via a cwd-relative path (prefixed with the fixture's own dir name).
    const parentCwd = dirname(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, parentCwd);

    expect(route({ file: 'components/schemas/Ticket.yaml' }).kind).toBe('file-card');
    expect(route({ file: 'split/components/schemas/Ticket.yaml' }).kind).toBe('file-card');
  });

  it('rejects bad selections with actionable messages', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ tag: 'Ticket' })).toThrow(TreeSelectorError);
    expect(route({ tag: 'Ticket' })).toThrow(/Did you mean.*Tickets/);
    expect(route({ operation: 'post' })).toThrow(/looks like an HTTP method.*--path/);
    expect(route({ operation: 'buyTickets', 'with-deps': false, path: '/nope' })).toThrow(
      /No path "\/nope".*Run `redocly tree <api> --operations` to list operations\./
    );
    expect(route({ component: 'bogus' })).toThrow(/Unknown component section/);
    expect(route({ name: 'Ticket' })).toThrow(/--name requires --component/);
    expect(route({ 'with-deps': true })).toThrow(/--with-deps requires/);
    expect(route({ 'used-by': true })).toThrow(/--used-by requires/);
    expect(
      route({ 'used-by': true, 'with-deps': true, component: 'schemas', name: 'Ticket' })
    ).toThrow(/--used-by and --with-deps cannot be combined/);
    expect(route({ tag: 'Tickets', operation: 'buyTickets' })).toThrow(
      /combining it with --tag is ambiguous/
    );
    expect(route({ file: 'components/schemas/Ticket.yaml', 'with-deps': true })).toThrow(
      /--with-deps requires an operation or component selection/
    );
    expect(route({ file: 'components/schemas/Ticket' })).toThrow(
      /No file "components\/schemas\/Ticket"/
    );
    expect(route({ file: 'components/schemas/Ticket' })).toThrow(/Did you mean.*Ticket\.yaml/);
    expect(route({ webhooks: true, tag: 'Tickets' })).toThrow(/--webhooks .*cannot be combined/);
    expect(route({ webhooks: true, component: 'schemas' })).toThrow(
      /--webhooks .*cannot be combined/
    );
  });

  it('rejects an unknown --webhook selection', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE_WEBHOOKS);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ webhook: 'nope' })).toThrow(/No webhook "nope"/);
  });

  it('seeds a webhook operation --used-by report from the shared container node, not the display id', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE_WEBHOOKS);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    const view = route({ webhook: 'newTicket', operation: 'post', 'used-by': true });
    expect(view.kind).toBe('used-by');
    if (view.kind !== 'used-by') throw new Error('expected a used-by view');

    // The target must resolve against the container id (`webhooks/newTicket`); the operation's
    // own display id ("POST newTicket") is never a graph node, so seeding from it silently
    // produced an empty report even though this exact id has real referrers in the graph.
    expect(view.report.target).toMatchObject({ id: 'webhooks/newTicket', webhook: 'newTicket' });

    // This fixture's webhook container has no referrers of its own (only the schema it refs),
    // so derive the expectation from the graph instead of hardcoding an empty list — the
    // assertion stays meaningful (non-vacuous) even though it happens to equal zero here.
    const expectedAffectedIds = analysis.graph.edges
      .filter((edge) => edge.to === 'webhooks/newTicket' && edge.refs.length > 0)
      .map((edge) => edge.from);
    expect(
      [...view.report.affectedOperations, ...view.report.affectedComponents].map(
        (entry) => entry.id
      )
    ).toEqual(expectedAffectedIds);
  });

  it('routes a deep --pointer whose nearest ancestor is an operation, and --used-by at that ancestor pointer without throwing', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE_WEBHOOKS);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    const view = route({ pointer: '#/webhooks/newTicket/post/responses/200' });
    expect(view.kind).toBe('pointer-card');
    if (view.kind !== 'pointer-card') throw new Error('expected a pointer-card view');
    expect(view.card.ancestor).toBeDefined();
    expect(view.card.ancestor!.pointer).toMatch(/^#\/(paths|webhooks)\/.+/);
    // The display id names the operation the way `ai` does elsewhere ("post webhook newTicket"),
    // not the internal `webhooks/newTicket` container id the usedBy count is actually keyed on.
    expect(view.card.ancestor!.id).toBe('post webhook newTicket');

    // Routing --used-by at exactly that ancestor pointer must resolve and not throw, even
    // though the ancestor here is an operation rather than a component.
    expect(() => route({ pointer: view.card.ancestor!.pointer, 'used-by': true })).not.toThrow();
  });

  it('routes --find to a find view with lowercased whitespace-split terms', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    const view = route({ find: 'Release  ASSET' });
    expect(view.kind).toBe('find');
    if (view.kind === 'find') expect(view.report.terms).toEqual(['release', 'asset']);
  });

  it('rejects --find combined with any other selector', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ find: 'pet', tag: 'pets' })).toThrow(TreeSelectorError);
    expect(route({ find: 'pet', 'with-deps': true })).toThrow(TreeSelectorError);
  });

  it('rejects an effectively empty --find', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ find: '   ' })).toThrow(TreeSelectorError);
  });

  it('routes an indexed component --pointer to the same component-card view --component would produce', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    const view = route({ pointer: '#/components/schemas/Ticket' });
    expect(view).toMatchObject({
      kind: 'component-card',
      card: { component: 'schemas', name: 'Ticket' },
    });
  });

  it('routes an escaped operation --pointer to the operation-card view', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    const view = route({ pointer: '#/paths/~1tickets/post' });
    expect(view).toMatchObject({ kind: 'operation-card', card: { operationId: 'buyTickets' } });
  });

  it('routes --pointer=# (the document root) to the same overview view the bare invocation renders', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ pointer: '#/' })).toEqual(route({}));
    expect(route({ pointer: '' })).toEqual(route({}));
  });

  it('routes --pointer=#/paths to the same operations listing --operations renders', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ pointer: '#/paths' })).toEqual(route({ operations: true }));
  });

  it('routes --pointer=#/webhooks to the same listing --webhooks renders', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE_MULTI_WEBHOOKS);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ pointer: '#/webhooks' })).toEqual(route({ webhooks: true }));
  });

  it('routes --pointer=#/components/<section> to the same listing --component renders', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ pointer: '#/components/schemas' })).toEqual(route({ component: 'schemas' }));
  });

  it('routes --pointer=#/paths/<path> to the same listing --path renders', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ pointer: '#/paths/~1tickets' })).toEqual(route({ path: '/tickets' }));
  });

  it('rejects --pointer=#/components, naming the sections one level deeper', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ pointer: '#/components' })).toThrow(
      /Point one level deeper: --pointer='#\/components\/<section>'\. Sections: schemas/
    );
  });

  it('rejects --used-by/--with-deps on a container --pointer that resolves to a listing', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ pointer: '#/paths', 'used-by': true })).toThrow(
      /--used-by and --with-deps need an indexed component or operation, not a listing/
    );
  });

  it('routes a deep --pointer to a pointer-card with its nearest indexed ancestor', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE_POINTER_DEEP);
    const route = (argv: Record<string, unknown>) =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    const view = route({ pointer: '#/components/schemas/TicketAlert/properties/ticketId' });
    expect(view.kind).toBe('pointer-card');
    if (view.kind !== 'pointer-card') throw new Error('expected a pointer-card view');
    expect(view.card.pointer).toBe('#/components/schemas/TicketAlert/properties/ticketId');
    expect(view.card.content).toContain('type: string');
    expect(view.card.ancestor).toMatchObject({
      id: 'schemas/TicketAlert',
      pointer: '#/components/schemas/TicketAlert',
    });
    expect(view.card.ancestor!.usedByCount).toBeGreaterThan(0);
  });

  it('rejects --used-by/--with-deps on a deep --pointer, hinting the ancestor pointer', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE_POINTER_DEEP);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(
      route({
        pointer: '#/components/schemas/TicketAlert/properties/ticketId',
        'with-deps': true,
      })
    ).toThrow(/Nearest: --pointer='#\/components\/schemas\/TicketAlert'/);
  });

  it('rejects an unresolved --pointer, naming the nearest resolvable ancestor', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ pointer: '#/components/schemas/Ticket/bogus' })).toThrow(
      /Nothing at "#\/components\/schemas\/Ticket\/bogus"\. Nearest resolvable: #\/components\/schemas\/Ticket\./
    );
  });

  it('rejects --pointer combined with another selector', async () => {
    const { analysis, specVersion, cwd } = await analysisOfFixture(FIXTURE);
    const route = (argv: Record<string, unknown>) => () =>
      resolveTreeView(argv as never, analysis, specVersion, cwd);

    expect(route({ pointer: '#/components/schemas/Ticket', tag: 'Tickets' })).toThrow(
      TreeSelectorError
    );
  });
});
