import { renderJson } from '../print/json.js';
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
  it('renders a tree with broken-ref and external markers', () => {
    expect(renderStylish(graph)).toMatchInlineSnapshot(`
      "openapi.yaml
      ├── paths/pets.yaml
      │   └── components/Pet.yaml
      └── paths/users.yaml
          └── components/User.yaml
              ├── components/Pet.yaml
              ├── components/missing.yaml ❌
              └── https://example.com/shared.yaml 🔗"
    `);
  });

  it('appends a summary in affected mode', () => {
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
        summary: '5 of 7 files affected · affected roots: openapi.yaml',
      })
    ).toMatchInlineSnapshot(`
      "openapi.yaml
      ├── paths/pets.yaml
      │   └── components/Pet.yaml
      └── paths/users.yaml
          └── components/User.yaml
              └── components/Pet.yaml

      5 of 7 files affected · affected roots: openapi.yaml"
    `);
  });

  it('reports when nothing is affected', () => {
    expect(renderStylish({ roots: [], nodes: [], edges: [] }, {})).toMatchInlineSnapshot(
      `"No files affected."`
    );
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

  it('marks a true cycle with 🔁 and stops expanding', () => {
    const cyclic: DependencyGraph = {
      roots: ['root.yaml'],
      nodes: [
        { id: 'root.yaml', root: true, resolved: true },
        { id: 'A.yaml', resolved: true },
        { id: 'B.yaml', resolved: true },
      ],
      edges: [
        { from: 'root.yaml', to: 'A.yaml', refs: ['A.yaml'] },
        { from: 'A.yaml', to: 'B.yaml', refs: ['B.yaml'] },
        { from: 'B.yaml', to: 'A.yaml', refs: ['A.yaml'] },
      ],
    };

    expect(renderStylish(cyclic)).toMatchInlineSnapshot(`
      "root.yaml
      └── A.yaml
          └── B.yaml
              └── A.yaml 🔁"
    `);
  });

  it('re-expands a fan-in dependency (shared, non-cyclic) under every parent', () => {
    const fanIn: DependencyGraph = {
      roots: ['root.yaml'],
      nodes: [
        { id: 'root.yaml', root: true, resolved: true },
        { id: 'P1.yaml', resolved: true },
        { id: 'P2.yaml', resolved: true },
        { id: 'Response.yaml', resolved: true },
        { id: 'Error.yaml', resolved: true },
      ],
      edges: [
        { from: 'root.yaml', to: 'P1.yaml', refs: ['P1.yaml'] },
        { from: 'root.yaml', to: 'P2.yaml', refs: ['P2.yaml'] },
        { from: 'P1.yaml', to: 'Response.yaml', refs: ['Response.yaml'] },
        { from: 'P2.yaml', to: 'Response.yaml', refs: ['Response.yaml'] },
        { from: 'Response.yaml', to: 'Error.yaml', refs: ['Error.yaml'] },
      ],
    };

    expect(renderStylish(fanIn)).toMatchInlineSnapshot(`
      "root.yaml
      ├── P1.yaml
      │   └── Response.yaml
      │       └── Error.yaml
      └── P2.yaml
          └── Response.yaml
              └── Error.yaml"
    `);
  });

  it('renders operations as the method only under their path', () => {
    const structure: DependencyGraph = {
      roots: ['openapi.yaml'],
      nodes: [
        { id: 'openapi.yaml', root: true, resolved: true, kind: 'root' },
        { id: '/pets', resolved: true, kind: 'path' },
        { id: 'GET /pets', resolved: true, kind: 'operation' },
        { id: 'POST /pets', resolved: true, kind: 'operation' },
      ],
      edges: [
        { from: 'openapi.yaml', to: '/pets', refs: [] },
        { from: '/pets', to: 'GET /pets', refs: [] },
        { from: '/pets', to: 'POST /pets', refs: [] },
      ],
    };

    expect(renderStylish(structure)).toMatchInlineSnapshot(`
      "openapi.yaml
      └── /pets
          ├── GET
          └── POST"
    `);
  });
});

describe('renderJson', () => {
  it('emits a nodes/links graph (D3 shape) without roots/edges keys', () => {
    const json = JSON.parse(renderJson(graph));
    expect(json.nodes).toEqual(graph.nodes);
    expect(json.links).toContainEqual({
      source: 'openapi.yaml',
      target: 'paths/pets.yaml',
      refs: ['paths/pets.yaml'],
    });
    expect(json).not.toHaveProperty('roots');
    expect(json).not.toHaveProperty('edges');
  });
});
