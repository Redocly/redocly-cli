import { Source } from '@redocly/openapi-core';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { toEmbeddedInputs } from '../index.js';

describe('toEmbeddedInputs', () => {
  it('skips a description reached through a remote $ref and counts it', () => {
    const remote = {
      source: new Source('https://example.com/schemas.yaml', 'description: text\n'),
      pointer: '#/description',
      text: 'text',
    };
    const local = {
      source: new Source(join(tmpdir(), 'schemas.yaml'), 'description: text\n'),
      pointer: '#/description',
      text: 'text',
    };

    const { inputs, remoteSkipped } = toEmbeddedInputs([remote, local]);

    expect(inputs).toHaveLength(1);
    expect(remoteSkipped).toBe(1);
    expect(inputs[0].file).toBe(local.source.absoluteRef);
  });
});
