import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 response-contains-header', () => {
  it('should report a response object not containing the header', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
		`);

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        'response-contains-header': {
          severity: 'error',
          names: { '200': ['Content-Length'] },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1store~1subscribe/post/responses/200/headers",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a \\"Content-Length\\" header.",
          "ruleId": "response-contains-header",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report response objects not containing headers for a subset of status codes', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
              400:
                description: error
                headers:
                  AccessForbidden:
                    description: Access forbidden
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            status:
                              type: integer
                              description: The HTTP status code.
                            error:
                              type: string
    `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        'response-contains-header': {
          severity: 'error',
          names: {
            '2XX': ['x-request-id'],
            '400': ['Content-Length'],
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1store~1subscribe/post/responses/200/headers",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
              400:
                description: error
                headers:
                  AccessForbidden:
                    description: Access forbidden
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            status:
                              type: integer
                              description: The HTTP status code.
                            error:
                              type: string",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a \\"x-request-id\\" header.",
          "ruleId": "response-contains-header",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1store~1subscribe/post/responses/400/headers",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
              400:
                description: error
                headers:
                  AccessForbidden:
                    description: Access forbidden
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            status:
                              type: integer
                              description: The HTTP status code.
                            error:
                              type: string",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a \\"Content-Length\\" header.",
          "ruleId": "response-contains-header",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report response objects containing specified headers', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
                  x-request-id:
                    description: Request ID
                    schema:
                      type: string
              400:
                description: error
                headers:
                  AccessForbidden:
                    description: Access forbidden
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            status:
                              type: integer
                              description: The HTTP status code.
                            error:
                              type: string
                  Content-Length:
                    description: The number of bytes in the file
                    schema:
                      type: integer
    `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        'response-contains-header': {
          severity: 'error',
          names: {
            '2xx': ['x-request-id'],
            '400': ['Content-Length'],
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`Array []`);
  });
});
