import { isJSON } from '../is-json.js';

describe('isJSON', () => {
  it('should return true if the string is a valid JSON', () => {
    expect(isJSON('{"key": "value"}')).toBe(true);
  });

  it('should return false if the string is not a valid JSON', () => {
    expect(isJSON('not a json')).toBe(false);
  });
});
