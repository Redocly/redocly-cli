import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiAnalysis } from '../build-graph.js';
import { buildApiIndex, type ApiIndex } from '../build-index.js';
import {
  appendDepsClosure,
  buildNodeEnvelope,
  collectNodeRefs,
  findIndexNode,
  hasIndexLocation,
} from '../slice.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(__dirname, 'fixtures', 'split');

async function analyzed(): Promise<{ analysis: ApiAnalysis; index: ApiIndex }> {
  const resolver = new BaseResolver();
  const rootDocument = (await resolver.resolveDocument(
    null,
    join(FIXTURE_ROOT, 'openapi.yaml'),
    true
  )) as Document;
  const specVersion = detectSpec(rootDocument.parsed);
  const types = normalizeTypes(getTypes(specVersion), {});
  const analysis = await analyzeApi({
    rootDocument,
    specVersion,
    types,
    externalRefResolver: resolver,
    cwd: FIXTURE_ROOT,
    resolveRef: (base, uri) => join(dirname(base), uri),
  });
  const index = buildApiIndex(analysis, { specVersion, cwd: FIXTURE_ROOT, groupBy: 'tags' });
  return { analysis, index };
}

describe('findIndexNode', () => {
  it('finds nodes by semantic id and by file#pointer', async () => {
    const { index } = await analyzed();

    const byId = findIndexNode(index.structure, 'POST /tickets')!;
    expect(byId.title).toBe('POST /tickets — Buy museum tickets');

    const byPointer = findIndexNode(index.structure, 'paths/tickets.yaml#/post');
    expect(byPointer).toBe(byId);

    expect(findIndexNode(index.structure, 'DELETE /nowhere')).toBeUndefined();
  });
});

describe('buildNodeEnvelope', () => {
  it('slices raw source lines and resolves outgoing refs', async () => {
    const { analysis, index } = await analyzed();

    const indexNode = findIndexNode(index.structure, 'POST /tickets')!;
    if (!hasIndexLocation(indexNode)) throw new Error('operation node must carry a location');

    const envelope = buildNodeEnvelope({ indexNode, analysis, cwd: FIXTURE_ROOT });

    expect(envelope.id).toBe('POST /tickets');
    expect(envelope.file).toBe('paths/tickets.yaml');
    expect(envelope.content).toContain('operationId: buyTickets');
    expect(envelope.content).not.toContain('get:');
    expect(envelope.refs).toEqual([
      {
        ref: '../components/schemas/Ticket.yaml',
        resolved: true,
        file: 'components/schemas/Ticket.yaml',
        pointer: '#/',
        start_line: 1,
        end_line: 4,
      },
    ]);
  });

  it('returns the whole file for a whole-file component node', async () => {
    const { analysis, index } = await analyzed();

    const indexNode = findIndexNode(index.structure, 'schemas/Ticket')!;
    if (!hasIndexLocation(indexNode)) throw new Error('component node must carry a location');

    const envelope = buildNodeEnvelope({ indexNode, analysis, cwd: FIXTURE_ROOT });
    expect(envelope.file).toBe('components/schemas/Ticket.yaml');
    expect(envelope.start_line).toBe(1);
    expect(envelope.content).toContain('type: object');
  });
});

describe('buildNodeEnvelope outside cwd', () => {
  it('resolves nodes whose file lives outside the working directory', async () => {
    const outsideCwd = join(__dirname, 'fixtures', 'outside', 'sub');
    const resolver = new BaseResolver();
    const rootDocument = (await resolver.resolveDocument(
      null,
      join(outsideCwd, 'openapi.yaml'),
      true
    )) as Document;
    const specVersion = detectSpec(rootDocument.parsed);
    const types = normalizeTypes(getTypes(specVersion), {});
    const analysis = await analyzeApi({
      rootDocument,
      specVersion,
      types,
      externalRefResolver: resolver,
      cwd: outsideCwd,
      resolveRef: (base, uri) => join(dirname(base), uri),
    });
    const index = buildApiIndex(analysis, { specVersion, cwd: outsideCwd, groupBy: 'tags' });

    const errorNode = findIndexNode(index.structure, 'schemas/Error')!;
    expect(errorNode.file).toBe('../common/Error.yaml');
    if (!hasIndexLocation(errorNode)) throw new Error('component node must carry a location');

    const envelope = buildNodeEnvelope({ indexNode: errorNode, analysis, cwd: outsideCwd });
    expect(envelope.file).toBe('../common/Error.yaml');
    expect(envelope.content).toContain('message');
  });
});

describe('appendDepsClosure', () => {
  it('appends the transitive dependency closure in BFS order', async () => {
    const { analysis, index } = await analyzed();

    const indexNode = findIndexNode(index.structure, 'POST /tickets')!;
    if (!hasIndexLocation(indexNode)) throw new Error('operation node must carry a location');
    const base = buildNodeEnvelope({ indexNode, analysis, cwd: FIXTURE_ROOT });

    const withDeps = appendDepsClosure({
      envelope: base,
      indexNode,
      analysis,
      index,
      cwd: FIXTURE_ROOT,
    });

    expect(withDeps.deps!.map((dep) => dep.file)).toEqual([
      'components/schemas/Ticket.yaml',
      'components/schemas/TicketId.yaml',
    ]);
    expect(withDeps.deps![0].content).toContain('ticketId');
    expect(withDeps.truncated).toBeUndefined();
  });

  it('truncates the closure at the byte cap and says so', async () => {
    const { analysis, index } = await analyzed();

    const indexNode = findIndexNode(index.structure, 'POST /tickets')!;
    if (!hasIndexLocation(indexNode)) throw new Error('operation node must carry a location');
    const base = buildNodeEnvelope({ indexNode, analysis, cwd: FIXTURE_ROOT });

    const capped = appendDepsClosure({
      envelope: base,
      indexNode,
      analysis,
      index,
      cwd: FIXTURE_ROOT,
      capBytes: 10,
    });

    expect(capped.deps!.length).toBeLessThan(2);
    expect(capped.truncated).toBe(true);
  });

  it('returns an empty closure for grouping nodes instead of walking the graph', async () => {
    const { analysis, index } = await analyzed();

    const operationsSection = findIndexNode(index.structure, 'Operations')!;
    if (!hasIndexLocation(operationsSection)) throw new Error('Operations carries paths location');
    const base = buildNodeEnvelope({ indexNode: operationsSection, analysis, cwd: FIXTURE_ROOT });

    const withDeps = appendDepsClosure({
      envelope: base,
      indexNode: operationsSection,
      analysis,
      index,
      cwd: FIXTURE_ROOT,
    });

    expect(withDeps.deps).toEqual([]);
    expect(withDeps.truncated).toBeUndefined();
  });
});

describe('collectNodeRefs', () => {
  it('collects refs with resolved target line ranges', async () => {
    const { analysis } = await analyzed();
    const refs = collectNodeRefs({
      file: 'paths/tickets.yaml',
      pointer: '#/post',
      analysis,
      cwd: FIXTURE_ROOT,
    });
    const ticketRef = refs.find((ref) => ref.file === 'components/schemas/Ticket.yaml');
    expect(ticketRef?.resolved).toBe(true);
    expect(ticketRef?.start_line).toBeGreaterThanOrEqual(1);
    expect(ticketRef?.end_line).toBeGreaterThanOrEqual(ticketRef!.start_line!);
  });
});
