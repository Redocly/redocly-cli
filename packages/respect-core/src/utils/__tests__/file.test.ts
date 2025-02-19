import { isTestFile } from '../file';

describe('isTestFile', () => {
  const validDocument = {
    arazzo: '1.0.1',
  };

  const notValidDocument = {
    openapi: '1.0.0',
  };

  it('should return true for .yml', () => {
    expect(isTestFile('test.yml', validDocument)).toBe(true);
  });

  it('should return true for .yaml', () => {
    expect(isTestFile('test.yaml', validDocument)).toBe(true);
  });

  it('should return true for .YML', () => {
    expect(isTestFile('test.YML', validDocument)).toBe(true);
  });

  it('should return true for test.YAML', () => {
    expect(isTestFile('test.YAML', validDocument)).toBe(true);
  });

  it('should return false for test.json', () => {
    expect(isTestFile('test.json', validDocument)).toBe(true);
  });

  it('should return false for .js', () => {
    expect(isTestFile('test.js', validDocument)).toBe(false);
  });

  it('should return false for not valid arazzo description', () => {
    expect(isTestFile('test.yaml', notValidDocument)).toBe(false);
  });
});
