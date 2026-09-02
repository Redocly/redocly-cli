import { describe, expect, it } from 'vitest';

import { splitSentences } from '../sentences.js';

const texts = (input: string) => splitSentences(input).map((s) => s.text);

describe('splitSentences', () => {
  it('splits on terminal punctuation followed by a capital', () => {
    expect(texts('First one. Second one! Third one?')).toEqual([
      'First one.',
      'Second one!',
      'Third one?',
    ]);
  });

  it('does not split on common abbreviations', () => {
    expect(texts('Use flags, e.g. verbose mode. Then run it.')).toEqual([
      'Use flags, e.g. verbose mode.',
      'Then run it.',
    ]);
    expect(texts('It follows the U.S. Foreign Corrupt Practices Act.')).toEqual([
      'It follows the U.S. Foreign Corrupt Practices Act.',
    ]);
  });

  it('does not split inside decimals or versions', () => {
    expect(texts('Install v1.2.3 first. Then continue.')).toEqual([
      'Install v1.2.3 first.',
      'Then continue.',
    ]);
  });

  it('does not split inside inline code spans', () => {
    expect(texts('Run `a.b. C()` now. Done.')).toEqual(['Run `a.b. C()` now.', 'Done.']);
  });

  it('returns correct offsets', () => {
    const [first, second] = splitSentences('One two. Three four.');
    expect(first.start).toBe(0);
    expect(first.end).toBe(8);
    expect(second.start).toBe(9);
  });

  it('treats a no-terminator string as one sentence', () => {
    expect(texts('no terminator here')).toEqual(['no terminator here']);
  });

  it('splits at a newline followed by continuation indentation', () => {
    // A list item's continuation lines carry the item's indent, so the
    // character right after the newline is a space, not the capital letter.
    expect(texts('Installs into its own schema.\n     The DDL ships in a migration.')).toEqual([
      'Installs into its own schema.',
      'The DDL ships in a migration.',
    ]);
  });

  it('splits when multiple spaces follow the terminator', () => {
    expect(texts('First one.  Second one.')).toEqual(['First one.', 'Second one.']);
  });

  it('splits when the next sentence opens with emphasis markers', () => {
    expect(texts('The field maps here. **Apigee X** supports multiple URLs.')).toEqual([
      'The field maps here.',
      '**Apigee X** supports multiple URLs.',
    ]);
    expect(texts('Stop here. _Then_ continue.')).toEqual(['Stop here.', '_Then_ continue.']);
  });

  it('does not split before lowercase emphasis or code-like identifiers', () => {
    expect(texts('Pass extras. *args holds them and _private too.')).toEqual([
      'Pass extras. *args holds them and _private too.',
    ]);
    expect(texts('Call it. __init__ runs first here.')).toEqual([
      'Call it. __init__ runs first here.',
    ]);
  });

  it('keeps a leading escape backslash in span text', () => {
    expect(texts('\\*literal star here. Next sentence.')).toEqual([
      '\\*literal star here.',
      'Next sentence.',
    ]);
  });

  it('splits when the terminator sits inside closing emphasis', () => {
    expect(texts('**CONDITIONALLY REQUIRED.** Provide either href or page.')).toEqual([
      '**CONDITIONALLY REQUIRED.**',
      'Provide either href or page.',
    ]);
  });

  it('splits after a parenthetical that closes with its terminator inside', () => {
    expect(texts('(See the guide.) Then continue.')).toEqual([
      '(See the guide.)',
      'Then continue.',
    ]);
  });

  it('treats a markdown hard-break backslash before the newline as whitespace', () => {
    expect(texts('Create the folder. \\\nPlace the files inside.')).toEqual([
      'Create the folder.',
      'Place the files inside.',
    ]);
    expect(texts('Create the folder.\\\nPlace the files inside.')).toEqual([
      'Create the folder.',
      'Place the files inside.',
    ]);
  });

  it('does not split before a lowercase parenthetical or quote', () => {
    expect(texts('Fill in the field. (textarea) holds the rest of it.')).toEqual([
      'Fill in the field. (textarea) holds the rest of it.',
    ]);
    expect(texts('Name it. "lowercase quote" stays attached to this.')).toEqual([
      'Name it. "lowercase quote" stays attached to this.',
    ]);
  });

  it('still splits before wrapped text that starts like a sentence', () => {
    expect(texts('Stop here. (See the guide.) Then continue.')).toEqual([
      'Stop here.',
      '(See the guide.)',
      'Then continue.',
    ]);
  });

  it('splits at blockquote continuation markers', () => {
    expect(texts('First quoted sentence ends.\n> Second quoted sentence here.')).toEqual([
      'First quoted sentence ends.',
      'Second quoted sentence here.',
    ]);
  });

  it('treats a blank quote line as a paragraph break even without a terminator', () => {
    expect(
      texts('To Whom It May Concern:\n>\n> Your Company Name has contracted Rebilly.')
    ).toEqual(['To Whom It May Concern:', 'Your Company Name has contracted Rebilly.']);
  });

  it('treats a blank line as a sentence boundary even without a terminator', () => {
    expect(texts('First paragraph has no terminator\n\nSecond paragraph stands alone.')).toEqual([
      'First paragraph has no terminator',
      'Second paragraph stands alone.',
    ]);
  });

  it('splits CRLF-separated sentences the same as the LF twin', () => {
    expect(texts('First one.\r\nSecond one.')).toEqual(texts('First one.\nSecond one.'));
    expect(texts('First one.\r\nSecond one.')).toEqual(['First one.', 'Second one.']);
  });

  it('treats a lone CR as sentence-boundary whitespace', () => {
    expect(texts('First one.\rSecond one.')).toEqual(['First one.', 'Second one.']);
  });

  it('does not split inside link text', () => {
    expect(texts('See [Step 1. Configure](#step-1) for details. Then continue.')).toEqual([
      'See [Step 1. Configure](#step-1) for details.',
      'Then continue.',
    ]);
  });

  it('does not split inside a link destination', () => {
    expect(texts('Read the [guide](./a.md#b. C) first. Then upgrade.')).toEqual([
      'Read the [guide](./a.md#b. C) first.',
      'Then upgrade.',
    ]);
  });

  it('does not split inside a destination with balanced parens', () => {
    expect(
      texts('See [Step 1. Wiki](https://en.wikipedia.org/wiki/Foo_(bar)) for details. Then go.')
    ).toEqual([
      'See [Step 1. Wiki](https://en.wikipedia.org/wiki/Foo_(bar)) for details.',
      'Then go.',
    ]);
  });

  it('does not split inside reference-style link text', () => {
    expect(texts('See [Step 1. Configure][cfg] for details. Then continue.')).toEqual([
      'See [Step 1. Configure][cfg] for details.',
      'Then continue.',
    ]);
  });

  it('does not split inside image alt text', () => {
    expect(texts('The ![Fig 1. Flow](a.png) diagram helps. Read on.')).toEqual([
      'The ![Fig 1. Flow](a.png) diagram helps.',
      'Read on.',
    ]);
  });

  it('still splits on a boundary that follows a complete link', () => {
    expect(texts('See the [guide](#g). Then continue.')).toEqual([
      'See the [guide](#g).',
      'Then continue.',
    ]);
  });

  it('an unclosed bracket does not swallow the rest of the text', () => {
    expect(texts('An open [bracket here. Then a new sentence.')).toEqual([
      'An open [bracket here.',
      'Then a new sentence.',
    ]);
  });

  it('does not split after a leading ordinal enumerator', () => {
    expect(texts('1. Place the sensor. Then continue.')).toEqual([
      '1. Place the sensor.',
      'Then continue.',
    ]);
  });

  it('does not split after a strong-wrapped leading ordinal', () => {
    expect(texts('**1. Place all assets inside the folder.**')).toEqual([
      '**1. Place all assets inside the folder.**',
    ]);
  });

  it('does not split after a mid-line ordinal opened by strong markers', () => {
    expect(texts('Intro: **2. Configure it** now. More here.')).toEqual([
      'Intro: **2. Configure it** now.',
      'More here.',
    ]);
  });

  it('does not split after an indented or underscore-wrapped ordinal', () => {
    expect(texts('  3. Indented step. Next part.')).toEqual(['3. Indented step.', 'Next part.']);
    expect(texts('__4. Strong underscore title.__')).toEqual(['__4. Strong underscore title.__']);
  });

  it('still splits after a plain mid-sentence number', () => {
    expect(texts('The answer is 42. Next sentence.')).toEqual([
      'The answer is 42.',
      'Next sentence.',
    ]);
  });

  it('still splits after versions ending a sentence and handles decimals', () => {
    expect(texts('Version 1.2.3 works. Next.')).toEqual(['Version 1.2.3 works.', 'Next.']);
  });

  it('does not treat an intraword underscore before digits as an enumerator opener', () => {
    expect(texts('Use var x_1. Then rerun.')).toEqual(['Use var x_1.', 'Then rerun.']);
  });

  it('keeps offsets correct across a skipped ordinal boundary', () => {
    const input = '1. Place the sensor. Then continue.';
    const [first, second] = splitSentences(input);
    expect(input.slice(first.start, first.end)).toBe('1. Place the sensor.');
    expect(input.slice(second.start, second.end)).toBe('Then continue.');
  });

  it('keeps offsets addressing the original text and leaks no CR into sentence text', () => {
    const input = 'One two.\r\nThree four.';
    const [first, second] = splitSentences(input);
    expect(first.text).toBe('One two.');
    expect(first.start).toBe(0);
    expect(first.end).toBe(8);
    expect(second.text).toBe('Three four.');
    expect(input.slice(second.start, second.end)).toBe('Three four.');
  });
});
