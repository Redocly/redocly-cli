import { describe, it, expect } from 'vitest';

import { parseMarkdown } from '../../../parser/index.js';
import { extractScopes } from '../../../scopes/extractor.js';
import type { NormalizedRule } from '../../../types/index.js';
import type { ScopeRuleContext } from '../../types.js';
import { maxImageSize } from '../max-image-size.js';
import { wholeFileSegment } from './helpers.js';

describe('max-image-size', () => {
  const createRule = (maxSizeKB: number = 100, extensions?: string[]): NormalizedRule => ({
    name: 'test/max-image-size',
    shortName: 'max-image-size',
    severity: 'error' as const,
    message: 'Image too large: %s',
    scope: ['all'],
    assertions: {
      'max-image-size': {
        maxSizeKB,
        ...(extensions && { extensions }),
      },
    },
    appliesTo: undefined,
    excludes: undefined,
    exceptions: undefined,
  });

  const createFileMetadata = (images: Record<string, { size: number; exists: boolean }>) => ({
    images: new Map(
      Object.entries(images).map(([path, data]) => [
        path,
        {
          path,
          size: data.size,
          exists: data.exists,
        },
      ])
    ),
  });

  function buildContext(
    content: string,
    fileMetadata?: ScopeRuleContext['fileMetadata']
  ): ScopeRuleContext {
    return {
      segments: [wholeFileSegment(content)],
      content,
      tree: parseMarkdown(content),
      fileMetadata,
    };
  }

  describe('image size validation', () => {
    it('should not report problems for images within size limit', async () => {
      const content = `# Test Document

![Small image](./images/small.png)
![Another small image](./images/tiny.jpg)
`;

      const fileMetadata = createFileMetadata({
        './images/small.png': { size: 50 * 1024, exists: true }, // 50KB
        './images/tiny.jpg': { size: 30 * 1024, exists: true }, // 30KB
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(0);
    });

    it('should report problems for images exceeding size limit', async () => {
      const content = `# Test Document

![Large image](./images/large.png)
![Normal image](./images/normal.jpg)
![Huge image](./images/huge.gif)
`;

      const fileMetadata = createFileMetadata({
        './images/large.png': { size: 150 * 1024, exists: true }, // 150KB > 100KB
        './images/normal.jpg': { size: 80 * 1024, exists: true }, // 80KB < 100KB
        './images/huge.gif': { size: 500 * 1024, exists: true }, // 500KB > 100KB
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(2);
      expect(problems[0]).toMatchObject({
        file: 'test.md',
        line: 3,
        message: 'Image too large: ./images/large.png (150KB > 100KB)',
      });
      expect(problems[1]).toMatchObject({
        file: 'test.md',
        line: 5,
        message: 'Image too large: ./images/huge.gif (500KB > 100KB)',
      });
    });

    it('should respect custom size limits', async () => {
      const content = `# Test Document

![Medium image](./images/medium.png)
`;

      const fileMetadata = createFileMetadata({
        './images/medium.png': { size: 75 * 1024, exists: true }, // 75KB
      });

      // Should pass with 100KB limit
      const problems100 = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );
      expect(problems100).toHaveLength(0);

      // Should fail with 50KB limit
      const problems50 = await maxImageSize.execute(
        createRule(50),
        'test.md',
        buildContext(content, fileMetadata)
      );
      expect(problems50).toHaveLength(1);
      expect(problems50[0].message).toContain('75KB > 50KB');
    });

    it('should respect custom file extensions', async () => {
      const content = `# Test Document

![PNG image](./images/large.png)
![SVG image](./images/large.svg)
![PDF file](./images/document.pdf)
`;

      const fileMetadata = createFileMetadata({
        './images/large.png': { size: 150 * 1024, exists: true }, // 150KB
        './images/large.svg': { size: 150 * 1024, exists: true }, // 150KB
        './images/document.pdf': { size: 150 * 1024, exists: true }, // 150KB
      });

      // Only check PNG and SVG files
      const problems = await maxImageSize.execute(
        createRule(100, ['png', 'svg']),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(2); // PNG and SVG flagged, PDF ignored
      expect(problems[0].message).toContain('./images/large.png');
      expect(problems[1].message).toContain('./images/large.svg');
    });
  });

  describe('image reference extraction', () => {
    it('should handle images with titles', async () => {
      const content = `# Test Document

![Image with title](./images/test.png "This is a tooltip")
![Image with single quotes](./images/test2.jpg 'Another tooltip')
`;

      const fileMetadata = createFileMetadata({
        './images/test.png': { size: 150 * 1024, exists: true },
        './images/test2.jpg': { size: 150 * 1024, exists: true },
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(2);
      expect(problems[0].message).toContain('./images/test.png');
      expect(problems[1].message).toContain('./images/test2.jpg');
    });

    it('should ignore external URLs', async () => {
      const content = `# Test Document

![External image](https://example.com/image.png)
![Local image](./images/local.jpg)
![Another external](http://example.com/other.gif)
`;

      const fileMetadata = createFileMetadata({
        './images/local.jpg': { size: 150 * 1024, exists: true },
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('./images/local.jpg');
    });

    it('should handle missing metadata gracefully', async () => {
      const content = `# Test Document

![Missing metadata](./images/unknown.png)
![Has metadata](./images/known.jpg)
`;

      const fileMetadata = createFileMetadata({
        './images/known.jpg': { size: 150 * 1024, exists: true },
        // './images/unknown.png' intentionally missing
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('./images/known.jpg');
    });

    it('should handle non-existent files gracefully', async () => {
      const content = `# Test Document

![Non-existent](./images/missing.png)
![Exists](./images/real.jpg)
`;

      const fileMetadata = createFileMetadata({
        './images/missing.png': { size: 0, exists: false },
        './images/real.jpg': { size: 150 * 1024, exists: true },
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('./images/real.jpg');
    });
  });

  describe('reference-style images', () => {
    // The old regex (`!\[([^\]]*)\]\(([^)\s]+)(?:[^\)]*)?\)`) required a
    // literal `(...)` destination right after the label, so it never
    // matched `![alt][ref]`/`![alt][]`/`![alt]` syntax at all -- these are
    // net-new detection, not a behavior change to an existing case.
    it('should detect an oversized full reference-style image (![alt][ref])', async () => {
      const content = `# Test Document

![Large image][big]

[big]: ./images/large.png
`;

      const fileMetadata = createFileMetadata({
        './images/large.png': { size: 150 * 1024, exists: true },
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatchObject({
        file: 'test.md',
        line: 3,
        column: 1,
        message: 'Image too large: ./images/large.png (150KB > 100KB)',
      });
    });

    it('should detect an oversized collapsed reference-style image (![alt][])', async () => {
      const content = `# Test Document

![large][]

[large]: ./images/large.png
`;

      const fileMetadata = createFileMetadata({
        './images/large.png': { size: 150 * 1024, exists: true },
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('./images/large.png');
    });

    it('should detect an oversized shortcut reference-style image (![alt])', async () => {
      const content = `# Test Document

![large]

[large]: ./images/large.png
`;

      const fileMetadata = createFileMetadata({
        './images/large.png': { size: 150 * 1024, exists: true },
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('./images/large.png');
    });

    it('should not flag a reference-style image whose label has no matching definition', async () => {
      const content = `# Test Document

![large][missing]
`;

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, createFileMetadata({}))
      );

      expect(problems).toHaveLength(0);
    });
  });

  describe('AST-derived positions', () => {
    // A regex applied line-by-line can never match an image whose label
    // soft-wraps across a source line (there's no single line containing
    // both the opening `![` and the closing `)`) -- the old
    // `extractImageReferences` silently missed this case entirely. Reading
    // image tokens from the tree finds it, and reports at the token's true
    // (possibly mid-line) start position rather than a synthetic line-1
    // guess.
    it('should detect an oversized image whose label wraps across source lines', async () => {
      const content = `Some prefix text ![alt
text](./images/big.png) more text.
`;

      const fileMetadata = createFileMetadata({
        './images/big.png': { size: 150 * 1024, exists: true },
      });

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, fileMetadata)
      );

      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatchObject({
        line: 1,
        column: 18, // the '!' of '![alt' -- mid-line, after "Some prefix text "
      });
    });
  });

  describe('scope-aware execution', () => {
    it('does not flag an oversized image outside the rule scope', async () => {
      const content = `# Heading

![Large image](./images/large.png)
`;
      const tree = parseMarkdown(content);
      // Scope to headings only -- the image lives in the paragraph below,
      // so nothing in ctx.segments overlaps its token.
      const segments = extractScopes(tree, content).filter((s) => s.scope.startsWith('heading.'));
      const ctx: ScopeRuleContext = {
        segments,
        content,
        tree,
        fileMetadata: createFileMetadata({
          './images/large.png': { size: 150 * 1024, exists: true },
        }),
      };

      const problems = await maxImageSize.execute(createRule(100), 'test.md', ctx);

      expect(problems).toHaveLength(0);
    });

    it('flags an oversized image whose token overlaps the scoped segment', async () => {
      const content = `# Heading

![Large image](./images/large.png)
`;
      const tree = parseMarkdown(content);
      const segments = extractScopes(tree, content).filter((s) => s.scope === 'paragraph');
      const ctx: ScopeRuleContext = {
        segments,
        content,
        tree,
        fileMetadata: createFileMetadata({
          './images/large.png': { size: 150 * 1024, exists: true },
        }),
      };

      const problems = await maxImageSize.execute(createRule(100), 'test.md', ctx);

      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('./images/large.png');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const content = '';

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, createFileMetadata({}))
      );

      expect(problems).toHaveLength(0);
    });

    it('should handle content with no images', async () => {
      const content = `# Test Document

This is just text with [regular links](./page.html) but no images.
`;

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content, createFileMetadata({}))
      );

      expect(problems).toHaveLength(0);
    });

    it('should handle no fileMetadata provided', async () => {
      const content = `# Test Document

![Some image](./images/test.png)
`;

      const problems = await maxImageSize.execute(
        createRule(100),
        'test.md',
        buildContext(content) // fileMetadata intentionally omitted
      );

      expect(problems).toHaveLength(0);
    });
  });
});
