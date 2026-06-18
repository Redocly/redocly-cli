import { outdent } from 'outdent';

import { parseYamlToDocument } from '../../__tests__/utils.js';
import { resolveDocument, BaseResolver } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { Oas3Types } from '../types/oas3.js';
import { readFileFromUrl } from '../utils/read-file-from-url.js';

function makeFetchMock(hops: Array<{ status: number; location?: string }>) {
  let callIndex = 0;
  return vi.fn(() => {
    const { status, location } = hops[callIndex++];
    return Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      headers: { get: (name: string) => (name === 'location' ? (location ?? null) : null) },
      text: () => Promise.resolve(''),
    });
  });
}

describe('resolve http-headers security: redirect header leak', () => {
  it('should not send credentials to a cross-origin redirect target', async () => {
    const fetchMock = makeFetchMock([
      { status: 302, location: 'https://evil.com/stolen' },
      { status: 200 },
    ]);

    await readFileFromUrl('https://trusted.com/spec.yaml', {
      customFetch: fetchMock,
      headers: [{ name: 'X-Secret-Token', matches: 'trusted.com/**', value: 'secret' }],
    });

    expect(fetchMock).toBeCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://trusted.com/spec.yaml', {
      headers: { 'X-Secret-Token': 'secret' },
      redirect: 'manual',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://evil.com/stolen', {
      headers: {},
      redirect: 'manual',
    });
  });

  it('should keep credentials on a same-glob redirect', async () => {
    const fetchMock = makeFetchMock([
      { status: 302, location: 'https://trusted.com/spec-v2.yaml' },
      { status: 200 },
    ]);

    await readFileFromUrl('https://trusted.com/spec.yaml', {
      customFetch: fetchMock,
      headers: [{ name: 'X-Secret-Token', matches: 'trusted.com/**', value: 'secret' }],
    });

    expect(fetchMock).toBeCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://trusted.com/spec.yaml', {
      headers: { 'X-Secret-Token': 'secret' },
      redirect: 'manual',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://trusted.com/spec-v2.yaml', {
      headers: { 'X-Secret-Token': 'secret' },
      redirect: 'manual',
    });
  });
});

describe('Resolve http-headers', () => {
  it('should use matching http-headers', async () => {
    const rootDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            A:
              $ref: 'https://example.com/test.yaml'
            B:
              $ref: 'https://sample.com/test.yaml'
            C:
              $ref: 'https://sample.com/test/a/test.yaml'
      `,
      'foobar.yaml'
    );

    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, text: Promise.resolve('') }));

    await resolveDocument({
      rootDocument,
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: [
            {
              name: 'X_TEST',
              matches: 'example.com/*',
              value: '123',
            },
            {
              name: 'X_TEST',
              matches: 'https://sample.com/test/**',
              value: '321',
            },
          ],
        },
      }),
      rootType: normalizeTypes(Oas3Types).Root,
    });

    expect(fetchMock).toBeCalledTimes(3);
    expect(fetchMock.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "https://example.com/test.yaml",
          {
            "headers": {
              "X_TEST": "123",
            },
            "redirect": "manual",
          },
        ],
        [
          "https://sample.com/test.yaml",
          {
            "headers": {},
            "redirect": "manual",
          },
        ],
        [
          "https://sample.com/test/a/test.yaml",
          {
            "headers": {
              "X_TEST": "321",
            },
            "redirect": "manual",
          },
        ],
      ]
    `);
  });
});
