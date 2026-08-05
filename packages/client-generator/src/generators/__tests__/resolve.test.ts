import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GENERATOR_CONTRACT } from '../contract.js';
import { resolveGenerators } from '../resolve.js';
import type { CustomGenerator } from '../types.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const noopRun = () => [];

describe('resolveGenerators', () => {
  it('passes built-in names through unchanged', async () => {
    const { selected, registry } = await resolveGenerators(['sdk', 'zod']);
    expect(selected).toEqual(['sdk', 'zod']);
    expect(registry.has('sdk')).toBe(true);
    expect(registry.has('zod')).toBe(true);
  });

  it("keeps a registered generator's declared options schema", async () => {
    const custom: CustomGenerator = {
      name: 'route-map',
      run: noopRun,
      options: { type: 'object', properties: { exportName: { type: 'string' } } },
    };
    const { registry } = await resolveGenerators(['route-map'], { customGenerators: [custom] });
    expect(registry.get('route-map')?.options).toEqual(custom.options);
  });

  it('registers an inline custom generator and selects it by name', async () => {
    const custom: CustomGenerator = { name: 'route-map', run: noopRun };
    const { selected, registry } = await resolveGenerators(['sdk', 'route-map'], {
      customGenerators: [custom],
    });
    expect(selected).toEqual(['sdk', 'route-map']);
    expect(registry.get('route-map')?.run).toBe(noopRun);
  });

  it('pulls in a generator prerequisite instead of failing on it', async () => {
    // `--generator cli` alone should produce a working, validating CLI.
    const { selected } = await resolveGenerators(['cli']);
    expect(selected).toContain('cli');
    expect(selected).toContain('sdk');
    expect(selected).toContain('zod');
    // A prerequisite runs BEFORE the generator that needs it.
    expect(selected.indexOf('sdk')).toBeLessThan(selected.indexOf('cli'));
    // An explicit selection is not duplicated or reordered away.
    const explicit = await resolveGenerators(['sdk', 'zod', 'cli']);
    expect(explicit.selected).toEqual(['sdk', 'zod', 'cli']);
  });

  it('accepts a generator declaring the current contract; rejects any other with the fix path', async () => {
    const current: CustomGenerator = { name: 'ok', run: noopRun, contract: GENERATOR_CONTRACT };
    await expect(resolveGenerators(['ok'], { customGenerators: [current] })).resolves.toBeTruthy();

    const stale: CustomGenerator = { name: 'old', run: noopRun, contract: GENERATOR_CONTRACT - 1 };
    await expect(resolveGenerators(['old'], { customGenerators: [stale] })).rejects.toThrow(
      /declares generator contract \d+.*provides \d+.*eject-generator/s
    );

    const future: CustomGenerator = { name: 'new', run: noopRun, contract: GENERATOR_CONTRACT + 1 };
    await expect(resolveGenerators(['new'], { customGenerators: [future] })).rejects.toThrow(
      /Update @redocly\/cli/
    );
    // No declaration keeps friction-free authoring — accepted as current.
    const undeclared: CustomGenerator = { name: 'bare', run: noopRun };
    await expect(
      resolveGenerators(['bare'], { customGenerators: [undeclared] })
    ).resolves.toBeTruthy();
  });

  it('registers an inline custom that is available (for requires) but not selected', async () => {
    const custom: CustomGenerator = { name: 'extra', run: noopRun };
    const { selected, registry } = await resolveGenerators(['sdk'], { customGenerators: [custom] });
    expect(selected).toEqual(['sdk']);
    expect(registry.has('extra')).toBe(true);
  });

  it('a custom generator may take over a built-in name (ejected generators shadow their origin)', async () => {
    const custom: CustomGenerator = { name: 'python', run: noopRun, sample: () => undefined };
    const { selected, registry } = await resolveGenerators(['python'], {
      customGenerators: [custom],
    });
    expect(selected).toEqual(['python']);
    expect(registry.get('python')?.run).toBe(noopRun);
    expect(typeof registry.get('python')?.sample).toBe('function');
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

  it('rejects URL specifiers — remote generator modules are not supported', async () => {
    // Mirrors core's plugin loading; a `data:` URL would otherwise reach `import()`
    // and execute inline code straight from the config.
    for (const specifier of [
      'https://example.com/generator.mjs',
      'data:text/javascript,export default {}',
    ]) {
      await expect(resolveGenerators([specifier])).rejects.toThrow(
        /Remote generator modules are not supported/
      );
    }
  });

  it('throws an actionable error when a specifier cannot be loaded', async () => {
    await expect(
      resolveGenerators(['./does-not-exist.ts'], { configDir: fixtures })
    ).rejects.toThrow(/Could not load generator "\.\/does-not-exist\.ts"/);
  });

  it('treats a non-built-in entry with no configDir as a package specifier (resolved from cwd)', async () => {
    // A bare specifier that does not resolve surfaces the load error; this also exercises the
    // package-name (non-path) branch and the default `configDir = cwd`.
    await expect(resolveGenerators(['@redocly/not-a-real-generator-pkg'])).rejects.toThrow(
      /Could not load generator "@redocly\/not-a-real-generator-pkg"/
    );
  });

  it('throws when a loaded module does not export a generator', async () => {
    await expect(resolveGenerators(['./empty-plugin.ts'], { configDir: fixtures })).rejects.toThrow(
      /must export a generator/
    );
  });
});
