import { describe, it, expect } from 'vitest';

import { computeDocumentReadability } from '../readability.js';

describe('computeDocumentReadability', () => {
  it('scores simple prose and reports its counts', () => {
    const result = computeDocumentReadability('The cat sat on the mat. The dog ran in the park.\n');
    expect(result.words).toBe(12);
    expect(result.sentences).toBe(2);
    expect(result.fleschReadingEase).toBeCloseTo(116.15, 1);
    expect(result.fleschKincaidGrade).toBeLessThan(1);
    // 4.71 * (35 characters / 12 words) + 0.5 * (12 / 2) - 21.43
    expect(result.automatedReadabilityIndex).toBeCloseTo(-4.69, 1);
  });

  it('matches the metric assertion: headings and code are excluded, blocks terminate', () => {
    const plain = computeDocumentReadability('The cat sat on the mat. The dog ran in the park.\n');
    const dressed = computeDocumentReadability(
      '# Comprehensive internationalization implementation considerations\n\n' +
        'The cat sat on the mat. The dog ran in the park.\n\n' +
        '```js\nconst incomprehensibleConfigurationFactoryProvider = 1;\n```\n'
    );
    expect(dressed.fleschReadingEase).toBe(plain.fleschReadingEase);
    expect(dressed.automatedReadabilityIndex).toBe(plain.automatedReadabilityIndex);
  });

  it('unpunctuated lowercase bullets terminate as sentences', () => {
    const bullets = computeDocumentReadability(
      '- the cat sat on the mat\n- the dog ran in the park\n'
    );
    const punctuated = computeDocumentReadability(
      'The cat sat on the mat. The dog ran in the park.\n'
    );
    expect(bullets.fleschReadingEase).toBe(punctuated.fleschReadingEase);
  });

  it('markdoc tags are not prose when the flag is on', () => {
    const withTag = computeDocumentReadability(
      'The cat sat on the mat.\n\n{% admonition type="info" %}\nThe dog ran in the park.\n{% /admonition %}\n',
      { markdoc: true }
    );
    const plain = computeDocumentReadability(
      'The cat sat on the mat.\n\nThe dog ran in the park.\n'
    );
    expect(withTag.words).toBe(plain.words);
  });

  it('a document with no prose returns null scores, not zero', () => {
    const result = computeDocumentReadability('# Only a heading\n\n```js\ncode();\n```\n');
    expect(result.words).toBe(0);
    expect(result.fleschReadingEase).toBeNull();
    expect(result.fleschKincaidGrade).toBeNull();
    expect(result.automatedReadabilityIndex).toBeNull();
  });
});
