import isConfigEnabled from './../index';

const createConfig = () => ({
  ruleA: true,
  ruleB: false,
  ruleC: 'on',
  ruleD: 'off',
});

describe('isConfigEnabled', () => {
  test('', () => expect(isConfigEnabled(createConfig(), 'ruleA')).toEqual(true));
  test('', () => expect(isConfigEnabled(createConfig(), 'ruleB')).toEqual(false));
  test('', () => expect(isConfigEnabled(createConfig(), 'ruleC')).toEqual(true));
  test('', () => expect(isConfigEnabled(createConfig(), 'ruleD')).toEqual(false));
  test('', () => expect(isConfigEnabled(createConfig(), 'ruleE')).toEqual(true));
});