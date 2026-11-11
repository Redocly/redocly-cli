import { resolveContentByType } from '../resolve-content-by-type.js';

describe('resolveContentByType', () => {
  it('should return undefined when content is undefined', () => {
    expect(resolveContentByType(undefined, 'application/json')).toBeUndefined();
  });

  it('should return exact match by content type', () => {
    const content = {
      'application/json': { schema: { type: 'object' } },
      'text/plain': { schema: { type: 'string' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
  });

  it('should match */* wildcard pattern', () => {
    const content = {
      '*/*': { schema: { type: 'string' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'string' },
    });
    expect(resolveContentByType(content, 'text/plain')).toEqual({
      schema: { type: 'string' },
    });
  });

  it('should match type/* wildcard pattern', () => {
    const content = {
      'application/*': { schema: { type: 'object' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
    expect(resolveContentByType(content, 'application/xml')).toEqual({
      schema: { type: 'object' },
    });
    expect(resolveContentByType(content, 'text/plain')).toBeUndefined();
  });

  it('should prefer exact match over wildcard', () => {
    const content = {
      'application/json': { schema: { type: 'object' } },
      '*/*': { schema: { type: 'string' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
  });

  it('should return undefined when no pattern matches', () => {
    const content = {
      'application/json': { schema: { type: 'object' } },
      'text/*': { schema: { type: 'string' } },
    };
    expect(resolveContentByType(content, 'image/png')).toBeUndefined();
  });

  it('should return first matching wildcard when multiple wildcards match', () => {
    const content = {
      'application/*': { schema: { type: 'object' } },
      '*/*': { schema: { type: 'string' } },
    };
    const result = resolveContentByType(content, 'application/json');
    expect(result).toEqual({ schema: { type: 'object' } });
  });

  it('should match */subtype wildcard pattern', () => {
    const content = {
      '*/json': { schema: { type: 'object' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
    expect(resolveContentByType(content, 'text/json')).toEqual({
      schema: { type: 'object' },
    });
    expect(resolveContentByType(content, 'application/xml')).toBeUndefined();
  });

  it('should match content type case-insensitively', () => {
    const content = {
      'Application/JSON': { schema: { type: 'object' } },
    };
    expect(resolveContentByType(content, 'application/json')).toEqual({
      schema: { type: 'object' },
    });
  });
});
