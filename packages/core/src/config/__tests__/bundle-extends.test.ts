import { bundleExtends } from '../bundle-extends.js';

import type { Plugin, RawGovernanceConfig } from '../types.js';
import type { UserContext } from '../../walk.js';

describe('bundleExtends', () => {
  const dummyCtx = {
    resolve: vi.fn(),
    getVisitorData: vi.fn(),
  } as unknown as UserContext;

  const dummyPlugins: Plugin[] = [];

  it('should throw a descriptive error when extends entry is not a string', () => {
    const node = {
      extends: [42],
    } as unknown as RawGovernanceConfig;

    expect(() => bundleExtends({ node, ctx: dummyCtx, plugins: dummyPlugins })).toThrow(
      'Invalid "extends" entry at index 0. Expected a non-empty string (ruleset name, path, or URL), but got 42.'
    );
  });

  it('should throw a descriptive error when extends entry is an empty string', () => {
    const node = {
      extends: ['  '],
    } as unknown as RawGovernanceConfig;

    expect(() => bundleExtends({ node, ctx: dummyCtx, plugins: dummyPlugins })).toThrow(
      'Invalid "extends" entry at index 0. Expected a non-empty string (ruleset name, path, or URL), but got "  ".'
    );
  });

  it('should throw a descriptive error when an extends entry cannot be resolved as a file or URL', () => {
    const node = {
      extends: ['missing-config.yaml'],
    } as unknown as RawGovernanceConfig;

    const ctx = {
      ...dummyCtx,
      resolve: vi.fn().mockReturnValue({
        location: undefined,
        node: undefined,
      }),
    } as unknown as UserContext;

    expect(() => bundleExtends({ node, ctx, plugins: dummyPlugins })).toThrow(
      'Could not resolve "extends" entry "missing-config.yaml". Make sure the path, URL, or ruleset name is correct.'
    );
  });
});
