import { alignRenamedPaths } from '../align-paths.js';
import type { NodeEntry } from '../types.js';

function entry(pointer: string, typeName: string, parentPointer: string | null): NodeEntry {
  return { pointer, realPointer: pointer, parentPointer, typeName, scalars: {}, refs: {}, raw: {} };
}

function side(template: string, paramName: string): Map<string, NodeEntry> {
  const escaped = template.replace(/\//g, '~1');
  const p = `#/paths/${escaped}`;
  return new Map([
    [p, entry(p, 'PathItem', '#/paths')],
    [`${p}/get`, entry(`${p}/get`, 'Operation', p)],
    [
      `${p}/get/parameters/{path:${paramName}}`,
      entry(`${p}/get/parameters/{path:${paramName}}`, 'Parameter', `${p}/get/parameters`),
    ],
  ]);
}

describe('alignRenamedPaths', () => {
  it('aliases an unambiguous renamed path into the base pointer space', () => {
    const base = side('/pet/{id}', 'id');
    const revision = side('/pet/{petId}', 'petId');

    const { revision: aligned, renames } = alignRenamedPaths(base, revision);

    // the fixture builds realPointer === pointer, so real pointers keep each
    // side's own template
    expect(renames).toEqual([
      {
        baseTemplate: '/pet/{id}',
        revisionTemplate: '/pet/{petId}',
        basePointer: '#/paths/~1pet~1{id}',
        revisionPointer: '#/paths/~1pet~1{petId}',
        baseRealPointer: '#/paths/~1pet~1{id}',
        revisionRealPointer: '#/paths/~1pet~1{petId}',
      },
    ]);
    expect(aligned.has('#/paths/~1pet~1{id}')).toBe(true);
    expect(aligned.has('#/paths/~1pet~1{id}/get/parameters/{path:id}')).toBe(true);
    // real pointers keep the revision's original template — the rename stays visible
    expect(aligned.get('#/paths/~1pet~1{id}')!.realPointer).toBe('#/paths/~1pet~1{petId}');
  });

  it('leaves ambiguous matches alone', () => {
    const base = side('/a/{x}/b', 'x');
    const revision = new Map([...side('/a/{y}/b', 'y'), ...side('/a/{z}/b', 'z')]);

    const { revision: aligned, renames } = alignRenamedPaths(base, revision);

    expect(renames).toEqual([]);
    expect(aligned).toBe(revision); // untouched
  });

  it('is a no-op when templates match exactly', () => {
    const base = side('/pet/{id}', 'id');
    const revision = side('/pet/{id}', 'id');

    const { renames } = alignRenamedPaths(base, revision);
    expect(renames).toEqual([]);
  });
});
