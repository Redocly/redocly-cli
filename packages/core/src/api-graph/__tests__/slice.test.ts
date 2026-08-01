import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { BaseResolver, type Document } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { analyzeApi, type ApiAnalysis } from '../build-graph.js';
import { buildApiIndex, type ApiIndex } from '../build-index.js';
import { buildNodeEnvelope, findIndexNode, hasIndexLocation } from '../slice.js';

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
