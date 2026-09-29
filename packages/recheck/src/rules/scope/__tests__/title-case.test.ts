import { describe, it, expect } from 'vitest';

import { apTitleCase, chicagoTitleCase, isAllCapsWord } from '../title-case.js';

type Row = [input: string, exceptions: string[], expected: string];

describe('apTitleCase', () => {
  // Every row must also be stable: re-titling the expected text changes nothing.
  it.each<Row>([
    [
      'the quick brown fox jumps over the lazy dog',
      [],
      'The Quick Brown Fox Jumps Over the Lazy Dog',
    ],
    ['the cat and the hat', [], 'The Cat and the Hat'],
    ['walking through the park', [], 'Walking Through the Park'], // AP only lowercases <= 3 letter prepositions
    ['cats and dogs living together', [], 'Cats and Dogs Living Together'],
    // hyphenated words
    ['a well-known fact', [], 'A Well-Known Fact'],
    ['the editor-in-chief resigned today', [], 'The Editor-in-Chief Resigned Today'],
    ['state-of-the-art technology arrives', [], 'State-of-the-Art Technology Arrives'],
    ['meet my mother-in-law today', [], 'Meet My Mother-in-Law Today'],
    ['the new state-of-the-art', [], 'The New State-of-the-Art'],
    ['the HTTP-based approach', [], 'The HTTP-Based Approach'],
    // exceptions and acronyms
    ['use github for hosting', ['GitHub'], 'Use GitHub for Hosting'],
    ['github is great', ['GitHub'], 'GitHub Is Great'],
    ['call the API today', [], 'Call the API Today'],
    ['the e-commerce platform', ['e-commerce'], 'The e-commerce Platform'],
    ['the e-commerce platform', [], 'The E-Commerce Platform'],
    ['the github-hosted runners are great', ['GitHub'], 'The GitHub-Hosted Runners Are Great'],
    // phrase (multi-word or dotted) exceptions
    ['deploy with vs code today', ['VS Code'], 'Deploy With VS Code Today'],
    [
      'use visual studio code here',
      ['VS Code', 'Visual Studio Code'],
      'Use Visual Studio Code Here',
    ],
    ['i use github and vs code daily', ['GitHub', 'VS Code'], 'I Use GitHub and VS Code Daily'],
    // a phrase counts as one word when deciding which word is first or last
    ['a guide to Node.js', ['Node.js'], 'A Guide to Node.js'],
    ['Node.js and VS Code', ['Node.js', 'VS Code'], 'Node.js and VS Code'],
    ['the VS Code guide', ['VS Code'], 'The VS Code Guide'],
    ['to VS Code up', ['VS Code'], 'To VS Code Up'],
    ['VS Code actions for teams', ['VS Code'], 'VS Code Actions for Teams'],
    ['a guide to github', ['GitHub'], 'A Guide to GitHub'],
    // phrase position and boundaries
    ['we love VS Code', ['VS Code'], 'We Love VS Code'],
    ['use VS Code and VS Code again', ['VS Code'], 'Use VS Code and VS Code Again'],
    ['ab cd', ['ab c', 'b cd'], 'ab cD'], // overlapping phrases of the same length: the first listed wins
    ['(VS Code) is here', ['VS Code'], '(VS Code) Is Here'],
    ['we ship VS Code, always', ['VS Code'], 'We Ship VS Code, Always'],
    ['vs code', ['VS Code'], 'VS Code'],
    ['xVS Codey', ['VS Code'], 'XVS CodeY'], // a phrase is a hard word boundary
    ['pre-VS Code setup', ['VS Code'], 'Pre-VS Code Setup'],
    ['a VS Code-based editor', ['VS Code'], 'A VS Code-Based Editor'],
    // control characters are ordinary separators; \0 is capitalization.ts's inline-code mask
    ['a\x01b of c', ['VS Code'], 'A\x01B of C'],
    ['\x01VS Code\x01', ['VS Code'], '\x01VS Code\x01'],
    ['a\0b of c', ['VS Code'], 'A\0B of C'],
    ['\0VS Code\0', ['VS Code'], '\0VS Code\0'],
    // degenerate input and exception entries
    ['', ['VS Code'], ''],
    ['   ', ['VS Code'], '   '],
    ['---', ['VS Code'], '---'],
    ['. . .', ['VS Code'], '. . .'],
    ['the cat and the hat', [' '], 'The Cat and the Hat'],
    ['node.js rocks', ['.'], 'Node.Js Rocks'],
    ['more a.b*c and text', ['a.b*c'], 'More a.b*c and Text'],
    ['axbxxc and more', ['a.b*c'], 'Axbxxc and More'], // regex metacharacters in an exception are literal
  ])('%j with %j', (input, exceptions, expected) => {
    const result = apTitleCase(input, exceptions);
    expect(result).toBe(expected);
    expect(apTitleCase(result, exceptions)).toBe(result);
    expect(result).toHaveLength(input.length); // capitalization.ts puts inline code back by offset
  });
});

describe('chicagoTitleCase', () => {
  it.each<Row>([
    ['walking through the park', [], 'Walking through the Park'], // unlike AP
    ['the cat and the hat', [], 'The Cat and the Hat'],
    [
      'the quick brown fox jumps over the lazy dog',
      [],
      'The Quick Brown Fox Jumps Over the Lazy Dog',
    ],
    ['a guide to Node.js', ['Node.js'], 'A Guide to Node.js'],
  ])('%j with %j', (input, exceptions, expected) => {
    expect(chicagoTitleCase(input, exceptions)).toBe(expected);
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
