import { addHeaders } from '../../../../../commands/respect/har-logs/helpers/add-headers.js';

describe('addHeaders', () => {
  it('should add headers to an existing Headers object', () => {
    const oldHeaders = new Headers({ 'Content-Type': 'application/json' });
    const newHeaders = { Authorization: 'Bearer 1234567890' };
    const result = addHeaders(oldHeaders, newHeaders);
    expect(result.get('Authorization')).toBe('Bearer 1234567890');
  });

  it('should add headers to an existing plain object', () => {
    const oldHeaders = { 'Content-Type': 'application/json' };
    const newHeaders = { Authorization: 'Bearer 1234567890' };
    const result = addHeaders(oldHeaders, newHeaders);
    expect(result.Authorization).toBe('Bearer 1234567890');
  });

  it('should return new headers if old headers are not provided', () => {
    const newHeaders = { Authorization: 'Bearer 1234567890' };
    const result = addHeaders(null, newHeaders);
    expect(result.Authorization).toBe('Bearer 1234567890');
  });
});
