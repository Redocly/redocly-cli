import {
  categorizeGenerateClientError,
  collectToolkitImports,
} from '../utils/generate-client-telemetry.js';

describe('collectToolkitImports', () => {
  it('returns only OUR helper names from client-generator imports — never user identifiers', () => {
    const source = [
      "import { flattenAllOf, CodeWriter, mySecretHelper } from '@redocly/client-generator';",
      "import { printStatements } from '@redocly/client-generator/generate';",
      "import { internalThing } from './our-private-module.js';",
    ].join('\n');
    expect(
      collectToolkitImports(source, ['flattenAllOf', 'CodeWriter', 'printStatements'])
    ).toEqual(['flattenAllOf', 'CodeWriter', 'printStatements']);
  });

  it('handles aliased and type-only named imports', () => {
    const source =
      "import { type flattenAllOf, CodeWriter as Writer } from '@redocly/client-generator';";
    expect(collectToolkitImports(source, ['flattenAllOf', 'CodeWriter'])).toEqual([
      'flattenAllOf',
      'CodeWriter',
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
  });
});
