import { makeDocumentFromString } from '@redocly/openapi-core';
import { outdent } from 'outdent';

import { locateChanges } from '../locate.js';
import type { Change } from '../types.js';

const BASE_YAML = outdent`
  openapi: 3.1.0
  info: { title: T, version: '1' }
`;

const REVISION_YAML = outdent`
  openapi: 3.1.0
  info:
    title: T2
    version: '1'
`;

describe('locateChanges', () => {
  it('attaches file, line, and col to each present side', () => {
    const base = makeDocumentFromString(BASE_YAML, 'base.yaml');
    const revision = makeDocumentFromString(REVISION_YAML, 'rev.yaml');
    const changes: Change[] = [
      {
        pointer: '#/info',
        property: 'title',
        kind: 'changed',
        typeName: 'Info',
        base: { pointer: '#/info/title', value: 'T' },
        revision: { pointer: '#/info/title', value: 'T2' },
        compat: 'non-breaking',
      },
    ];

    const [located] = locateChanges(changes, base.source, revision.source);
    expect(located.base).toMatchObject({ file: 'base.yaml', line: 2 });
    expect(located.revision).toMatchObject({ file: 'rev.yaml', line: 3 });
    expect(located.revision?.col).toBeGreaterThan(1);
  });

  it('falls back to 1:1 for pointers missing from the source', () => {
    const base = makeDocumentFromString(BASE_YAML, 'base.yaml');
    const revision = makeDocumentFromString(REVISION_YAML, 'rev.yaml');
    const changes: Change[] = [
      {
        pointer: '#/components/schemas/Ghost',
        kind: 'removed',
        typeName: 'Schema',
        base: { pointer: '#/components/schemas/Ghost', value: {} },
        compat: 'breaking',
      },
    ];

    const [located] = locateChanges(changes, base.source, revision.source);
    expect(located.base).toMatchObject({ file: 'base.yaml', line: 1, col: 1 });
  });
});
