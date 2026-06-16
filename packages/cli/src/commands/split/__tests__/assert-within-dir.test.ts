import { HandledError } from '@redocly/openapi-core';

import { assertWithinDir } from '../utils/assert-within-dir.js';

describe('assertWithinDir', () => {
  it('allows a path inside the output directory', () => {
    expect(() => assertWithinDir('out', 'out/components/schemas/User.yaml', 'User')).not.toThrow();
  });

  it('allows a name that merely starts with dots', () => {
    expect(() =>
      assertWithinDir('out/components/schemas', 'out/components/schemas/..foo.yaml', '..foo')
    ).not.toThrow();
  });

  it('aborts when the path escapes the output directory via ".."', () => {
    expect(() => assertWithinDir('out', 'out/../tmp/foo.yaml', '../tmp/foo')).toThrow(HandledError);
  });

  it('aborts on a sibling directory that shares a name prefix', () => {
    expect(() => assertWithinDir('out', 'outsider/foo.yaml', 'foo')).toThrow(HandledError);
  });
});
