import { outdent } from 'outdent';
import { lintDocument } from '../../../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
import { BaseResolver } from '../../../resolve.js';
import { createConfig } from '../../../config/index.js';

describe('spec-no-invalid-encoding-combinations', () => {
  it('should report on invalid encoding combinations', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.2.0
        paths:
          /test:
            post:
              requestBody:
                content:
                  # Valid: encoding with multipart/form-data
                  multipart/form-data:
                    schema:
                      type: object
                      properties:
                        name:
                          type: string
                        file:
                          type: string
                          format: binary
                    encoding:
                      name:
                        contentType: text/plain
                      file:
                        contentType: application/octet-stream

                  # Invalid: encoding and prefixEncoding together
                  multipart/mixed:
                    schema:
                      type: object
                      properties:
                        name:
                          type: string
                    encoding:
                      name:
                        contentType: text/plain
                    prefixEncoding:
                      - contentType: text/plain
                  
                  # Invalid: encoding and itemEncoding together
                  multipart/alternative:
                    schema:
                      type: array
                      items:
                        type: string
                    encoding:
                      name:
                        contentType: text/plain
                    itemEncoding:
                      contentType: text/plain
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({ rules: { 'spec-no-invalid-encoding-combinations': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/post/requestBody/content/multipart~1mixed/encoding",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The 'encoding' field cannot be used together with 'prefixEncoding' or 'itemEncoding'.",
          "ruleId": "spec-no-invalid-encoding-combinations",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1test/post/requestBody/content/multipart~1alternative/encoding",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The 'encoding' field cannot be used together with 'prefixEncoding' or 'itemEncoding'.",
          "ruleId": "spec-no-invalid-encoding-combinations",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});
