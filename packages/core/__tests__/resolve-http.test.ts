import { outdent } from 'outdent';

import { resolveDocument, BaseResolver } from '../src/resolve';
import { parseYamlToDocument } from './utils';
import { Oas3Types } from '../src/types/oas3';
import { normalizeTypes } from '../src/types';

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
      'foobar.yaml',
    );

    const fetchMock = jest.fn(() => Promise.resolve({ ok: true, text: Promise.resolve('') }));

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
      rootType: normalizeTypes(Oas3Types).DefinitionRoot,
    });

    expect(fetchMock).toBeCalledTimes(3);
    expect(fetchMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "https://example.com/test.yaml",
          Object {
            "headers": Object {
              "X_TEST": "123",
            },
          },
        ],
        Array [
          "https://sample.com/test.yaml",
          Object {
            "headers": Object {},
          },
        ],
        Array [
          "https://sample.com/test/a/test.yaml",
          Object {
            "headers": Object {
              "X_TEST": "321",
            },
          },
        ],
      ]
    `);
  });
});
