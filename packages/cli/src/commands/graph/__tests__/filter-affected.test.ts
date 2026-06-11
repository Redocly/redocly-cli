import { filterAffected } from '../filter-affected.js';
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
