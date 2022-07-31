import {
  matchesJsonSchemaType,
} from '../utils';

describe('matches-json-schema-type', () => {
  it('should report true on any type', () => {
    const results = matchesJsonSchemaType(123, 'any', false);
    expect(results).toBe(true);
  });

  it('should report true on a null value with nullable type', () => {
    const results = matchesJsonSchemaType(null, 'string', true);
    expect(results).toBe(true);
  });

  it('should report true on a value and type integer', () => {
    const results = matchesJsonSchemaType(123, 'integer', false);
    expect(results).toBe(true);
  });

  it('should report false when the value is not integer and type is integer', () => {
    const results = matchesJsonSchemaType(3.14, 'integer', false);
    expect(results).toBe(false);
  });

  it('should report true when the value is a number and type is number', () => {
    const results = matchesJsonSchemaType(3.14, 'number', false);
    expect(results).toBe(true);
  });

  it('should report true when the value is an integer and type is number', () => {
    const results = matchesJsonSchemaType(3, 'number', false);
    expect(results).toBe(true);
  });

  it('should report true when the value is true and type is boolean', () => {
    const results = matchesJsonSchemaType(true, 'boolean', false);
    expect(results).toBe(true);
  });

  it('should report true when the value is false and type is boolean', () => {
    const results = matchesJsonSchemaType(false, 'boolean', false);
    expect(results).toBe(true);
  });

  it('should report true when the value is a string and type is boolean', () => {
    const results = matchesJsonSchemaType('test', 'boolean', false);
    expect(results).toBe(false);
  });

  it('should report true on an array value with array type', () => {
    const results = matchesJsonSchemaType(['foo', 'bar'], 'array', false);
    expect(results).toBe(true);
  });

  it('should report false on an array value with object type', () => {
    const results = matchesJsonSchemaType(['foo', 'bar'], 'object', false);
    expect(results).toBe(false);
  });

  it('should report true on an object value with object type', () => {
    const car = {type:"Fiat", model:"500", color:"white"};
    const results = matchesJsonSchemaType(car, 'object', true);
    expect(results).toBe(true);
  });

  it('should report false on an object value with array type', () => {
    const car = {type:"Fiat", model:"500", color:"white"};
    const results = matchesJsonSchemaType(car, 'array', true);
    expect(results).toBe(false);
  });

});
