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
        child: vi.fn().mockReturnThis(),
      },
    } as unknown as UserContext);

  const dummyPlugins: Plugin[] = [];

  it('should report an error for extends entry that is not a string (e.g., number)', () => {
    const ctx = makeCtx();
    const node = {
      extends: [42],
    } as unknown as RawGovernanceConfig;

    const result = bundleExtends({ node, ctx, plugins: dummyPlugins });

    // Should report error for non-string value
    expect(ctx.report).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Invalid "extends" entry'),
      })
    );
    // The invalid entry should be filtered out
    expect(result.extends).toBeUndefined();
  });

  it('should silently skip extends entry that is an empty string', () => {
    const ctx = makeCtx();
    const node = {
      extends: ['  '],
    } as unknown as RawGovernanceConfig;

    const result = bundleExtends({ node, ctx, plugins: dummyPlugins });

    // Should not report errors for empty strings - just filter them out
    expect(ctx.report).not.toHaveBeenCalled();
    // The invalid entry should be filtered out
    expect(result.extends).toBeUndefined();
  });

  it('should silently skip an extends entry that cannot be resolved as a file or URL', () => {
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

    const result = bundleExtends({ node, ctx, plugins: dummyPlugins });

    // Should not report errors - let downstream validators handle it
    expect(baseCtx.report).not.toHaveBeenCalled();
    // The unresolved entry should be filtered out
    expect(result.extends).toBeUndefined();
  });

  it('should silently skip an extends entry that is undefined or null', () => {
    const ctx = makeCtx();
    const node = {
      extends: [undefined, null],
    } as unknown as RawGovernanceConfig;

    const result = bundleExtends({ node, ctx, plugins: dummyPlugins });

    // Should not report errors for undefined/null - just skip them
    expect(ctx.report).not.toHaveBeenCalled();
    // The undefined/null entries should be filtered out
    expect(result.extends).toBeUndefined();
  });
});
