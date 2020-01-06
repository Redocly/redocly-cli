import { matchesJsonSchemaType, isUrl, isGlobalUrl, getClosestString } from '../index';

describe('isUrl', () => {
  test('https valid url', () => {
    expect(isUrl('https://redoc.ly')).toEqual(true);
    expect(isGlobalUrl('https://redoc.ly')).toEqual(true);
  });

  test('http valid url', () => {
    expect(isUrl('http://redoc.ly')).toEqual(true);
    expect(isGlobalUrl('http://redoc.ly')).toEqual(true);
  });

  test('https valid url with query params', () => {
    expect(isUrl('https://redoc.ly/index.php?some_param=21313&other=false')).toEqual(true);
    expect(isGlobalUrl('https://redoc.ly/index.php?some_param=21313&other=false')).toEqual(true);
  });

  test('https valid url with custom port', () => {
    expect(isUrl('https://redoc.ly:443')).toEqual(true);
    expect(isGlobalUrl('https://redoc.ly:443')).toEqual(true);
  });

  test('invalid url', () => {
    expect(isUrl('not-a-valid-site:21')).toEqual(false);
    expect(isGlobalUrl('not-a-valid-site:21')).toEqual(false);
  });

  test('url without protocol', () => {
    expect(isUrl('site.com')).toEqual(true);
    expect(isGlobalUrl('site.com')).toEqual(true);
  });
});

describe('matchesJsonSchemaType', () => {
  test('string', () => {
    expect(matchesJsonSchemaType('test', 'string')).toEqual(true);
    expect(matchesJsonSchemaType(35, 'string')).toEqual(false);
  });

  test('', () => {
    expect(matchesJsonSchemaType(1, 'integer')).toEqual(true);
    expect(matchesJsonSchemaType(1.5, 'integer')).toEqual(false);
    expect(matchesJsonSchemaType('string', 'integer')).toEqual(false);
  });

  test('', () => {
    expect(matchesJsonSchemaType(1, 'number')).toEqual(true);
    expect(matchesJsonSchemaType(1.5, 'number')).toEqual(true);
    expect(matchesJsonSchemaType({}, 'number')).toEqual(false);
  });

  test('', () => {
    expect(matchesJsonSchemaType(true, 'boolean')).toEqual(true);
    expect(matchesJsonSchemaType(false, 'boolean')).toEqual(true);
    expect(matchesJsonSchemaType(25, 'boolean')).toEqual(false);
  });

  test('', () => {
    expect(matchesJsonSchemaType(null, 'null')).toEqual(true);
    expect(matchesJsonSchemaType(0, 'null')).toEqual(false);
    expect(matchesJsonSchemaType('', 'null')).toEqual(false);
    expect(matchesJsonSchemaType({}, 'null')).toEqual(false);
  });

  test('', () => {
    expect(matchesJsonSchemaType({}, 'object')).toEqual(true);
    expect(matchesJsonSchemaType([], 'object')).toEqual(false);
    expect(matchesJsonSchemaType(null, 'object')).toEqual(false);
    expect(matchesJsonSchemaType('string', 'object')).toEqual(false);
  });

  test('', () => {
    expect(matchesJsonSchemaType([], 'array')).toEqual(true);
    expect(matchesJsonSchemaType({}, 'array')).toEqual(false);
    expect(matchesJsonSchemaType(null, 'array')).toEqual(false);
    expect(matchesJsonSchemaType('string', 'array')).toEqual(false);
  });
});

describe('getClosestString', () => {
  const names = ['apple', 'banana', 'apple inc'];

  expect(getClosestString('apple nc', names)).toEqual('apple inc');
  expect(getClosestString('apple', names)).toEqual('apple');
  expect(getClosestString('Apple', names)).toEqual('apple');
  expect(getClosestString('firefox', names)).toEqual(null);
  expect(getClosestString('firefox', [])).toEqual(null);
});
