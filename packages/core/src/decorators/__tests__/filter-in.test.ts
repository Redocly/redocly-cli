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
          /user:
            x-audience: [Public, Global]
            post:
              summary: test
          /post:
            get:
              summary: test                        
          /order:
            x-audience: [Public, Protected]
            post:
              operationId: storeOrder
              callbacks:
                access: protected`
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
            
    `
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

  it('should include /order and /post paths', async () => {
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
        }
      ),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /post:
          get:
            summary: test
        /order:
          x-audience:
            - Public
            - Protected
          post:
            operationId: storeOrder
            callbacks:
              access: protected
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
          /user:
            x-audience: [Public, Global]
            post:
              summary: test            
          /order:
            x-audience: [Public, Protected]
            post:
              operationId: storeOrder
              parameters:
                - name: api_key
                 `
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
        }
      ),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          x-audience: Global
          post:
            summary: test
        /user:
          x-audience:
            - Public
            - Global
          post:
            summary: test
        /order:
          x-audience:
            - Public
            - Protected
          post:
            operationId: storeOrder
            parameters:
              - name: api_key
      components: {}

    `);
  });

  it('should include path without x-audience property ', async () => {
    const { bundle: res } = await bundleDocument({
      document: inputDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig(
        {},
        {
          'filter-in': {
            property: 'x-audience',
            value: 'non-existing-audience',
            matchStrategy: 'any',
          },
        }
      ),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /post:
          get:
            summary: test
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
      `
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
        }
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
