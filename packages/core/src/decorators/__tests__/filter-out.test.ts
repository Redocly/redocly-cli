import { outdent } from 'outdent';
import { bundleDocument } from '../../bundle';
import { BaseResolver } from '../../resolve';
import { makeConfig, parseYamlToDocument, yamlSerializer } from '../../../__tests__/utils';

describe('oas3 filter-out', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  const inputDoc = parseYamlToDocument(
    outdent`
        openapi: 3.0.0
        paths:
          /pet:
            x-audience: Private
            post:
              summary: test
              requestBody:
                content:
                  application/x-www-form-urlencoded:
                    schema:
                      type: object
          /user:
            x-audience: Protected
            post:
              summary: test
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object            
          /order:
            x-audience: [Private, Protected]
            post:
              operationId: storeOrder
              parameters:
                - name: api_key
                  schema:
                    x-internal: true
                    type: string
              responses:
                '200':
                  x-internal: true
                  content:
                    application/json:
                      examples:
                        response:
                          value: OK
              requestBody:
                content:
                  application/x-www-form-urlencoded:
                    x-internal: true
                    schema:
                      type: object
              callbacks:
                access: protected
                orderInProgress:
                  x-internal: true
                  '{$request.body#/callbackUrl}?event={$request.body#/eventName}':
                    servers:
                      - url: //callback-url.path-level/v1
                        description: Path level server `,
  );

  it('should remove /pet path', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pet:
          access: private
          get:
            parameters:
              - $ref: '#/components/parameters/x'
      components:
        parameters:
          x:
            name: x
            
    `,
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({}, { 'filter-out': { property: 'access', value: 'private'  } }),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
          openapi: 3.0.0
          components:
            parameters:
              x:
                name: x

        `);
  });

  it('should remove only /order path', async () => {
    const { bundle: res } = await bundleDocument({
      document: inputDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'filter-out': {
            property: 'x-audience',
            value: ['Private', 'Protected'],
            matchStrategy: 'all',
          },
        },
      ),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          x-audience: Private
          post:
            summary: test
            requestBody:
              content:
                application/x-www-form-urlencoded:
                  schema:
                    type: object
        /user:
          x-audience: Protected
          post:
            summary: test
            requestBody:
              content:
                application/json:
                  schema:
                    type: object
      components: {}

    `);
  });

  it('should remove all paths', async () => {
    const { bundle: res } = await bundleDocument({
      document: inputDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'filter-out': {
            property: 'x-audience',
            value: ['Private', 'Protected'],
            matchStrategy: 'any',
          },
        },
      ),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
        openapi: 3.0.0
        components: {}
        
        `);
  });

  it('should remove requestBody', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pet:
          post:
            summary: test
            requestBody:
              content:
                access: private
                application/x-www-form-urlencoded:
                  schema:
                    type: object
      components: {}
            
        `,
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'filter-out': {
            property: 'access',
            value: 'private',
            matchStrategy: 'any',
          },
        },
      ),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          post:
            summary: test
      components: {}

    `);
  });
});

describe('oas2 filter-out', () => {
    it('should clean all parameters and responses ', async () => {
        const testDoc = parseYamlToDocument(
            outdent`
        swagger: '2.0'
        host: api.instagram.com
        paths:
          '/geographies/{geo-id}/media/recent':
            get:
              parameters:
                - description: The geography ID.
                  access: private
                  in: path
                  name: geo-id
                  required: true
                  type: string
                - description: Max number of media to return.
                  access: protected
                  format: int32
                  in: query
                  name: count
                  required: false
                  type: integer
              responses:
                '200':
                  description: List of recent media entries.
                  access: [protected, public]
      `,
        );
        const { bundle: res } = await bundleDocument({
            document: testDoc,
            externalRefResolver: new BaseResolver(),
            config: await makeConfig({}, {
                'filter-out': {
                    property: 'access',
                    value: ['private', 'protected'],
                    matchStrategy: 'any'
                }
            }),
        });
        expect(res.parsed).toMatchInlineSnapshot(`
          swagger: '2.0'
          host: api.instagram.com
          paths:
            /geographies/{geo-id}/media/recent:
              get: {}

        `);
    });
});