import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GENERATOR_VERSION } from '../compatibility.js';
import { resolveGenerators } from '../resolve.js';
import type { CustomGenerator } from '../types.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const noopRun = () => [];

describe('resolveGenerators', () => {
  it('passes built-in names through unchanged', async () => {
    const { selected, registry } = await resolveGenerators(['typescript', 'zod']);
    expect(selected).toEqual(['typescript', 'zod']);
    expect(registry.has('typescript')).toBe(true);
    expect(registry.has('zod')).toBe(true);
  });

  it('names the rename for the retired "sdk" entry instead of importing it as a package', async () => {
    await expect(resolveGenerators(['sdk'])).rejects.toThrow(
      'The "sdk" generator is now named "typescript"'
    );
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

  it('keeps the docs and notApplicable hooks — an ejected generator exports both', async () => {
    // Dropping either makes an ejected generator quietly do less than the built-in it
    // replaced: `--docs` writes no page, ignored options stop warning.
    const docs = noopRun;
    const custom: CustomGenerator = {
      name: 'route-map',
      run: noopRun,
      docs,
      notApplicable: { importExt: 'it emits no imports' },
    };
    const { registry } = await resolveGenerators(['route-map'], { customGenerators: [custom] });
    expect(registry.get('route-map')?.docs).toBe(docs);
    expect(registry.get('route-map')?.notApplicable).toEqual({
      importExt: 'it emits no imports',
    });
  });

  it('registers an inline custom generator and selects it by name', async () => {
    const custom: CustomGenerator = { name: 'route-map', run: noopRun };
    const { selected, registry } = await resolveGenerators(['typescript', 'route-map'], {
      customGenerators: [custom],
    });
    expect(selected).toEqual(['typescript', 'route-map']);
    expect(registry.get('route-map')?.run).toBe(noopRun);
  });

  it('pulls in a generator prerequisite instead of failing on it', async () => {
    // `--generator cli` alone should produce a working, validating CLI.
    const { selected } = await resolveGenerators(['cli']);
    expect(selected).toContain('cli');
    expect(selected).toContain('typescript');
    expect(selected).toContain('zod');
    // A prerequisite runs BEFORE the generator that needs it.
    expect(selected.indexOf('typescript')).toBeLessThan(selected.indexOf('cli'));
    // An explicit selection is not duplicated or reordered away.
    const explicit = await resolveGenerators(['typescript', 'zod', 'cli']);
    expect(explicit.selected).toEqual(['typescript', 'zod', 'cli']);
  });

  it('accepts a generator whose requiresGenerator range covers the running version', async () => {
    const [major, minor] = GENERATOR_VERSION.split('.');
    const covering: CustomGenerator = {
      name: 'ok',
      run: noopRun,
      requiresGenerator: `^${major}.${minor}.0`,
    };
    await expect(resolveGenerators(['ok'], { customGenerators: [covering] })).resolves.toBeTruthy();

    // A generator written against a newer toolkit than this CLI ships.
    const ahead: CustomGenerator = {
      name: 'ahead',
      run: noopRun,
      requiresGenerator: `>=${Number(major) + 1}.0.0`,
    };
    await expect(resolveGenerators(['ahead'], { customGenerators: [ahead] })).rejects.toThrow(
      new RegExp(
        `"ahead" needs @redocly/client-generator >=${Number(major) + 1}\\.0\\.0.*this CLI ships ${GENERATOR_VERSION}`,
        's'
      )
    );

    // A generator pinned to a toolkit older than the one running: update the generator.
    const behind: CustomGenerator = { name: 'behind', run: noopRun, requiresGenerator: '0.0.1' };
    await expect(resolveGenerators(['behind'], { customGenerators: [behind] })).rejects.toThrow(
      /eject-generator/
    );

    // An unreadable range is rejected as such — never guessed at.
    const vague: CustomGenerator = { name: 'vague', run: noopRun, requiresGenerator: '1.x || 2' };
    await expect(resolveGenerators(['vague'], { customGenerators: [vague] })).rejects.toThrow(
      /requiresGenerator "1.x \|\| 2", which is not a range we read/
    );

    // No declaration keeps friction-free authoring — accepted as current.
    const undeclared: CustomGenerator = { name: 'bare', run: noopRun };
    await expect(
      resolveGenerators(['bare'], { customGenerators: [undeclared] })
    ).resolves.toBeTruthy();
  });

  it('registers an inline custom that is available (for requires) but not selected', async () => {
    const custom: CustomGenerator = { name: 'extra', run: noopRun };
    const { selected, registry } = await resolveGenerators(['typescript'], {
      customGenerators: [custom],
    });
    expect(selected).toEqual(['typescript']);
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
    const { selected, registry } = await resolveGenerators(
      ['typescript', './route-map-plugin.ts'],
      {
        configDir: fixtures,
      }
    );
    expect(selected).toEqual(['typescript', 'route-map']);
    expect(registry.has('route-map')).toBe(true);
  });

  it('pulls in the prerequisite a path-loaded generator declares', async () => {
    // The specifier has to be imported before its `requires` is known, so an ejected
    // generator gets its prerequisites the same way the built-in name does.
    const { selected } = await resolveGenerators(['./route-map-plugin.ts'], {
      configDir: fixtures,
    });
    expect(selected).toEqual(['typescript', 'route-map']);
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
