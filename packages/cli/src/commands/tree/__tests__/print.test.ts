import { renderJson } from '../print/json.js';
import { renderMermaid } from '../print/mermaid.js';
import { renderStylish } from '../print/stylish.js';
import type { DependencyGraph } from '../types.js';

const graph: DependencyGraph = {
  roots: ['openapi.yaml'],
  nodes: [
    { id: 'components/Pet.yaml', resolved: true },
    { id: 'components/User.yaml', resolved: true },
    { id: 'components/missing.yaml', resolved: false },
    { id: 'https://example.com/shared.yaml', external: true, resolved: true },
    { id: 'openapi.yaml', root: true, resolved: true },
    { id: 'paths/pets.yaml', resolved: true },
    { id: 'paths/users.yaml', resolved: true },
  ],
  edges: [
    { from: 'components/User.yaml', to: 'components/Pet.yaml', refs: ['Pet.yaml'] },
    { from: 'components/User.yaml', to: 'components/missing.yaml', refs: ['missing.yaml'] },
    {
      from: 'components/User.yaml',
      to: 'https://example.com/shared.yaml',
      refs: ['https://example.com/shared.yaml#/Address'],
    },
    { from: 'openapi.yaml', to: 'paths/pets.yaml', refs: ['paths/pets.yaml'] },
    { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
    { from: 'paths/pets.yaml', to: 'components/Pet.yaml', refs: ['../components/Pet.yaml'] },
    { from: 'paths/users.yaml', to: 'components/User.yaml', refs: ['../components/User.yaml'] },
  ],
};

describe('renderStylish', () => {
  it('renders a tree with repeat, broken-ref, and external markers', () => {
    expect(renderStylish(graph)).toMatchInlineSnapshot(`
      "openapi.yaml
      ├── paths/pets.yaml
      │   └── components/Pet.yaml
      └── paths/users.yaml
          └── components/User.yaml
              ├── components/Pet.yaml ↺
              ├── components/missing.yaml ✗ not found
              └── https://example.com/shared.yaml (external)"
    `);
  });

  it('marks changed files and appends a summary in affected mode', () => {
    const affected: DependencyGraph = {
      roots: ['openapi.yaml'],
      nodes: [
        { id: 'components/Pet.yaml', resolved: true },
        { id: 'components/User.yaml', resolved: true },
        { id: 'openapi.yaml', root: true, resolved: true },
        { id: 'paths/pets.yaml', resolved: true },
        { id: 'paths/users.yaml', resolved: true },
      ],
      edges: [
        { from: 'components/User.yaml', to: 'components/Pet.yaml', refs: ['Pet.yaml'] },
        { from: 'openapi.yaml', to: 'paths/pets.yaml', refs: ['paths/pets.yaml'] },
        { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
        { from: 'paths/pets.yaml', to: 'components/Pet.yaml', refs: ['../components/Pet.yaml'] },
        { from: 'paths/users.yaml', to: 'components/User.yaml', refs: ['../components/User.yaml'] },
      ],
    };

    expect(
      renderStylish(affected, {
        changed: ['components/Pet.yaml'],
        summary: '5 of 7 files affected · affected roots: openapi.yaml',
      })
    ).toMatchInlineSnapshot(`
      "openapi.yaml
      ├── paths/pets.yaml
      │   └── components/Pet.yaml ← changed
      └── paths/users.yaml
          └── components/User.yaml
              └── components/Pet.yaml ↺ ← changed

      5 of 7 files affected · affected roots: openapi.yaml"
    `);
  });

  it('reports when nothing is affected', () => {
    expect(
      renderStylish({ roots: [], nodes: [], edges: [] }, { changed: [] })
    ).toMatchInlineSnapshot(`"No files affected."`);
  });

  it('renders one tree per root and re-expands shared files in each tree', () => {
    const multiRoot: DependencyGraph = {
      roots: ['a.yaml', 'b.yaml'],
      nodes: [
        { id: 'a.yaml', root: true, resolved: true },
        { id: 'b.yaml', root: true, resolved: true },
        { id: 'shared.yaml', resolved: true },
      ],
      edges: [
        { from: 'a.yaml', to: 'shared.yaml', refs: ['shared.yaml'] },
        { from: 'b.yaml', to: 'shared.yaml', refs: ['shared.yaml'] },
      ],
    };

    expect(renderStylish(multiRoot)).toMatchInlineSnapshot(`
      "a.yaml
      └── shared.yaml

      b.yaml
      └── shared.yaml"
    `);
  });
});

describe('renderJson', () => {
  it('serializes the graph model as-is', () => {
    const parsed = JSON.parse(renderJson(graph));
    expect(parsed.roots).toEqual(['openapi.yaml']);
    expect(parsed.nodes).toHaveLength(7);
    expect(parsed.edges).toHaveLength(7);
  });
});

describe('renderMermaid', () => {
  it('renders a flowchart with stable ids and a root class', () => {
    expect(renderMermaid(graph)).toMatchInlineSnapshot(`
      "flowchart LR
        n0["components/Pet.yaml"]
        n1["components/User.yaml"]
        n2["components/missing.yaml"]
        n3["https://example.com/shared.yaml"]
        n4["openapi.yaml"]:::root
        n5["paths/pets.yaml"]
        n6["paths/users.yaml"]
        n1 --> n0
        n1 --> n2
        n1 --> n3
        n4 --> n5
        n4 --> n6
        n5 --> n0
        n6 --> n1
        classDef root font-weight:bold"
    `);
  });
});
