import { bundleExtends } from '../bundle-extends.js';

import type { Plugin, RawGovernanceConfig } from '../types.js';
import type { UserContext } from '../../walk.js';

describe('bundleExtends', () => {
  const makeCtx = () =>
    ({
      resolve: vi.fn(),
      getVisitorData: vi.fn(),
      report: vi.fn(),
      location: {
        source: { absoluteRef: 'redocly.yaml' } as any,
        pointer: '#/rules',
      },
    } as unknown as UserContext);

  const dummyPlugins: Plugin[] = [];

  it('should report an error when extends entry is not a string', () => {
    const ctx = makeCtx();
    const node = {
      extends: [42],
    } as unknown as RawGovernanceConfig;

    bundleExtends({ node, ctx, plugins: dummyPlugins });

    expect(ctx.report).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Invalid "extends" entry at index 0 in redocly.yaml. Expected a non-empty string (ruleset name, path, or URL), but got 42.',
      })
    );
  });

  it('should report an error when extends entry is an empty string', () => {
    const ctx = makeCtx();
    const node = {
      extends: ['  '],
    } as unknown as RawGovernanceConfig;

    bundleExtends({ node, ctx, plugins: dummyPlugins });

    expect(ctx.report).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Invalid "extends" entry at index 0 in redocly.yaml. Expected a non-empty string (ruleset name, path, or URL), but got "  ".',
      })
    );
  });

  it('should report an error when an extends entry cannot be resolved as a file or URL', () => {
    const baseCtx = makeCtx();
    const node = {
      extends: ['missing-config.yaml'],
    } as unknown as RawGovernanceConfig;

    const ctx = {
      ...baseCtx,
      resolve: vi.fn().mockReturnValue({
        location: undefined,
        node: undefined,
      }),
    } as unknown as UserContext;

    bundleExtends({ node, ctx, plugins: dummyPlugins });

    expect(baseCtx.report).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Could not resolve "extends" entry "missing-config.yaml" in redocly.yaml. Make sure the path, URL, or ruleset name is correct.',
      })
    );
  });

  it('should report an error when an extends entry becomes undefined (e.g. invalid file)', () => {
    const ctx = makeCtx();
    const node = {
      extends: [undefined],
    } as unknown as RawGovernanceConfig;

    bundleExtends({ node, ctx, plugins: dummyPlugins });

    expect(ctx.report).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Could not resolve "extends" entry at index 0 in redocly.yaml. It may refer to a non-existent or invalid rules file.',
      })
    );
  });
});
