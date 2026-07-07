import { getPolarity } from '../classify/polarity.js';
import { UsageIndex, getComponentRoot, mergePolarity } from '../classify/usage.js';

describe('getComponentRoot', () => {
  it('extracts the component root', () => {
    expect(getComponentRoot('#/components/schemas/Pet/properties/name')).toBe(
      '#/components/schemas/Pet'
    );
    expect(getComponentRoot('#/paths/~1pets/get')).toBeUndefined();
  });
});

describe('mergePolarity', () => {
  it('merges polarities', () => {
    expect(mergePolarity('neutral', 'request')).toBe('request');
    expect(mergePolarity('request', 'request')).toBe('request');
    expect(mergePolarity('request', 'response')).toBe('both');
    expect(mergePolarity('both', 'response')).toBe('both');
  });
});

describe('getPolarity', () => {
  const emptyUsage = new UsageIndex([]);

  it('derives polarity from pointer segments', () => {
    expect(getPolarity('#/paths/~1p/get/responses/200/description', emptyUsage)).toBe('response');
    expect(getPolarity('#/paths/~1p/get/parameters/{query:limit}/schema', emptyUsage)).toBe(
      'request'
    );
    expect(getPolarity('#/paths/~1p/post/requestBody/content/application~1json', emptyUsage)).toBe(
      'request'
    );
    expect(getPolarity('#/info/title', emptyUsage)).toBe('neutral');
    expect(getPolarity('#/tags/{pets}', emptyUsage)).toBe('neutral');
  });

  it('treats callbacks and webhooks as neutral (inverted direction, not judged in v1)', () => {
    expect(
      getPolarity('#/paths/~1p/post/callbacks/onEvent/~1cb/post/requestBody', emptyUsage)
    ).toBe('neutral');
    expect(getPolarity('#/webhooks/newPet/post/parameters/{query:x}', emptyUsage)).toBe('neutral');
  });

  it('derives component polarity from usage sites', () => {
    const usage = new UsageIndex([
      {
        site: '#/paths/~1pets/get/responses/200/content/application~1json/schema',
        target: '#/components/schemas/Pet',
      },
    ]);
    expect(getPolarity('#/components/schemas/Pet/properties/name', usage)).toBe('response');
  });

  it('derives both when a component is used on both sides', () => {
    const usage = new UsageIndex([
      {
        site: '#/paths/~1pets/get/responses/200/content/a~1b/schema',
        target: '#/components/schemas/Pet',
      },
      {
        site: '#/paths/~1pets/post/requestBody/content/a~1b/schema',
        target: '#/components/schemas/Pet',
      },
    ]);
    expect(getPolarity('#/components/schemas/Pet', usage)).toBe('both');
  });

  it('resolves transitive usage through other components, cycle-safe', () => {
    const usage = new UsageIndex([
      {
        site: '#/paths/~1pets/get/responses/200/content/a~1b/schema',
        target: '#/components/schemas/Pet',
      },
      {
        site: '#/components/schemas/Pet/properties/address',
        target: '#/components/schemas/Address',
      },
      // cycle:
      { site: '#/components/schemas/Address/properties/pet', target: '#/components/schemas/Pet' },
    ]);
    expect(getPolarity('#/components/schemas/Address', usage)).toBe('response');
  });

  it('returns neutral for unused components', () => {
    expect(getPolarity('#/components/schemas/Orphan', emptyUsage)).toBe('neutral');
  });
});
