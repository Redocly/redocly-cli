import {
  BUILTIN_GENERATOR_NAMES,
  categorizeGenerateClientError,
  collectToolkitImports,
  parseEjectedProvenance,
} from '../utils/generate-client-telemetry.js';

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
  it('covers every current built-in — a missing name silently degrades the usage event', () => {
    for (const name of ['sdk', 'zod', 'mock', 'cli', 'python', 'go', 'php']) {
      expect(BUILTIN_GENERATOR_NAMES.has(name), name).toBe(true);
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
