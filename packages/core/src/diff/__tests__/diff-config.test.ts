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

    expect(config.diff.oas3_1['operation-removed']).toBe('minor');
    expect(config.diff.oas3_1['enum-values-added']).toBe('off');
    expect(config.diff.oas3_1['path-removed']).toBe('major');
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

  it('takes the impacts from the preset when the config says nothing about diff', async () => {
    const config = await createConfig({ extends: ['recommended-diff'] });

    expect(diffWith(config).changes[0].impact).toBe('major');
  });

  it('lets a spec block override the impact a preset set', async () => {
    const config = await createConfig({
      extends: ['recommended-diff'],
      oas3_1Diff: { 'operation-removed': 'minor' },
    });

    expect(diffWith(config).changes[0].impact).toBe('minor');
  });

  it('runs only the listed rules when a diff map is given without a ruleset', async () => {
    const config = await createConfig({ diff: { 'path-removed': 'major' } });

    // operation-removed is not in the map, so the removal is an unjudged patch
    expect(diffWith(config).changes[0].impact).toBe('patch');
  });

  it('reads an impact outside the ladder as off', async () => {
    // The config lint reports the value as a warning; the report must not carry it.
    const config = await createConfig({
      extends: ['recommended-diff'],
      diff: { 'operation-removed': 'blocker' },
    } as never);

    const result = diffWith(config);

    expect(result.changes[0].impact).toBe('patch');
    expect(result.summary).toEqual({ major: 0, minor: 0, patch: 1 });
  });

  it('turns a rule off when the config says so', async () => {
    const config = await createConfig({
      extends: ['recommended-diff'],
      diff: { 'operation-removed': 'off' },
    });

    // No rule speaks for the removal any more, so it falls back to an unjudged patch.
    expect(diffWith(config).changes[0].impact).toBe('patch');
  });
});
