import { outdent } from 'outdent';
import { parseYamlToDocument, yamlSerializer } from '../../../__tests__/utils.js';
import { bundleDocument } from '../../bundle/bundle-document.js';
import { createConfig } from '../../config/index.js';
import { Oas2Types, Oas3Types } from '../../index.js';
import { BaseResolver } from '../../resolve.js';

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
                x-access: protected`
  );

  it('should include /user path and remove y parameter', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pet:
          x-access: private
          get:
            parameters:
              - $ref: '#/components/parameters/x'
        /user:
          x-access: public
          get:
            parameters:
              - $ref: '#/components/parameters/y'      
      components:
        parameters:
          x:
            name: x
          y:
            x-access: private
            name: y            
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: { 'filter-in': { value: 'public', property: 'x-access' } },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /user:
          x-access: public
          get: {}
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
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'x-audience',
            value: ['Public', 'Protected'],
            matchStrategy: 'all',
          },
        },
      }),
      types: Oas3Types,
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
              x-access: protected
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
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'x-audience',
            value: ['Public', 'Global'],
            matchStrategy: 'any',
          },
        },
      }),
      types: Oas3Types,
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
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'x-audience',
            value: 'non-existing-audience',
            matchStrategy: 'any',
          },
        },
      }),
      types: Oas3Types,
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

  it('should include /pet and /account without post method', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            x-audience: Global
            post:
              summary: test
          /user:
            x-audience: Private
            post:
              summary: test
            get:
               summary: get
               x-audience: [Public, Global]
          /account:
            get:
               summary: get
            post: 
               summary: test
               x-audience: Private     
                 `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'x-audience',
            value: ['Public', 'Global'],
            matchStrategy: 'any',
          },
        },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          x-audience: Global
          post:
            summary: test
        /account:
          get:
            summary: get
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
                  x-access: private
                  in: path
                  name: geo-id
                  required: true
                  type: string
                - description: Max number of media to return.
                  x-access: public
                  format: int32
                  in: query
                  name: count
                  required: false
                  type: integer
              responses:
                '200':
                  description: List of recent media entries.
                  x-access: [private, protected]
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'x-access',
            value: ['public', 'global'],
            matchStrategy: 'any',
          },
        },
      }),
      types: Oas2Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      swagger: '2.0'
      host: api.instagram.com
      paths:
        /geographies/{geo-id}/media/recent:
          get:
            parameters:
              - description: Max number of media to return.
                x-access: public
                format: int32
                in: query
                name: count
                required: false
                type: integer

    `);
  });
});
