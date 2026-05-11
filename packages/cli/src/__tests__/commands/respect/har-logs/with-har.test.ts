import { createHarLog } from '../../../../commands/respect/har-logs/har-logs.js';
import { withHar } from '../../../../commands/respect/har-logs/with-har.js';

describe('withHar', () => {
  it('should preserve the original response status', async () => {
    const har = createHarLog({ version: '1.0.0' });
    const dispatcher = { on: vi.fn() };
    const originalResponse = new Response(JSON.stringify({ created: true }), {
      status: 201,
      statusText: 'Created',
      headers: { 'content-type': 'application/json' },
    });
    const baseFetch = vi.fn(async () => {
      return originalResponse;
    });

    const fetch = withHar(baseFetch as any, { har });
    const response = await fetch('https://example.com/resources', {
      method: 'POST',
      dispatcher,
    });

    expect(response).toBe(originalResponse);
    expect(response.status).toBe(201);
    expect(response.statusText).toBe('Created');
    expect(await response.json()).toEqual({ created: true });
    expect(har.log.entries[0].response.status).toBe(201);
  });

  it('should return a bodyless response for no-content statuses', async () => {
    const har = createHarLog({ version: '1.0.0' });
    const dispatcher = { on: vi.fn() };
    const originalResponse = new Response(null, {
      status: 204,
      statusText: 'No Content',
    });
    const baseFetch = vi.fn(async () => {
      return originalResponse;
    });

    const fetch = withHar(baseFetch as any, { har });
    const response = await fetch('https://example.com/resources', {
      method: 'POST',
      dispatcher,
    });

    expect(response).toBe(originalResponse);
    expect(response.status).toBe(204);
    expect(response.statusText).toBe('No Content');
    expect(await response.text()).toBe('');
    expect(har.log.entries[0].response.status).toBe(204);
  });
});
