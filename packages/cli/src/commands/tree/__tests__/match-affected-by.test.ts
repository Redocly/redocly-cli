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
      notes: [],
      warnings: [],
    });
  });

  it('matches a shorthand id written with a leading ./', () => {
    expect(matchAffectedBy(graph, ['./schemas/Address'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['schemas/Address'],
      notes: [],
      warnings: [],
    });
  });

  it('case 2: exact id wins over bare-name logic — no ambiguity note', () => {
    expect(matchAffectedBy(graph, ['schemas/Pet'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['schemas/Pet'],
      notes: [],
      warnings: [],
    });
  });

  it('case 3a: pointer form — component pointer', () => {
    expect(
      matchAffectedBy(graph, ['#/components/schemas/Pet'], { cwd: CWD, rootId: ROOT_ID })
    ).toEqual({
      changedIds: ['schemas/Pet'],
      notes: [],
      warnings: [],
    });
  });

  it('case 3b: pointer form — operation pointer', () => {
    expect(matchAffectedBy(graph, ['#/paths/~1pets/get'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['GET /pets'],
      notes: [],
      warnings: [],
    });
  });

  it('case 4: a file path matches every node defined in that file', () => {
    expect(matchAffectedBy(graph, ['common.yaml'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['common.yaml#/components/schemas/Pet'],
      notes: [],
      warnings: [],
    });
  });

  it('case 5: root file — changedIds gets just the root id (subtree expanded downstream), note emitted', () => {
    const result = matchAffectedBy(graph, ['openapi.yaml'], { cwd: CWD, rootId: ROOT_ID });

    expect(result.changedIds).toEqual(['openapi.yaml']);
    expect(result.warnings).toEqual([]);
    expect(result.notes).toEqual([
      'openapi.yaml is the root document — the whole tree is affected.',
    ]);
  });

  it('case 5b: root pointer `#/` behaves like the root file', () => {
    const result = matchAffectedBy(graph, ['#/'], { cwd: CWD, rootId: ROOT_ID });

    expect(result.changedIds).toEqual(['openapi.yaml']);
    expect(result.notes).toEqual([
      'openapi.yaml is the root document — the whole tree is affected.',
    ]);
  });

  it('case 6a: bare component name matching multiple — includes all + ambiguity note', () => {
    const result = matchAffectedBy(graph, ['Pet'], { cwd: CWD, rootId: ROOT_ID });

    expect(result.changedIds).toEqual([
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
      notes: [],
      warnings: [],
    });
  });

  it('expands a * wildcard against all node ids', () => {
    expect(matchAffectedBy(graph, ['schemas/*'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['schemas/Address', 'schemas/Pet'],
      notes: [],
      warnings: [],
    });
  });

  it('anchors wildcards — a pattern does not match inside longer ids', () => {
    expect(matchAffectedBy(graph, ['schemas/Pe*'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      // Must not match common.yaml#/components/schemas/Pet.
      changedIds: ['schemas/Pet'],
      notes: [],
      warnings: [],
    });
  });

  it('matches paths with a wildcard', () => {
    expect(matchAffectedBy(graph, ['/pe*'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: ['/pets'],
      notes: [],
      warnings: [],
    });
  });

  it('warns for a wildcard that matches nothing', () => {
    expect(matchAffectedBy(graph, ['schemas/Ghost*'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: [],
      notes: [],
      warnings: [
        'schemas/Ghost* does not match any path, operation, or component of openapi.yaml.',
      ],
    });
  });

  it('case 7: unknown input — empty arrays + warning', () => {
    expect(matchAffectedBy(graph, ['Ghost'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: [],
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
    expect(result.warnings).toEqual([
      'Ghost does not match any path, operation, or component of openapi.yaml.',
    ]);
    expect(result.notes).toEqual([]);
  });

  it('case 8: dedup — Pet + schemas/Pet → schemas/Pet appears once in changedIds', () => {
    const result = matchAffectedBy(graph, ['Pet', 'schemas/Pet'], { cwd: CWD, rootId: ROOT_ID });

    expect(result.changedIds).toEqual([
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
      notes: [],
      warnings: [
        '#/components/schemas/Missing does not match any path, operation, or component of openapi.yaml.',
      ],
    });
  });

  it('does not bare-match non-component nodes', () => {
    expect(matchAffectedBy(graph, ['pets'], { cwd: CWD, rootId: 'openapi.yaml' })).toEqual({
      changedIds: [],
      notes: [],
      warnings: ['pets does not match any path, operation, or component of openapi.yaml.'],
    });
  });

  it('points an unmatched file path to --files (structure mode is bundled)', () => {
    expect(matchAffectedBy(graph, ['paths/pets.yaml'], { cwd: CWD, rootId: ROOT_ID })).toEqual({
      changedIds: [],
      notes: [],
      warnings: [
        'paths/pets.yaml does not match any path, operation, or component of openapi.yaml. For file-level analysis, use `--files`.',
      ],
    });
  });
});
