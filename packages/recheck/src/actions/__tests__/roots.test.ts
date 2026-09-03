import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { rootForFile } from '../roots.js';

describe('rootForFile', () => {
  const cwd = process.cwd();

  it('returns the root that contains the file', () => {
    expect(rootForFile('docs/guides/a.md', ['docs'])).toBe(path.join(cwd, 'docs'));
  });

  it('returns the file directory when the root is the file itself', () => {
    expect(rootForFile('docs/README.md', ['docs/README.md'])).toBe(path.join(cwd, 'docs'));
  });

  it('picks the first matching root in order', () => {
    expect(rootForFile('docs/guides/a.md', ['docs/guides', 'docs'])).toBe(
      path.join(cwd, 'docs', 'guides')
    );
  });

  it('does not treat a sibling with a shared prefix as an ancestor', () => {
    expect(rootForFile('docs-old/a.md', ['docs'])).toBe(path.join(cwd, 'docs-old'));
  });

  it('falls back to the file directory outside every root', () => {
    const outside = path.resolve('/elsewhere/a.md');
    expect(rootForFile(outside, ['docs'])).toBe(path.dirname(outside));
  });
});
