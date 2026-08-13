import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { BUILTIN_META } from '../../../client-generator/src/generators/meta.js';
import { EJECTABLE, FRAMEWORK_VARIANTS } from '../commands/eject-generator.js';
import { collectGeneratorUsage } from '../commands/generate-client.js';
import {
  BUILTIN_GENERATOR_NAMES,
  categorizeGenerateClientError,
  collectToolkitImports,
  generateClientTelemetry,
  parseEjectedProvenance,
} from '../utils/client-generator-telemetry.js';

describe('collectToolkitImports', () => {
  it('returns only OUR helper names from client-generator imports — never user identifiers', () => {
    const source = [
      "import { flattenAllOf, Printer, mySecretHelper } from '@redocly/client-generator';",
      "import { printStatements } from '@redocly/client-generator/generate';",
      "import { internalThing } from './our-private-module.js';",
    ].join('\n');
    expect(collectToolkitImports(source, ['flattenAllOf', 'Printer', 'printStatements'])).toEqual([
      'flattenAllOf',
      'Printer',
      'printStatements',
    ]);
  });

  it('handles aliased and type-only named imports', () => {
    const source =
      "import { type flattenAllOf, Printer as Writer } from '@redocly/client-generator';";
    expect(collectToolkitImports(source, ['flattenAllOf', 'Printer'])).toEqual([
      'flattenAllOf',
      'Printer',
    ]);
  });
});

describe('categorizeGenerateClientError', () => {
  it('maps known failure shapes to coarse categories', () => {
    expect(categorizeGenerateClientError('Invalid pagination configuration:…')).toBe('pagination');
    expect(categorizeGenerateClientError('Could not load generator "./x.mjs": …')).toBe(
      'generator-load'
    );
    expect(categorizeGenerateClientError('Unknown generator: foo')).toBe('not-supported');
    expect(
      categorizeGenerateClientError('The "swr" generator does not support --error-mode "result"')
    ).toBe('not-supported');
    expect(categorizeGenerateClientError('boom')).toBe('other');
    expect(categorizeGenerateClientError('Generator "php" failed: something broke')).toBe(
      'generator-run'
    );
  });
});

describe('BUILTIN_GENERATOR_NAMES', () => {
  // Every built-in ships as a vendorable asset, so EJECTABLE plus the framework variants
  // is the full set. A built-in missing here is counted as a custom generator and its
  // ejected provenance header is ignored.
  it('covers every built-in', () => {
    const builtins = [...EJECTABLE, ...FRAMEWORK_VARIANTS.keys()].sort();
    expect([...BUILTIN_GENERATOR_NAMES].sort()).toEqual(builtins);
  });

  it('matches the generator registry, so a new built-in cannot skip eject or telemetry', () => {
    expect([...BUILTIN_GENERATOR_NAMES].sort()).toEqual(Object.keys(BUILTIN_META).sort());
  });
});

describe('collectGeneratorUsage', () => {
  it('resolves config-relative paths against the config dir and counts a shared custom once', () => {
    for (const key of Object.keys(generateClientTelemetry)) {
      delete generateClientTelemetry[key as keyof typeof generateClientTelemetry];
    }
    const configDir = mkdtempSync(join(tmpdir(), 'generate-client-telemetry-'));
    try {
      mkdirSync(join(configDir, 'generators'));
      writeFileSync(
        join(configDir, 'generators/php.mjs'),
        '// Ejected from @redocly/client-generator@0.3.0 — the built-in "php" generator.\n' +
          "import { Printer } from '@redocly/client-generator';\n",
        'utf-8'
      );
      // Two apis, the same entries — the cwd is elsewhere, only configDir resolves them.
      collectGeneratorUsage(['typescript', './generators/php.mjs'], ['Printer'], configDir);
      collectGeneratorUsage(['typescript', './generators/php.mjs'], ['Printer'], configDir);
      expect(generateClientTelemetry).toEqual({
        generate_client_builtin_generators: ['typescript'],
        generate_client_custom_generators_count: 1,
        generate_client_toolkit_imports: ['Printer'],
        generate_client_ejected_generators: ['php@0.3.0'],
      });
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  });
});

describe('parseEjectedProvenance', () => {
  it('reads OUR provenance header — an allowlisted name and version, nothing user-authored', () => {
    const source =
      '// Ejected from @redocly/client-generator@0.2.0 — the built-in "php" generator.\n// rest…';
    expect(parseEjectedProvenance(source)).toEqual({ name: 'php', version: '0.2.0' });
  });

  it('returns undefined for non-ejected files and non-allowlisted names', () => {
    expect(parseEjectedProvenance('export default { name: "mine", run() {} }')).toBeUndefined();
    expect(
      parseEjectedProvenance(
        '// Ejected from @redocly/client-generator@0.2.0 — the built-in "evil()" generator.'
      )
    ).toBeUndefined();
  });
});
