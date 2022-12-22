import { makeConfig, parseYamlToDocument } from '../../../../__tests__/utils';
import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { BaseResolver } from '../../../resolve';

describe('Oas3 spec-components-invalid-map-name', () => {
  it('should report about invalid keys inside components', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.0
      info:
        version: 3.0.0
      components:
        parameters:
          my Param:
            name: param
            description: param
            in: path
        examples:
          invalid identifier:
            description: 'Some description'
            value: 21      
        responses: 
          400 status:
            description: bad request   
        schemas: 
          first schema:
            type: integer
            format: int64     
		`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        'spec-components-invalid-map-name': 'error',
      }),
    });

    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/parameters/my Param",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.0
      info:
        version: 3.0.0
      components:
        parameters:
          my Param:
            name: param
            description: param
            in: path
        examples:
          invalid identifier:
            description: 'Some description'
            value: 21      
        responses: 
          400 status:
            description: bad request   
        schemas: 
          first schema:
            type: integer
            format: int64     ",
                "mimeType": undefined,
              },
            },
          ],
          "message": "The map key in parameters \\"my Param\\" does not match the regular expression \\"^[a-zA-Z0-9\\\\.\\\\-_]+$\\"",
          "ruleId": "spec-components-invalid-map-name",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/schemas/first schema",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.0
      info:
        version: 3.0.0
      components:
        parameters:
          my Param:
            name: param
            description: param
            in: path
        examples:
          invalid identifier:
            description: 'Some description'
            value: 21      
        responses: 
          400 status:
            description: bad request   
        schemas: 
          first schema:
            type: integer
            format: int64     ",
                "mimeType": undefined,
              },
            },
          ],
          "message": "The map key in schemas \\"first schema\\" does not match the regular expression \\"^[a-zA-Z0-9\\\\.\\\\-_]+$\\"",
          "ruleId": "spec-components-invalid-map-name",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/responses/400 status",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.0
      info:
        version: 3.0.0
      components:
        parameters:
          my Param:
            name: param
            description: param
            in: path
        examples:
          invalid identifier:
            description: 'Some description'
            value: 21      
        responses: 
          400 status:
            description: bad request   
        schemas: 
          first schema:
            type: integer
            format: int64     ",
                "mimeType": undefined,
              },
            },
          ],
          "message": "The map key in responses \\"400 status\\" does not match the regular expression \\"^[a-zA-Z0-9\\\\.\\\\-_]+$\\"",
          "ruleId": "spec-components-invalid-map-name",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/examples/invalid identifier",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.0
      info:
        version: 3.0.0
      components:
        parameters:
          my Param:
            name: param
            description: param
            in: path
        examples:
          invalid identifier:
            description: 'Some description'
            value: 21      
        responses: 
          400 status:
            description: bad request   
        schemas: 
          first schema:
            type: integer
            format: int64     ",
                "mimeType": undefined,
              },
            },
          ],
          "message": "The map key in examples \\"invalid identifier\\" does not match the regular expression \\"^[a-zA-Z0-9\\\\.\\\\-_]+$\\"",
          "ruleId": "spec-components-invalid-map-name",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should not report a key of the example does not match the regular expression', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.0
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            parameters:
              - name: petId
                in: path
                schema:
                  type: integer
                  format: int64
                examples:
                  valid-identifier-1.key:
                      description: 'Some description'
                      value: 21
		`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        'spec-components-invalid-map-name': 'error',
      }),
    });

    expect(results).toMatchInlineSnapshot(`Array []`);
  });

  it('should report about invalid keys inside nested examples', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.0
      info:
        version: 3.0.0
      components:
        parameters:
          my Param:
            name: param
            description: param
            in: path
            examples:
              invalid identifier:
                description: 'Some description'
                value: 21 
		`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        'spec-components-invalid-map-name': 'error',
      }),
    });

    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/parameters/my Param",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.0
      info:
        version: 3.0.0
      components:
        parameters:
          my Param:
            name: param
            description: param
            in: path
            examples:
              invalid identifier:
                description: 'Some description'
                value: 21 ",
                "mimeType": undefined,
              },
            },
          ],
          "message": "The map key in parameters \\"my Param\\" does not match the regular expression \\"^[a-zA-Z0-9\\\\.\\\\-_]+$\\"",
          "ruleId": "spec-components-invalid-map-name",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/components/parameters/my Param/examples/invalid identifier",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.0
      info:
        version: 3.0.0
      components:
        parameters:
          my Param:
            name: param
            description: param
            in: path
            examples:
              invalid identifier:
                description: 'Some description'
                value: 21 ",
                "mimeType": undefined,
              },
            },
          ],
          "message": "The map key in examples \\"invalid identifier\\" does not match the regular expression \\"^[a-zA-Z0-9\\\\.\\\\-_]+$\\"",
          "ruleId": "spec-components-invalid-map-name",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
