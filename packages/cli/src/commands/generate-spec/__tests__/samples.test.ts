import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { collectTrafficSamples } from '../samples.js';

function exchange(method: string, url: string, requestBody?: object, responseBody?: object) {
  return JSON.stringify({
    request: {
      method,
      url,
      headers: {
        host: 'api.example.com',
        ...(requestBody ? { 'content-type': 'application/json' } : {}),
      },
      ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
    },
    response: {
      status: 200,
      headers: { 'content-type': 'application/json' },
      ...(responseBody ? { body: JSON.stringify(responseBody) } : {}),
    },
  });
}

describe('collectTrafficSamples', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'generate-spec-samples-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeTraffic(lines: string[]): string {
    const file = join(dir, 'traffic.ndjson');
    writeFileSync(file, lines.join('\n'));
    return file;
  }

  it('represents every operation even when one endpoint dominates the traffic', async () => {
    const lines = Array.from({ length: 45 }, (_, i) =>
      exchange('GET', `http://api.example.com/users/${i + 1}`, undefined, { id: i + 1 })
    );
    lines.push(exchange('GET', 'http://api.example.com/orders', undefined, { orders: [] }));

    const samples = await collectTrafficSamples({
      trafficPath: writeTraffic(lines),
      format: 'auto',
    });

    expect(samples.some((sample) => sample.path === '/orders')).toBe(true);
    expect(samples.filter((sample) => sample.path.startsWith('/users/'))).toHaveLength(2);
  });

  it('keeps samples of each observed body shape and fills groups round-robin', async () => {
    const lines = [
      exchange('POST', 'http://api.example.com/payments', { type: 'card', cardNumber: '41' }),
      exchange('POST', 'http://api.example.com/payments', { type: 'card', cardNumber: '55' }),
      exchange('POST', 'http://api.example.com/payments', { type: 'bank', iban: 'DE' }),
      exchange('POST', 'http://api.example.com/payments', { type: 'bank', iban: 'FR' }),
    ];

    const samples = await collectTrafficSamples({
      trafficPath: writeTraffic(lines),
      format: 'auto',
      total: 2,
    });

    expect(samples).toHaveLength(2);
    expect(samples.some((sample) => sample.requestBody?.includes('cardNumber'))).toBe(true);
    expect(samples.some((sample) => sample.requestBody?.includes('iban'))).toBe(true);
  });

  it('truncates long bodies', async () => {
    const lines = [exchange('POST', 'http://api.example.com/blobs', { data: 'x'.repeat(500) })];

    const samples = await collectTrafficSamples({
      trafficPath: writeTraffic(lines),
      format: 'auto',
      maxBodyChars: 50,
    });

    expect(samples[0].requestBody).toHaveLength(50 + '…[truncated]'.length);
    expect(samples[0].requestBody?.endsWith('…[truncated]')).toBe(true);
  });

  it('ignores exchanges with unsupported HTTP methods', async () => {
    const lines = [
      exchange('CONNECT', 'http://api.example.com/tunnel'),
      exchange('GET', 'http://api.example.com/users'),
    ];

    const samples = await collectTrafficSamples({
      trafficPath: writeTraffic(lines),
      format: 'auto',
    });

    expect(samples).toHaveLength(1);
    expect(samples[0].method).toBe('GET');
  });
});
