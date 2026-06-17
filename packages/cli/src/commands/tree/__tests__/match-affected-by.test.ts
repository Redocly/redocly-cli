import { matchAffectedBy } from '../match-affected-by.js';
import type { DependencyGraph } from '../types.js';

const CWD = '/project';

const graph: DependencyGraph = {
  roots: ['openapi.yaml'],
  nodes: [
    { id: '/pets', resolved: true, kind: 'path', file: 'openapi.yaml' },
    { id: 'GET /pets', resolved: true, kind: 'operation', file: 'openapi.yaml' },
    {
      id: 'common.yaml#/components/schemas/Pet',
      resolved: true,
      kind: 'component',
      file: 'common.yaml',
    },
    { id: 'openapi.yaml', root: true, resolved: true, kind: 'root', file: 'openapi.yaml' },
    { id: 'parameters/Pet', resolved: true, kind: 'component', file: 'openapi.yaml' },
    { id: 'schemas/Address', resolved: true, kind: 'component', file: 'openapi.yaml' },
    { id: 'schemas/Pet', resolved: true, kind: 'component', file: 'openapi.yaml' },
  ],
  edges: [],
};

const ROOT_ID = 'openapi.yaml';

describe('matchAffectedBy', () => {
  it('case 1: exact node id match', () => {
    expect(matchAffectedBy(graph, ['schemas/Address'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['schemas/Address'],
      markerIds: ['schemas/Address'],
      notes: [],
      warnings: [],
    });
  });

  it('case 2: exact id wins over bare-name logic — no ambiguity note', () => {
    // 'schemas/Pet' is an exact id match; even though 'Pet' (bare) would match multiple,
    // the exact match short-circuits and no ambiguity note is emitted.
    expect(matchAffectedBy(graph, ['schemas/Pet'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['schemas/Pet'],
      markerIds: ['schemas/Pet'],
      notes: [],
      warnings: [],
    });
  });

  it('case 3a: pointer form — component pointer', () => {
    expect(
      matchAffectedBy(graph, ['#/components/schemas/Pet'], { cwd: CWD, rootId: ROOT_ID })
    ).toEqual({
      changedIds: ['schemas/Pet'],
      markerIds: ['schemas/Pet'],
      notes: [],
      warnings: [],
    });
  });

  it('case 3b: pointer form — operation pointer', () => {
    expect(matchAffectedBy(graph, ['#/paths/~1pets/get'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['GET /pets'],
      markerIds: ['GET /pets'],
      notes: [],
      warnings: [],
    });
  });

  it('case 4: a file path matches every node defined in that file', () => {
    expect(matchAffectedBy(graph, ['common.yaml'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['common.yaml#/components/schemas/Pet'],
      markerIds: ['common.yaml#/components/schemas/Pet'],
      notes: [],
      warnings: [],
    });
  });

  it('case 5: root file — changedIds gets all ids, markerIds only rootId, note emitted', () => {
    const result = matchAffectedBy(graph, ['openapi.yaml'], { cwd: CWD, rootId: ROOT_ID });

    const allIds = graph.nodes.map((n) => n.id);
    expect(result.changedIds).toEqual(allIds);
    expect(result.markerIds).toEqual(['openapi.yaml']);
    expect(result.warnings).toEqual([]);
    expect(result.notes).toEqual([
      'openapi.yaml is the root document — the whole tree is affected.',
    ]);
  });

  it('case 6a: bare component name matching multiple — includes all + ambiguity note', () => {
    const result = matchAffectedBy(graph, ['Pet'], { cwd: CWD, rootId: ROOT_ID });

    // All three Pet components in the graph
    expect(result.changedIds).toEqual([
      'common.yaml#/components/schemas/Pet',
      'parameters/Pet',
      'schemas/Pet',
    ]);
    expect(result.markerIds).toEqual([
      'common.yaml#/components/schemas/Pet',
      'parameters/Pet',
      'schemas/Pet',
    ]);
    expect(result.warnings).toEqual([]);
    expect(result.notes).toEqual([
      '"Pet" matches multiple components: common.yaml#/components/schemas/Pet, parameters/Pet, schemas/Pet — including all of them.',
    ]);
  });

  it('case 6b: bare component name matching exactly one — no note', () => {
    expect(matchAffectedBy(graph, ['Address'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['schemas/Address'],
      markerIds: ['schemas/Address'],
      notes: [],
      warnings: [],
    });
  });

  it('case 7: unknown input — empty arrays + warning', () => {
    expect(matchAffectedBy(graph, ['Ghost'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: [],
      markerIds: [],
      notes: [],
      warnings: ['Ghost does not match any path, operation, or component of openapi.yaml.'],
    });
  });

  it('case 7b: mixed call — known input still matched, warning for unknown', () => {
    const result = matchAffectedBy(graph, ['Ghost', 'schemas/Address'], {
      cwd: CWD,
      rootId: ROOT_ID,
    });

    expect(result.changedIds).toEqual(['schemas/Address']);
    expect(result.markerIds).toEqual(['schemas/Address']);
    expect(result.warnings).toEqual([
      'Ghost does not match any path, operation, or component of openapi.yaml.',
    ]);
    expect(result.notes).toEqual([]);
  });

  it('case 8: dedup — Pet + schemas/Pet → schemas/Pet appears once in changedIds', () => {
    const result = matchAffectedBy(graph, ['Pet', 'schemas/Pet'], { cwd: CWD, rootId: ROOT_ID });

    // Pet (bare) matches 3 ids; schemas/Pet is already among them → deduped
    expect(result.changedIds).toEqual([
      'common.yaml#/components/schemas/Pet',
      'parameters/Pet',
      'schemas/Pet',
    ]);
    expect(result.markerIds).toEqual([
      'common.yaml#/components/schemas/Pet',
      'parameters/Pet',
      'schemas/Pet',
    ]);
  });

  it('warns for a pointer that maps to no node instead of bare-name matching', () => {
    expect(
      matchAffectedBy(graph, ['#/components/schemas/Missing'], { cwd: CWD, rootId: 'openapi.yaml' })
    ).toEqual({
      changedIds: [],
      markerIds: [],
      notes: [],
      warnings: [
        '#/components/schemas/Missing does not match any path, operation, or component of openapi.yaml.',
      ],
    });
  });

  it('does not bare-match non-component nodes', () => {
    expect(matchAffectedBy(graph, ['pets'], { cwd: CWD, rootId: 'openapi.yaml' })).toEqual({
      changedIds: [],
      markerIds: [],
      notes: [],
      warnings: ['pets does not match any path, operation, or component of openapi.yaml.'],
    });
  });
});
