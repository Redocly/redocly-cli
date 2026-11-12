import { outdent } from 'outdent';

import { defaultImpact, highestImpact, impactRank } from '../impact.js';
import { changesBetween } from './utils.js';

describe('impact', () => {
  it('should rank patch below minor below major', () => {
    expect(impactRank('patch')).toBeLessThan(impactRank('minor'));
    expect(impactRank('minor')).toBeLessThan(impactRank('major'));
  });

  it('should pick the highest impact, and none from no impacts', () => {
    expect(highestImpact(['patch', 'major', 'minor'])).toBe('major');
    expect(highestImpact([])).toBeUndefined();
  });

  it('should take an unjudged addition for a minor and anything else for a patch', async () => {
    const cafe = (paths: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths: ${paths}
    `;
    const [menuAdded] = await changesBetween(cafe('{}'), cafe('{ /menu: {} }'));
    const [menuRemoved] = await changesBetween(cafe('{ /menu: {} }'), cafe('{}'));
    const [menuHidden] = await changesBetween(
      cafe('{ /menu: {} }'),
      cafe('{ /menu: { x-internal: true } }')
    );

    expect(defaultImpact(menuAdded)).toBe('minor');
    expect(defaultImpact(menuRemoved)).toBe('patch');
    expect(defaultImpact(menuHidden)).toBe('patch');
  });

  it('should take a new component, or a new map of them, for a patch until something uses it', async () => {
    const cafe = (components: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths: {}
      ${components}
    `;
    const impactsOf = async (base: string, revision: string) =>
      (await changesBetween(cafe(base), cafe(revision))).map(defaultImpact);

    expect(await impactsOf('', 'components: { schemas: {} }')).toEqual(['patch']);
    expect(await impactsOf('components: {}', 'components: { schemas: {} }')).toEqual(['patch']);
    expect(
      await impactsOf('components: { schemas: {} }', 'components: { schemas: { MenuItem: {} } }')
    ).toEqual(['patch']);
    expect(
      await impactsOf(
        'components: { schemas: { MenuItem: {} } }',
        'components: { schemas: { MenuItem: { properties: {} } } }'
      )
    ).toEqual(['minor']);
  });
});
