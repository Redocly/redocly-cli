import { cleanColors } from '../clean-colors';

describe('cleanColors', () => {
  it('should remove ANSI color codes from the input string', () => {
    const input = '\x1b[31mThis is red text\x1b[0m and this is normal text';
    const expectedOutput = 'This is red text and this is normal text';
    expect(cleanColors(input)).toBe(expectedOutput);
  });

  it('should return the same string if there are no ANSI color codes', () => {
    const input = 'This is a normal text';
    expect(cleanColors(input)).toBe(input);
  });

  it('should handle empty strings', () => {
    const input = '';
    expect(cleanColors(input)).toBe(input);
  });

  it('should handle strings with only ANSI color codes', () => {
    const input = '\x1b[31m\x1b[0m';
    const expectedOutput = '';
    expect(cleanColors(input)).toBe(expectedOutput);
  });
});
