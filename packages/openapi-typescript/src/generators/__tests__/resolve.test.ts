import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import type { CustomGenerator } from '../types.js';
import { resolveGenerators } from '../resolve.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const noopRun = () => [];

describe('resolveGenerators', () => {
  it('passes built-in names through unchanged', async () => {
    const { selected, registry } = await resolveGenerators(['sdk', 'zod']);
    expect(selected).toEqual(['sdk', 'zod']);
    expect(registry.has('sdk')).toBe(true);
    expect(registry.has('zod')).toBe(true);
  });

  it('registers an inline custom generator and selects it by name', async () => {
    const custom: CustomGenerator = { name: 'route-map', run: noopRun };
    const { selected, registry } = await resolveGenerators(['sdk', 'route-map'], {
      customGenerators: [custom],
    });
    expect(selected).toEqual(['sdk', 'route-map']);
    expect(registry.get('route-map')?.run).toBe(noopRun);
  });

  it('registers an inline custom that is available (for requires) but not selected', async () => {
    const custom: CustomGenerator = { name: 'extra', run: noopRun };
    const { selected, registry } = await resolveGenerators(['sdk'], { customGenerators: [custom] });
    expect(selected).toEqual(['sdk']);
    expect(registry.has('extra')).toBe(true);
  });

  it('rejects a custom generator whose name collides with a built-in', async () => {
    const custom: CustomGenerator = { name: 'sdk', run: noopRun };
    await expect(resolveGenerators(['sdk'], { customGenerators: [custom] })).rejects.toThrow(
      /collides/
    );
  });

  it('rejects two custom generators with the same name', async () => {
    const a: CustomGenerator = { name: 'dup', run: noopRun };
    const b: CustomGenerator = { name: 'dup', run: noopRun };
    await expect(resolveGenerators(['dup'], { customGenerators: [a, b] })).rejects.toThrow(
      /collides/
    );
  });

  it('rejects an invalid inline custom generator (missing run)', async () => {
    const bad = { name: 'broken' } as unknown as CustomGenerator;
    await expect(resolveGenerators(['broken'], { customGenerators: [bad] })).rejects.toThrow(
      /Invalid custom generator/
    );
  });

  it('loads a generator from a relative path specifier and selects its declared name', async () => {
    const { selected, registry } = await resolveGenerators(['sdk', './route-map-plugin.ts'], {
      configDir: fixtures,
    });
    expect(selected).toEqual(['sdk', 'route-map']);
    expect(registry.has('route-map')).toBe(true);
  });

  it('throws an actionable error when a specifier cannot be loaded', async () => {
    await expect(resolveGenerators(['./does-not-exist.ts'], { configDir: fixtures })).rejects.toThrow(
      /Could not load generator "\.\/does-not-exist\.ts"/
    );
  });

  it('treats a non-built-in entry with no configDir as a package specifier (resolved from cwd)', async () => {
    // A bare specifier that does not resolve surfaces the load error; this also exercises the
    // package-name (non-path) branch and the default `configDir = cwd`.
    await expect(resolveGenerators(['@redocly/not-a-real-generator-pkg'])).rejects.toThrow(
      /Could not load generator "@redocly\/not-a-real-generator-pkg"/
    );
  });

  it('throws when a loaded module does not export a generator', async () => {
    await expect(
      resolveGenerators(['./empty-plugin.ts'], { configDir: fixtures })
    ).rejects.toThrow(/must export a generator/);
  });
});
