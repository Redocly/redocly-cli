import { NotSupportedError } from '../errors.js';

describe('NotSupportedError', () => {
  it('is an instance of Error and exposes the given message', () => {
    const err = new NotSupportedError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NotSupportedError);
    expect(err.message).toBe('boom');
  });

  it('sets name to "NotSupportedError"', () => {
    const err = new NotSupportedError('x');
    expect(err.name).toBe('NotSupportedError');
  });
});
