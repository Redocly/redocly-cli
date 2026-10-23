import { pointerOf } from '../diff-node.js';
import { defaultImpact, highestImpact, impactRank } from '../impact.js';
import type { Change, DiffNode } from '../types.js';
import { diffTreeOf } from './utils.js';

const cafe = diffTreeOf(`
  #/ Root
  #/paths Paths
  #/components Components
  #/components/schemas NamedSchemas
  #/components/schemas/MenuItem Schema
  #/components/schemas/MenuItem/properties SchemaProperties
`);

function addition(node: DiffNode): Change {
  return {
    key: pointerOf(node),
    kind: 'added',
    node,
    revision: { location: node.revision!.location, value: {} },
  };
}

describe('impact', () => {
  it('should rank patch below minor below major', () => {
    expect(impactRank('patch')).toBeLessThan(impactRank('minor'));
    expect(impactRank('minor')).toBeLessThan(impactRank('major'));
  });

  it('should pick the highest impact, and none from no impacts', () => {
    expect(highestImpact(['patch', 'major', 'minor'])).toBe('major');
    expect(highestImpact([])).toBeUndefined();
  });

  it('should take an unjudged addition for a minor and anything else for a patch', () => {
    const paths = cafe.get('#/paths')!;
    const location = paths.base!.location;

    expect(defaultImpact(addition(paths))).toBe('minor');
    expect(
      defaultImpact({
        key: pointerOf(paths),
        kind: 'removed',
        node: paths,
        base: { location, value: {} },
      })
    ).toBe('patch');
    expect(
      defaultImpact({
        key: pointerOf(paths),
        kind: 'modified',
        property: 'x-internal',
        node: paths,
        base: { location, value: false },
        revision: { location, value: true },
      })
    ).toBe('patch');
  });

  it('should take a new component, or a new map of them, for a patch until something uses it', () => {
    expect(defaultImpact(addition(cafe.get('#/components')!))).toBe('patch');
    expect(defaultImpact(addition(cafe.get('#/components/schemas')!))).toBe('patch');
    expect(defaultImpact(addition(cafe.get('#/components/schemas/MenuItem')!))).toBe('patch');
    expect(defaultImpact(addition(cafe.get('#/components/schemas/MenuItem/properties')!))).toBe(
      'minor'
    );
  });
});
