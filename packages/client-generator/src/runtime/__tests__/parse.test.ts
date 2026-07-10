import { parse, readError } from '../parse.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('parse', () => {
  it('void and 204 return undefined', async () => {
    expect(await parse(json({ a: 1 }), 'void')).toBeUndefined();
    expect(await parse(new Response(null, { status: 204 }), 'json')).toBeUndefined();
  });

  it('explicit kinds decode accordingly', async () => {
    expect(await parse(json({ a: 1 }), 'json')).toEqual({ a: 1 });
    expect(await parse(new Response('hi'), 'text')).toBe('hi');
    expect(await parse(new Response('x'), 'blob')).toBeInstanceOf(Blob);
    expect(await parse(new Response('x'), 'arrayBuffer')).toBeInstanceOf(ArrayBuffer);
    const stream = await parse(new Response('x'), 'stream');
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('reads multipart bodies as FormData', async () => {
    const fd = new FormData();
    fd.append('a', '1');
    const out = (await parse(new Response(fd), 'formData')) as FormData;
    expect(out).toBeInstanceOf(FormData);
    expect(out.get('a')).toBe('1');
  });

  it('auto negotiates by content-type: json, then text/*, then blob', async () => {
    expect(await parse(json({ a: 1 }), 'auto')).toEqual({ a: 1 });
    expect(
      await parse(new Response('plain', { headers: { 'content-type': 'text/plain' } }), 'auto')
    ).toBe('plain');
    expect(
      await parse(
        new Response('bin', { headers: { 'content-type': 'application/octet-stream' } }),
        'auto'
      )
    ).toBeInstanceOf(Blob);
    // No content-type header at all → Blob fallback.
    const headerless = new Response('x');
    headerless.headers.delete('content-type');
    expect(await parse(headerless, 'auto')).toBeInstanceOf(Blob);
  });

  it('auto matches content-type case-insensitively (Text/Plain, application/JSON)', async () => {
    expect(
      await parse(new Response('plain', { headers: { 'content-type': 'Text/Plain' } }), 'auto')
    ).toBe('plain');
    expect(
      await parse(
        new Response('{"a":1}', { headers: { 'content-type': 'application/JSON' } }),
        'auto'
      )
    ).toEqual({ a: 1 });
  });
});

describe('readError', () => {
  it('reads a JSON error body, falls back to text', async () => {
    expect(await readError(json({ title: 'bad' }, 400))).toEqual({ title: 'bad' });
    expect(
      await readError(
        new Response('oops', { status: 500, headers: { 'content-type': 'text/plain' } })
      )
    ).toBe('oops');
  });

  it('returns undefined when the declared-JSON body does not parse', async () => {
    const broken = new Response('not-json', {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
    expect(await readError(broken)).toBeUndefined();
  });

  it('returns undefined on a content-type-less body whose read fails', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('boom'));
      },
    });
    const failing = new Response(body, { status: 500 });
    failing.headers.delete('content-type');
    expect(await readError(failing)).toBeUndefined();
  });
});
