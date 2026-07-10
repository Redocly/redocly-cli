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

  it('groups samples by operation and caps repeated identical shapes', async () => {
    const lines = Array.from({ length: 45 }, (_, i) =>
      exchange('GET', `http://api.example.com/users/${i + 1}`, undefined, { id: i + 1 })
    );
    lines.push(exchange('GET', 'http://api.example.com/orders', undefined, { orders: [] }));

    const samples = await collectTrafficSamples({
      trafficPath: writeTraffic(lines),
      format: 'auto',
    });

    expect([...samples.keys()].sort()).toEqual(['GET /orders', 'GET /users/{userId}']);
    expect(samples.get('GET /orders')).toHaveLength(1);
    expect(samples.get('GET /users/{userId}')).toHaveLength(2);
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
      perOperation: 2,
    });

    const payments = samples.get('POST /payments');
    expect(payments).toHaveLength(2);
    expect(payments?.some((sample) => sample.requestBody?.includes('cardNumber'))).toBe(true);
    expect(payments?.some((sample) => sample.requestBody?.includes('iban'))).toBe(true);
  });

  it('truncates long bodies', async () => {
    const lines = [exchange('POST', 'http://api.example.com/blobs', { data: 'x'.repeat(500) })];

    const samples = await collectTrafficSamples({
      trafficPath: writeTraffic(lines),
      format: 'auto',
      maxBodyChars: 50,
    });

    const blob = samples.get('POST /blobs')?.[0];
    expect(blob?.requestBody).toHaveLength(50 + '…[truncated]'.length);
    expect(blob?.requestBody?.endsWith('…[truncated]')).toBe(true);
  });

  it('ignores response data for statuses below 100', async () => {
    const neverReceived = JSON.stringify({
      request: {
        method: 'GET',
        url: 'http://api.example.com/users',
        headers: { host: 'api.example.com' },
      },
      response: {
        status: 0,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'aborted' }),
      },
    });

    const samples = await collectTrafficSamples({
      trafficPath: writeTraffic([neverReceived]),
      format: 'auto',
    });

    const users = samples.get('GET /users');
    expect(users).toHaveLength(1);
    expect(users?.[0].status).toBeUndefined();
    expect(users?.[0].responseBody).toBeUndefined();
    expect(users?.[0].responseContentType).toBeUndefined();
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

    expect([...samples.keys()]).toEqual(['GET /users']);
  });
});
