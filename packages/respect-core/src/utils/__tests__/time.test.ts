import { getExecutionTime } from '../time';

describe('getExecutionTime', () => {
  it('returns a string with ms', () => {
    expect(getExecutionTime(0)).toMatch(/ms/);
  });

  it('returns a string with <test>ms', () => {
    expect(getExecutionTime(40)).toMatch(/<test>ms/);
  });

  it('returns a string with ms with different NODE_ENV', () => {
    // set NODE_ENV to test
    process.env.NODE_ENV = 'development';
    expect(getExecutionTime(10)).toMatch(/ms/);
    // reset NODE_ENV
    process.env.NODE_ENV = 'development';
  });
});
