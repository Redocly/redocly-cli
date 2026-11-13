import * as fs from 'node:fs';

import { GitRevisionResolver, isGitRevisionFile } from '../git-revision.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return { ...actual, existsSync: vi.fn(actual.existsSync) };
});

describe('isGitRevisionFile', () => {
  it.each([
    ['origin/main:openapi.yaml', true],
    ['HEAD~1:./apis/openapi.yaml', true],
    ['openapi.yaml', false],
    ['main:', false],
    ['--output:openapi.yaml', false],
    ['https://example.com/openapi.yaml', false],
    ['/apis/cafe:v1/openapi.yaml', false],
  ])('for %s returns %s', (ref, expected) => {
    expect(isGitRevisionFile(ref)).toBe(expected);
  });

  it('returns false for a file that exists under this name', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(true);

    expect(isGitRevisionFile('cafe:v1.yaml')).toBe(false);
  });
});

describe('GitRevisionResolver', () => {
  it.each([
    ['schemas/item.yaml', 'v1:apis/schemas/item.yaml'],
    ['../shared/errors.yaml', 'v1:shared/errors.yaml'],
    ['../../outside-the-revision.yaml', 'v1:outside-the-revision.yaml'],
    ['https://example.com/item.yaml', 'https://example.com/item.yaml'],
  ])('resolves %s in a revision file as %s', (ref, expected) => {
    const resolver = new GitRevisionResolver();
    const base = resolver.resolveExternalRef(null, 'v1:apis/openapi.yaml');

    expect(resolver.resolveExternalRef(base, ref)).toBe(expected);
  });

  it('keeps a revision that has a colon in braces', () => {
    const resolver = new GitRevisionResolver();
    const base = resolver.resolveExternalRef(null, 'main@{2026-01-01 10:00}:apis/openapi.yaml');

    expect(resolver.resolveExternalRef(base, 'schemas/item.yaml')).toBe(
      'main@{2026-01-01 10:00}:apis/schemas/item.yaml'
    );
  });

  it('does not read from git for a document that is not a revision file', async () => {
    const resolver = new GitRevisionResolver();

    await expect(
      resolver.resolveDocument('https://example.com/openapi.yaml', 'v1:item.yaml')
    ).rejects.toThrow('no such file');
  });
});
