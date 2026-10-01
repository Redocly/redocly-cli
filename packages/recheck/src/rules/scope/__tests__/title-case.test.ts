import { describe, it, expect } from 'vitest';

import { apTitleCase, chicagoTitleCase, isAllCapsWord } from '../title-case.js';

describe('apTitleCase', () => {
  it('capitalizes every word except short stopwords, per the brief example', () => {
    expect(apTitleCase('the quick brown fox jumps over the lazy dog')).toBe(
      'The Quick Brown Fox Jumps Over the Lazy Dog'
    );
  });

  it('always capitalizes the first and last word, even if they are stopwords', () => {
    expect(apTitleCase('the cat and the hat')).toBe('The Cat and the Hat');
  });

  it('capitalizes a 7-letter preposition mid-title (AP only lowercases <= 3 letters)', () => {
    expect(apTitleCase('walking through the park')).toBe('Walking Through the Park');
  });

  it('lowercases coordinating conjunctions mid-title', () => {
    expect(apTitleCase('cats and dogs living together')).toBe('Cats and Dogs Living Together');
  });

  it('capitalizes each part of a hyphenated word', () => {
    expect(apTitleCase('a well-known fact')).toBe('A Well-Known Fact');
  });

  it('lowercases a stopword part of a mid-title hyphenated compound (AP/Chicago style)', () => {
    expect(apTitleCase('the editor-in-chief resigned today')).toBe(
      'The Editor-in-Chief Resigned Today'
    );
  });

  it('capitalizes non-stopword parts of a mid-title hyphenated compound', () => {
    expect(apTitleCase('state-of-the-art technology arrives')).toBe(
      'State-of-the-Art Technology Arrives'
    );
  });

  it('lowercases a short-preposition part inside a hyphenated compound', () => {
    expect(apTitleCase('meet my mother-in-law today')).toBe('Meet My Mother-in-Law Today');
  });

  it("always capitalizes the LAST part of a hyphenated compound that is the title's last word", () => {
    expect(apTitleCase('the new state-of-the-art')).toBe('The New State-of-the-Art');
  });

  it('leaves an ALL-CAPS part of a hyphenated compound alone while stopword-testing the rest', () => {
    expect(apTitleCase('the HTTP-based approach')).toBe('The HTTP-Based Approach');
  });

  it('keeps exception words exactly as written, everywhere -- including first/last position', () => {
    expect(apTitleCase('use github for hosting', ['GitHub'])).toBe('Use GitHub for Hosting');
    expect(apTitleCase('github is great', ['GitHub'])).toBe('GitHub Is Great');
  });

  it('leaves an ALL-CAPS acronym alone', () => {
    expect(apTitleCase('call the API today')).toBe('Call the API Today');
  });

  it('is idempotent: re-titling an already-correct title changes nothing', () => {
    const once = apTitleCase('the quick brown fox jumps over the lazy dog');
    expect(apTitleCase(once)).toBe(once);
  });

  // A whole-word exception like 'e-commerce' must be honored, as $sentence already does. It was rewritten to 'E-Commerce'.
  it('preserves a whole-compound exception exactly as written, instead of title-casing each hyphen part', () => {
    expect(apTitleCase('the e-commerce platform', ['e-commerce'])).toBe('The e-commerce Platform');
  });

  it('still title-cases the same compound part-by-part when no whole-compound exception is given', () => {
    expect(apTitleCase('the e-commerce platform')).toBe('The E-Commerce Platform');
  });

  it('still supports a per-part exception inside a hyphenated compound (whole compound has no exception entry)', () => {
    expect(apTitleCase('the github-hosted runners are great', ['GitHub'])).toBe(
      'The GitHub-Hosted Runners Are Great'
    );
  });
});

// An exception with a space or a dot ('VS Code', 'Node.js') must work, even though words are split on those characters.
describe('phrase (multi-word / dotted) exceptions', () => {
  it('preserves a multi-word exception under $title', () => {
    expect(apTitleCase('deploy with vs code today', ['VS Code'])).toBe('Deploy With VS Code Today');
  });

  it('prefers the longest matching phrase', () => {
    expect(apTitleCase('use visual studio code here', ['VS Code', 'Visual Studio Code'])).toBe(
      'Use Visual Studio Code Here'
    );
  });

  // One exceptions array with both a single word ('GitHub') and a phrase ('VS Code'), and both must be honored.
  it('still honors single-word exceptions alongside a phrase list', () => {
    expect(apTitleCase('i use github and vs code daily', ['GitHub', 'VS Code'])).toBe(
      'I Use GitHub and VS Code Daily'
    );
  });
});

// A phrase exception counts as one word when deciding which word is first or last. Before, it was masked out, so its neighbor was treated as the last (or first) word.
describe('phrase exceptions and word position (#25610)', () => {
  it('does not promote the stopword before a TRAILING phrase to last-word capitalization', () => {
    // The old result was 'A Guide To Node.js'.
    expect(apTitleCase('a guide to Node.js', ['Node.js'])).toBe('A Guide to Node.js');
  });

  it('applies the same fix under Chicago, not just AP', () => {
    expect(chicagoTitleCase('a guide to Node.js', ['Node.js'])).toBe('A Guide to Node.js');
  });

  it('handles a phrase that is BOTH first and last, leaving the single real word mid-title', () => {
    // The old result was 'Node.js And VS Code'.
    expect(apTitleCase('Node.js and VS Code', ['Node.js', 'VS Code'])).toBe('Node.js and VS Code');
  });

  it('still capitalizes the real first and last words around a MIDDLE phrase', () => {
    // A phrase in the middle must not change which words are first and last.
    expect(apTitleCase('the VS Code guide', ['VS Code'])).toBe('The VS Code Guide');
    expect(apTitleCase('to VS Code up', ['VS Code'])).toBe('To VS Code Up');
  });

  it('keeps a LEADING phrase as-written without capitalizing the word after it as first', () => {
    // 'actions' is in the middle, so it is capitalized as an ordinary word.
    expect(apTitleCase('VS Code actions for teams', ['VS Code'])).toBe('VS Code Actions for Teams');
  });

  it('leaves single-word exceptions unaffected -- they resolve by lookup, not position', () => {
    // No phrases in `exceptions`.
    expect(apTitleCase('a guide to github', ['GitHub'])).toBe('A Guide to GitHub');
    expect(apTitleCase('github is great', ['GitHub'])).toBe('GitHub Is Great');
  });

  it('is idempotent for a leading and for a trailing phrase', () => {
    for (const [text, exceptions] of [
      ['a guide to Node.js', ['Node.js']],
      ['VS Code actions for teams', ['VS Code']],
      ['Node.js and VS Code', ['Node.js', 'VS Code']],
    ] as [string, string[]][]) {
      const once = apTitleCase(text, exceptions);
      expect(apTitleCase(once, exceptions)).toBe(once);
    }
  });
});

// Edge cases for phrase matching. The output must keep the same length, because `capitalization` relies on that to put inline code back.
describe('phrase exception tokenizer -- adversarial position and length cases', () => {
  it('matches a phrase at index 0', () => {
    expect(apTitleCase('VS Code rocks', ['VS Code'])).toBe('VS Code Rocks');
  });

  it('matches a phrase at the very end of the string', () => {
    expect(apTitleCase('we love VS Code', ['VS Code'])).toBe('We Love VS Code');
  });

  it('matches the same phrase twice in one string', () => {
    expect(apTitleCase('use VS Code and VS Code again', ['VS Code'])).toBe(
      'Use VS Code and VS Code Again'
    );
  });

  it('prefers the longer phrase when a shorter one overlaps it', () => {
    expect(apTitleCase('visual studio code rules', ['VS Code', 'Visual Studio Code'])).toBe(
      'Visual Studio Code Rules'
    );
  });

  it('lets the first-listed phrase claim the span when two overlapping phrases are the same length', () => {
    // 'ab c' and 'b cd' overlap in 'ab cd'. The first one wins.
    expect(apTitleCase('ab cd', ['ab c', 'b cd'])).toBe('ab cD');
  });

  it('matches a phrase adjacent to punctuation on both sides', () => {
    expect(apTitleCase('(VS Code) is here', ['VS Code'])).toBe('(VS Code) Is Here');
    expect(apTitleCase('we ship VS Code, always', ['VS Code'])).toBe('We Ship VS Code, Always');
  });

  it('normalizes casing when the input is ENTIRELY a phrase (no other word)', () => {
    expect(apTitleCase('vs code', ['VS Code'])).toBe('VS Code');
  });

  it('treats a phrase span as a hard token boundary -- a word never straddles it', () => {
    // 'xVS Codey' contains 'VS Code', so 'x' and 'y' are separate words and both are capitalized.
    expect(apTitleCase('xVS Codey', ['VS Code'])).toBe('XVS CodeY');
  });

  it('handles a phrase adjacent to a hyphen without splitting the phrase', () => {
    expect(apTitleCase('pre-VS Code setup', ['VS Code'])).toBe('Pre-VS Code Setup');
    expect(apTitleCase('a VS Code-based editor', ['VS Code'])).toBe('A VS Code-Based Editor');
  });

  it('copies a literal \\x01 through verbatim (the old placeholder character is no longer special)', () => {
    // \x01 separates words, so 'a' and 'b' are two words.
    expect(apTitleCase('a\x01b of c', ['VS Code'])).toBe('A\x01B of C');
    expect(apTitleCase('\x01VS Code\x01', ['VS Code'])).toBe('\x01VS Code\x01');
  });

  it("copies a literal \\0 through verbatim (capitalization.ts's inline-code placeholder)", () => {
    expect(apTitleCase('a\0b of c', ['VS Code'])).toBe('A\0B of C');
    expect(apTitleCase('\0VS Code\0', ['VS Code'])).toBe('\0VS Code\0');
  });

  it('returns empty input unchanged', () => {
    expect(apTitleCase('', ['VS Code'])).toBe('');
    expect(apTitleCase('', [])).toBe('');
  });

  it('returns separators-only input unchanged', () => {
    expect(apTitleCase('   ', ['VS Code'])).toBe('   ');
    expect(apTitleCase('---', ['VS Code'])).toBe('---');
    expect(apTitleCase('. . .', ['VS Code'])).toBe('. . .');
  });

  it('survives a degenerate bare-space exception entry', () => {
    // A single space counts as a phrase, so each space is its own token. The words keep their positions.
    expect(apTitleCase('the cat and the hat', [' '])).toBe('The Cat and the Hat');
  });

  it('survives a degenerate bare-dot exception entry', () => {
    expect(apTitleCase('node.js rocks', ['.'])).toBe('Node.Js Rocks');
  });

  it('matches regex metacharacters in an exception entry literally', () => {
    expect(apTitleCase('more a.b*c and text', ['a.b*c'])).toBe('More a.b*c and Text');
    // The unescaped pattern would have matched 'axbxxc', but this must not.
    expect(apTitleCase('axbxxc and more', ['a.b*c'])).toBe('Axbxxc and More');
  });

  it('is length-preserving for every phrase case above', () => {
    const cases: [string, string[]][] = [
      ['VS Code rocks', ['VS Code']],
      ['we love VS Code', ['VS Code']],
      ['use VS Code and VS Code again', ['VS Code']],
      ['visual studio code rules', ['VS Code', 'Visual Studio Code']],
      ['ab cd', ['ab c', 'b cd']],
      ['(VS Code) is here', ['VS Code']],
      ['vs code', ['VS Code']],
      ['xVS Codey', ['VS Code']],
      ['pre-VS Code setup', ['VS Code']],
      ['a\x01b of c', ['VS Code']],
      ['a\0b of c', ['VS Code']],
      ['', ['VS Code']],
      ['   ', ['VS Code']],
      ['the cat and the hat', [' ']],
      ['node.js rocks', ['.']],
      ['more a.b*c and text', ['a.b*c']],
      ['a guide to Node.js', ['Node.js']],
      ['Node.js and VS Code', ['Node.js', 'VS Code']],
    ];
    for (const [text, exceptions] of cases) {
      expect(apTitleCase(text, exceptions), `AP length for ${JSON.stringify(text)}`).toHaveLength(
        text.length
      );
      expect(
        chicagoTitleCase(text, exceptions),
        `Chicago length for ${JSON.stringify(text)}`
      ).toHaveLength(text.length);
    }
  });
});

describe('chicagoTitleCase', () => {
  it('lowercases a 7-letter preposition mid-title, unlike AP', () => {
    expect(chicagoTitleCase('walking through the park')).toBe('Walking through the Park');
  });

  it('still always capitalizes the first and last word', () => {
    expect(chicagoTitleCase('the cat and the hat')).toBe('The Cat and the Hat');
  });

  it('lowercases the same short stopwords AP does', () => {
    expect(chicagoTitleCase('the quick brown fox jumps over the lazy dog')).toBe(
      'The Quick Brown Fox Jumps Over the Lazy Dog'
    );
  });

  it('capitalizes each part of a hyphenated word', () => {
    expect(chicagoTitleCase('a well-known fact')).toBe('A Well-Known Fact');
  });

  it('lowercases a stopword part of a mid-title hyphenated compound (AP/Chicago style)', () => {
    expect(chicagoTitleCase('the editor-in-chief resigned today')).toBe(
      'The Editor-in-Chief Resigned Today'
    );
  });

  it('keeps exception words exactly as written', () => {
    expect(chicagoTitleCase('use github for hosting', ['GitHub'])).toBe('Use GitHub for Hosting');
  });

  it('leaves an ALL-CAPS acronym alone', () => {
    expect(chicagoTitleCase('call the API today')).toBe('Call the API Today');
  });
});

describe('isAllCapsWord', () => {
  it('is true for a 2+ letter all-uppercase word', () => {
    expect(isAllCapsWord('API')).toBe(true);
    expect(isAllCapsWord('HTML5')).toBe(true);
  });

  it('is false for a single letter, mixed case, or all-lowercase word', () => {
    expect(isAllCapsWord('I')).toBe(false);
    expect(isAllCapsWord('GitHub')).toBe(false);
    expect(isAllCapsWord('api')).toBe(false);
  });
});
