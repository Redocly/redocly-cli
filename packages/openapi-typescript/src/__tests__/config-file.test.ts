import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadConfigFile, mergeConfig } from '../config-file.js';

describe('mergeConfig', () => {
  it('CLI overrides win over config-file values; undefined overrides are ignored', () => {
    const merged = mergeConfig(
      { input: 'spec.yaml', output: 'a.ts', outputMode: 'single' },
      { output: 'b.ts', outputMode: undefined, facade: 'service-class' }
    );
    expect(merged).toEqual({
      input: 'spec.yaml',
      output: 'b.ts',
      outputMode: 'single',
      facade: 'service-class',
    });
  });
});

describe('loadConfigFile', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ots-cfg-'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('imports the default export of an explicit .mjs config path', async () => {
    const file = join(dir, 'my.config.mjs');
    writeFileSync(
      file,
      `export default { input: 'spec.yaml', output: 'out.ts', generators: ['sdk'] };\n`,
      'utf-8'
    );
    const config = await loadConfigFile(file);
    expect(config).toEqual({ input: 'spec.yaml', output: 'out.ts', generators: ['sdk'] });
  });

  it('returns undefined when no path is given and none is discovered', async () => {
    const config = await loadConfigFile(undefined, dir);
    expect(config).toBeUndefined();
  });

  it('discovers a default-named config when no explicit path is given', async () => {
    const file = join(dir, 'redocly-openapi-typescript.config.mjs');
    writeFileSync(
      file,
      `export default { input: 'discovered.yaml', output: 'discovered.ts' };\n`,
      'utf-8'
    );
    const config = await loadConfigFile(undefined, dir);
    expect(config).toEqual({ input: 'discovered.yaml', output: 'discovered.ts' });
  });

  it('throws when the config file has no default export', async () => {
    const file = join(dir, 'no-default.config.mjs');
    writeFileSync(file, `export const x = 1;\n`, 'utf-8');
    await expect(loadConfigFile(file)).rejects.toThrow(/export default/);
  });

  it('resolves a relative path against the given cwd', async () => {
    // Write a config in dir and pass a relative filename + cwd=dir
    writeFileSync(
      join(dir, 'relative.config.mjs'),
      `export default { input: 'rel.yaml', output: 'rel.ts' };\n`,
      'utf-8'
    );
    const config = await loadConfigFile('relative.config.mjs', dir);
    expect(config).toEqual({ input: 'rel.yaml', output: 'rel.ts' });
  });
});
