import { filterAffected, filterOperations, limitGraphLevel } from '../filter-affected.js';
import type { DependencyGraph } from '../types.js';

const graph: DependencyGraph = {
  roots: ['openapi.yaml'],
  nodes: [
    { id: 'components/Address.yaml', resolved: true },
    { id: 'components/User.yaml', resolved: true },
    { id: 'openapi.yaml', root: true, resolved: true },
    { id: 'paths/pets.yaml', resolved: true },
    { id: 'paths/users.yaml', resolved: true },
  ],
  edges: [
    { from: 'components/User.yaml', to: 'components/Address.yaml', refs: ['Address.yaml'] },
    { from: 'openapi.yaml', to: 'paths/pets.yaml', refs: ['paths/pets.yaml'] },
    { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
    { from: 'paths/users.yaml', to: 'components/User.yaml', refs: ['../components/User.yaml'] },
  ],
};

describe('filterAffected', () => {
  it('returns the changed file plus all transitive dependents up to the root', () => {
    const affected = filterAffected(graph, ['components/Address.yaml']);

    expect(affected.nodes.map((node) => node.id)).toEqual([
      'components/Address.yaml',
      'components/User.yaml',
      'openapi.yaml',
      'paths/users.yaml',
    ]);
    expect(affected.roots).toEqual(['openapi.yaml']);
  });

  it('excludes edges leading to untouched branches', () => {
    const affected = filterAffected(graph, ['components/Address.yaml']);

    expect(affected.edges).toEqual([
      { from: 'components/User.yaml', to: 'components/Address.yaml', refs: ['Address.yaml'] },
      { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
      { from: 'paths/users.yaml', to: 'components/User.yaml', refs: ['../components/User.yaml'] },
    ]);
  });

  it('returns an empty graph when no changed ids are known', () => {
    expect(filterAffected(graph, [])).toEqual({ roots: [], nodes: [], edges: [] });
  });

  it('terminates on cyclic graphs and returns the full cycle', () => {
    const cyclic: DependencyGraph = {
      roots: ['a.yaml'],
      nodes: [
        { id: 'a.yaml', root: true, resolved: true },
        { id: 'b.yaml', resolved: true },
      ],
      edges: [
        { from: 'a.yaml', to: 'b.yaml', refs: ['b.yaml'] },
        { from: 'b.yaml', to: 'a.yaml', refs: ['a.yaml'] },
      ],
    };

    expect(filterAffected(cyclic, ['b.yaml'])).toEqual(cyclic);
  });

  it('ignores changed ids that are not nodes of the graph', () => {
    expect(filterAffected(graph, ['ghost.yaml'])).toEqual({ roots: [], nodes: [], edges: [] });
  });
});

describe('filterAffected — container seeds include their subtree', () => {
  const structure: DependencyGraph = {
    roots: ['openapi.yaml'],
    nodes: [
      { id: 'openapi.yaml', root: true, resolved: true, kind: 'root' },
      { id: '/pets', resolved: true, kind: 'path' },
      { id: 'GET /pets', resolved: true, kind: 'operation' },
      { id: 'schemas/Pet', resolved: true, kind: 'component' },
      { id: 'schemas/Tag', resolved: true, kind: 'component' },
      { id: '/other', resolved: true, kind: 'path' },
      { id: 'GET /other', resolved: true, kind: 'operation' },
    ],
    edges: [
      { from: 'openapi.yaml', to: '/pets', refs: [] },
      { from: '/pets', to: 'GET /pets', refs: [] },
      { from: 'GET /pets', to: 'schemas/Pet', refs: ['#/components/schemas/Pet'] },
      { from: 'schemas/Pet', to: 'schemas/Tag', refs: ['#/components/schemas/Tag'] },
      { from: 'openapi.yaml', to: '/other', refs: [] },
      { from: '/other', to: 'GET /other', refs: [] },
    ],
  };

  it('a path seed includes its operations and component chain (forward) plus the root (reverse)', () => {
    const affected = filterAffected(structure, ['/pets']);
    expect(affected.nodes.map((node) => node.id).sort()).toEqual([
      '/pets',
      'GET /pets',
      'openapi.yaml',
      'schemas/Pet',
      'schemas/Tag',
    ]);
  });

  it('a root seed yields the whole tree', () => {
    const affected = filterAffected(structure, ['openapi.yaml']);
    expect(affected.nodes.length).toBe(structure.nodes.length);
  });

  it('a component seed stays reverse-only — its users, not its own dependencies', () => {
    const affected = filterAffected(structure, ['schemas/Pet']);
    expect(affected.nodes.map((node) => node.id).sort()).toEqual([
      '/pets',
      'GET /pets',
      'openapi.yaml',
      'schemas/Pet',
    ]);
  });
});

describe('filterOperations', () => {
  const structure: DependencyGraph = {
    roots: ['openapi.yaml'],
    nodes: [
      { id: 'openapi.yaml', root: true, resolved: true, kind: 'root' },
      { id: '/pets', resolved: true, kind: 'path' },
      { id: 'GET /pets', resolved: true, kind: 'operation' },
      { id: 'parameters/PetId', resolved: true, kind: 'component' },
      { id: 'schemas/Pet', resolved: true, kind: 'component' },
      { id: 'webhooks/newPet', resolved: true, kind: 'component' },
    ],
    edges: [
      { from: 'openapi.yaml', to: '/pets', refs: [] },
      { from: 'openapi.yaml', to: 'webhooks/newPet', refs: [] },
      { from: '/pets', to: 'GET /pets', refs: [] },
      { from: '/pets', to: 'parameters/PetId', refs: ['#/components/parameters/PetId'] },
      { from: 'GET /pets', to: 'schemas/Pet', refs: ['#/components/schemas/Pet'] },
      { from: 'webhooks/newPet', to: 'schemas/Pet', refs: ['#/components/schemas/Pet'] },
    ],
  };

  it('keeps paths, operations, and webhook entries — no components', () => {
    const surface = filterOperations(structure);

    expect(surface.nodes.map((node) => node.id)).toEqual([
      'openapi.yaml',
      '/pets',
      'GET /pets',
      'webhooks/newPet',
    ]);
    expect(surface.edges).toEqual([
      { from: 'openapi.yaml', to: '/pets', refs: [] },
      { from: 'openapi.yaml', to: 'webhooks/newPet', refs: [] },
      { from: '/pets', to: 'GET /pets', refs: [] },
    ]);
  });
});

describe('limitGraphLevel', () => {
  const structure: DependencyGraph = {
    roots: ['openapi.yaml'],
    nodes: [
      { id: 'openapi.yaml', root: true, resolved: true, kind: 'root' },
      { id: '/pets', resolved: true, kind: 'path' },
      { id: 'GET /pets', resolved: true, kind: 'operation' },
      { id: 'parameters/PetId', resolved: true, kind: 'component' },
      { id: 'schemas/Pet', resolved: true, kind: 'component' },
    ],
    edges: [
      { from: 'openapi.yaml', to: '/pets', refs: [] },
      { from: '/pets', to: 'GET /pets', refs: [] },
      { from: '/pets', to: 'parameters/PetId', refs: ['#/components/parameters/PetId'] },
      { from: 'GET /pets', to: 'parameters/PetId', refs: ['#/components/parameters/PetId'] },
      { from: 'GET /pets', to: 'schemas/Pet', refs: ['#/components/schemas/Pet'] },
    ],
  };

  it('keeps only nodes within maxLevel steps from the root', () => {
    const limited = limitGraphLevel(structure, 1);

    expect(limited.nodes.map((node) => node.id)).toEqual(['openapi.yaml', '/pets']);
    expect(limited.edges).toEqual([{ from: 'openapi.yaml', to: '/pets', refs: [] }]);
  });

  it('keeps a fan-in node reachable within the level and every edge between kept nodes', () => {
    const limited = limitGraphLevel(structure, 2);

    // parameters/PetId is 2 steps away via /pets, so it stays — including its edge from GET /pets.
    expect(limited.nodes.map((node) => node.id).sort()).toEqual([
      '/pets',
      'GET /pets',
      'openapi.yaml',
      'parameters/PetId',
    ]);
    expect(limited.edges).toContainEqual({
      from: 'GET /pets',
      to: 'parameters/PetId',
      refs: ['#/components/parameters/PetId'],
    });
    expect(limited.nodes.map((node) => node.id)).not.toContain('schemas/Pet');
  });
});
