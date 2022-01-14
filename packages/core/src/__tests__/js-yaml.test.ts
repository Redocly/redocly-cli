import { parseYaml, stringifyYaml } from '../js-yaml';

const yaml = `
  emptyValue:
  spaces in keys: spaces in keys
  numberString: '0123456789'
  number: 1000
  decimal: 12.34
  boolean: true
  date: 2020-01-01
  array:
    - 1
    - 2
  object:
    key1: 1
    key2: 2
`;

const jsObject = {
  emptyValue: null,
  'spaces in keys': 'spaces in keys',
  numberString: '0123456789',
  number: 1000,
  decimal: 12.34,
  boolean: true,
  date: '2020-01-01',
  array: [1, 2],
  object: { key1: 1, key2: 2 },
};

describe('js-yaml', () => {
  test('parseYaml', () => {
    expect(parseYaml(yaml)).toEqual(jsObject);
  });

  test('parse and stringify', () => {
    expect(parseYaml(stringifyYaml(jsObject))).toEqual(jsObject);
  });

  test('should throw an error for unsupported types', () => {
    expect(() => stringifyYaml({ date: new Date() }))
      .toThrow('unacceptable kind of an object to dump [object Date]');

    expect(() => stringifyYaml({ foo: () => {} }))
      .toThrow('unacceptable kind of an object to dump [object Function]');
  });
});
