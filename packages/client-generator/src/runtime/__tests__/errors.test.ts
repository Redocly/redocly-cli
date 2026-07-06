import { ApiError, abortError } from '../errors.js';

describe('ApiError', () => {
  it('carries url/status/statusText/body and a readable message', () => {
    const err = new ApiError('https://x/api', 404, 'Not Found', { title: 'gone' });
    expect(err).toBeInstanceOf(Error);
    expect(err.url).toBe('https://x/api');
    expect(err.status).toBe(404);
    expect(err.statusText).toBe('Not Found');
    expect(err.body).toEqual({ title: 'gone' });
    expect(err.message).toContain('404');
    expect(err.name).toBe('ApiError');
  });
});

describe('abortError', () => {
  it('returns the signal reason when it is an Error', () => {
    const controller = new AbortController();
    const reason = new Error('caller reason');
    controller.abort(reason);
    expect(abortError(controller.signal)).toBe(reason);
  });

  it('falls back to a DOMException AbortError otherwise', () => {
    const controller = new AbortController();
    controller.abort('a string reason');
    const err = abortError(controller.signal);
    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe('AbortError');
  });
});
