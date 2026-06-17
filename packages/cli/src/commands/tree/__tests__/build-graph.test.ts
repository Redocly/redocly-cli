import { ResolveError, Source, type Document, type ResolvedRefMap } from '@redocly/openapi-core';
import * as path from 'node:path';

import { buildGraph } from '../build-graph.js';

const CWD = '/project';

function makeDocument(absoluteRef: string): Document {
  return { source: new Source(absoluteRef, ''), parsed: {} };
}

function resolvedEntry(targetAbsoluteRef: string, isRemote = true) {
  return {
    resolved: true as const,
    isRemote,
    node: {},
    nodePointer: '#/',
    document: makeDocument(targetAbsoluteRef),
  };
}

const resolveRef = (base: string, uri: string) => path.resolve(path.dirname(base), uri);

describe('buildGraph', () => {
  it('builds nodes and edges from cross-file refs, transitively', () => {
    const refMap: ResolvedRefMap = new Map([
      ['/project/openapi.yaml::paths/users.yaml', resolvedEntry('/project/paths/users.yaml')],
      [
        '/project/paths/users.yaml::../components/User.yaml',
        resolvedEntry('/project/components/User.yaml'),
      ],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/openapi.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph).toEqual({
      roots: ['openapi.yaml'],
      nodes: [
        { id: 'components/User.yaml', resolved: true },
        { id: 'openapi.yaml', root: true, resolved: true },
        { id: 'paths/users.yaml', resolved: true },
      ],
      edges: [
        { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
        {
          from: 'paths/users.yaml',
          to: 'components/User.yaml',
          refs: ['../components/User.yaml'],
        },
      ],
    });
  });

  it('skips same-file refs', () => {
    const refMap: ResolvedRefMap = new Map([
      [
        '/project/openapi.yaml::#/components/schemas/Pet',
        { ...resolvedEntry('/project/openapi.yaml'), isRemote: false },
      ],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/openapi.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph.nodes).toEqual([{ id: 'openapi.yaml', root: true, resolved: true }]);
    expect(graph.edges).toEqual([]);
  });

  it('dedupes edges across refs and across roots, collecting distinct sorted refs', () => {
    const entryY = resolvedEntry('/project/b.yaml');
    const entryX = resolvedEntry('/project/b.yaml');
    const refMapA: ResolvedRefMap = new Map([
      ['/project/a.yaml::b.yaml#/Y', entryY],
      ['/project/a.yaml::b.yaml#/X', entryX],
    ]);
    const refMapB: ResolvedRefMap = new Map([['/project/a.yaml::b.yaml#/X', entryX]]);

    const graph = buildGraph(
      [
        { rootDocument: makeDocument('/project/a.yaml'), refMap: refMapA },
        { rootDocument: makeDocument('/project/b.yaml'), refMap: refMapB },
      ],
      { cwd: CWD, resolveRef }
    );

    expect(graph.roots).toEqual(['a.yaml', 'b.yaml']);
    expect(graph.edges).toEqual([
      { from: 'a.yaml', to: 'b.yaml', refs: ['b.yaml#/X', 'b.yaml#/Y'] },
    ]);
    expect(graph.nodes).toEqual([
      { id: 'a.yaml', root: true, resolved: true },
      { id: 'b.yaml', root: true, resolved: true },
    ]);
  });

  it('represents unresolved refs as resolved:false nodes with an edge', () => {
    const refMap: ResolvedRefMap = new Map([
      [
        '/project/openapi.yaml::./missing.yaml#/Pet',
        {
          resolved: false as const,
          isRemote: true,
          document: undefined,
          error: new ResolveError(new Error('ENOENT')),
        },
      ],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/openapi.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph.nodes).toEqual([
      { id: 'missing.yaml', resolved: false },
      { id: 'openapi.yaml', root: true, resolved: true },
    ]);
    expect(graph.edges).toEqual([
      { from: 'openapi.yaml', to: 'missing.yaml', refs: ['./missing.yaml#/Pet'] },
    ]);
  });

  it('keeps http(s) targets as external URL nodes', () => {
    const refMap: ResolvedRefMap = new Map([
      [
        '/project/openapi.yaml::https://example.com/shared.yaml#/S',
        resolvedEntry('https://example.com/shared.yaml'),
      ],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/openapi.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph.nodes).toEqual([
      { id: 'https://example.com/shared.yaml', external: true, resolved: true },
      { id: 'openapi.yaml', root: true, resolved: true },
    ]);
  });

  it('handles cyclic file references', () => {
    const refMap: ResolvedRefMap = new Map([
      ['/project/a.yaml::b.yaml', resolvedEntry('/project/b.yaml')],
      ['/project/b.yaml::a.yaml', resolvedEntry('/project/a.yaml')],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/a.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph.edges).toEqual([
      { from: 'a.yaml', to: 'b.yaml', refs: ['b.yaml'] },
      { from: 'b.yaml', to: 'a.yaml', refs: ['a.yaml'] },
    ]);
  });
});
