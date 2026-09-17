import { outdent } from 'outdent';

import { createConfig } from '../../config/index.js';
import { makeDocumentFromString } from '../../resolve.js';
import { diffDocuments } from '../index.js';

const BASE = outdent`
  openapi: 3.1.0
  info: { title: T, version: '1.0.0' }
  paths:
    /pets:
      get:
        responses: { '200': { description: OK } }
      delete:
        responses: { '204': { description: Gone } }
`;

const REVISION = outdent`
  openapi: 3.1.0
  info: { title: T, version: '1.0.0' }
  paths:
    /pets:
      get:
        responses: { '200': { description: OK } }
`;

function diffWith(config: Awaited<ReturnType<typeof createConfig>>) {
  return diffDocuments({
    base: makeDocumentFromString(BASE, 'base.yaml'),
    revision: makeDocumentFromString(REVISION, 'revision.yaml'),
    config,
  });
}

describe('diff configuration', () => {
  it('merges the recommended-diff preset with the user map, later wins', async () => {
    const config = await createConfig({
      extends: ['recommended-diff'],
      diff: { 'operation-removed': 'minor', 'enum-values-added': 'off' },
    });

    expect(config.diff['operation-removed']).toBe('minor');
    expect(config.diff['enum-values-added']).toBe('off');
    expect(config.diff['path-removed']).toBe('major');
  });

  it('uses the configured impact for a verdict', async () => {
    const config = await createConfig({
      extends: ['recommended-diff'],
      diff: { 'operation-removed': 'minor' },
    });

    const result = diffWith(config);

    expect(result.changes.map((change) => [change.key, change.impact])).toEqual([
      ['#/paths/~1pets/delete', 'minor'],
    ]);
    expect(result.bump).toBe('minor');
  });

  it('falls back to recommended-diff when the config says nothing about diff', async () => {
    const config = await createConfig({ extends: ['recommended'] });

    expect(diffWith(config).changes[0].impact).toBe('major');
  });

  it('runs only the listed rules when a diff map is given without the preset', async () => {
    const config = await createConfig({ diff: { 'path-removed': 'major' } });

    // operation-removed is not in the map, so the removal is an unjudged patch
    expect(diffWith(config).changes[0].impact).toBe('patch');
  });
});
