import { isParameterWithoutIn, isParameterWithIn } from '../../context-parser/index.js';

describe('isParameterWithoutIn', () => {
  it('should return true if the parameter is not a parameter with in', () => {
    const parameter = { name: 'test', value: 'test' };
    expect(isParameterWithoutIn(parameter)).toBe(true);
  });

  it('should return false if the parameter is a parameter with in', () => {
    const parameter = { name: 'test', value: 'test', in: 'header' };
    expect(isParameterWithoutIn(parameter)).toBe(false);
  });

  it('should return false if the parameter is not a parameter', () => {
    const parameter = 'test';
    expect(isParameterWithoutIn(parameter)).toBe(false);
  });
});

describe('isParameterWithIn', () => {
  it('should return true if the parameter is a parameter with in', () => {
    const parameter = { name: 'test', value: 'test', in: 'header' };
    expect(isParameterWithIn(parameter)).toBe(true);
  });

  it('should return false if the parameter is not a parameter', () => {
    const parameter = 'test';
    expect(isParameterWithIn(parameter)).toBe(false);
  });
});
