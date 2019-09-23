import { matchesJsonSchemaType, isUrl } from '../index';

describe('isUrl', () => {
  test('https valid url', () => {
    expect(isUrl('https://redoc.ly')).toEqual(true);
  });

  test('http valid url', () => {
    expect(isUrl('http://redoc.ly')).toEqual(true);
  });

  test('https valid url with query params', () => {
    expect(isUrl('https://redoc.ly/index.php?some_param=21313&other=false')).toEqual(true);
  });

  test('https valid url with custom port', () => {
    expect(isUrl('https://redoc.ly:443')).toEqual(true);
  });

  test('invalid url', () => {
    expect(isUrl('not-a-valid-site:21')).toEqual(false);
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
