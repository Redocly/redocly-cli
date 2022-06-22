import { outdent } from 'outdent';
import { bundleDocument } from '../../bundle';
import { BaseResolver } from '../../resolve';
import { makeConfig, parseYamlToDocument, yamlSerializer } from '../../../__tests__/utils';

describe('oas3 filter-in', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  const inputDoc = parseYamlToDocument(
    outdent`
        openapi: 3.0.0
        paths:
          /pet:
            x-audience: Global
            post:
              summary: test
              requestBody:
                content:
                  application/x-www-form-urlencoded:
                    schema:
                      type: object
          /user:
            x-audience: [Public, Global]
            post:
              summary: test
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object            
          /order:
            x-audience: [Public, Protected]
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

  it('should include /pet path', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pet:
          access: public
          get:
            parameters:
              - $ref: '#/components/parameters/x'
        /user:
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
      config: await makeConfig({}, { 'filter-in': { value: 'public', property: 'access' } }),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          access: public
          get:
            parameters:
              - $ref: '#/components/parameters/x'
      components:
        parameters:
          x:
            name: x

    `);
  });

  it('should include only /order path', async () => {
    const { bundle: res } = await bundleDocument({
      document: inputDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'filter-in': {
            property: 'x-audience',
            value: ['Public', 'Protected'],
            matchStrategy: 'all',
          },
        },
      ),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /order:
          x-audience:
            - Public
            - Protected
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
                      description: Path level server
      components: {}

    `);
  });

  it('should include all paths', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            x-audience: Global
            post:
              summary: test
              requestBody:
                content:
                  application/x-www-form-urlencoded:
                    schema:
                      type: object
          /user:
            x-audience: [Public, Global]
            post:
              summary: test
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object            
          /order:
            x-audience: [Public, Protected]
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
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'filter-in': {
            property: 'x-audience',
            value: ['Public', 'Global'],
            matchStrategy: 'any',
          },
        },
      ),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          x-audience: Global
          post:
            summary: test
            requestBody:
              content:
                application/x-www-form-urlencoded:
                  schema:
                    type: object
        /user:
          x-audience:
            - Public
            - Global
          post:
            summary: test
            requestBody:
              content:
                application/json:
                  schema:
                    type: object
        /order:
          x-audience:
            - Public
            - Protected
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
                      description: Path level server
      components: {}

    `);
  });

  it('should not include paths', async () => {
    const { bundle: res } = await bundleDocument({
      document: inputDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'filter-in': {
            property: 'x-audience',
            value: 'all',
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
});

describe('oas2 filter-in', () => {
  it('should include only one parameter and not include response', async () => {
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
                  access: public
                  format: int32
                  in: query
                  name: count
                  required: false
                  type: integer
              responses:
                '200':
                  description: List of recent media entries.
                  access: [private, protected]
      `,
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'filter-in': {
            property: 'access',
            value: ['public', 'global'],
            matchStrategy: 'any',
          },
        },
      ),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      swagger: '2.0'
      host: api.instagram.com
      paths:
        /geographies/{geo-id}/media/recent:
          get:
            parameters:
              - description: Max number of media to return.
                access: public
                format: int32
                in: query
                name: count
                required: false
                type: integer

    `);
  });
});
