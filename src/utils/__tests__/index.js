import { matchesJsonSchemaType } from '../index';

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
