import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { bundleDocument } from '../../bundle/bundle-document.js';
import { BaseResolver } from '../../resolve.js';
import { parseYamlToDocument, yamlSerializer } from '../../../__tests__/utils.js';
import { createConfig } from '../../config/index.js';
import { Oas2Types, Oas3Types, bundle } from '../../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

describe('oas3 filter-in with target: Operation', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  it('should keep only operations with a matching property value', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /users:
            get:
              x-public: true
              summary: List users (public)
            post:
              summary: Create user (private)
          /admin:
            get:
              x-public: false
              summary: Admin only (private)
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'x-public',
            value: [true],
            target: 'Operation',
            noPropertyStrategy: 'remove',
          },
        },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /users:
          get:
            x-public: true
            summary: List users (public)
      components: {}

    `);
  });

  it('should keep operations with a matching property value AND operations without the property', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /users:
            get:
              x-public: true
              summary: List users (public)
            post:
              summary: Create user (private)
          /admin:
            get:
              x-public: false
              summary: Admin only (private)
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'x-public',
            value: [true],
            target: 'Operation',
          },
        },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /users:
          get:
            x-public: true
            summary: List users (public)
          post:
            summary: Create user (private)
      components: {}
    `);
  });

  it('should keep only operations with specified operationIds', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /foo:
            get:
              operationId: getFoo
            post:
              operationId: createFoo
          /bar:
            get:
              operationId: getBar
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'operationId',
            value: ['createFoo', 'getBar'],
            target: 'Operation',
            noPropertyStrategy: 'remove',
          },
        },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /foo:
          post:
            operationId: createFoo
        /bar:
          get:
            operationId: getBar
      components: {}

    `);
  });

  it('should keep operations with specified tags', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /foo:
            get:
              tags:
                - public
            post:
              summary: Create Foo (no tags)
          /bar:
            get:
              tags:
                - private
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'tags',
            value: ['private'],
            target: 'Operation',
            noPropertyStrategy: 'remove',
          },
        },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /bar:
          get:
            tags:
              - private
      components: {}

    `);
  });

  it('should support matchStrategy: all with target: Operation', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /foo:
            get:
              tags:
                - public
                - v2
            post:
              tags:
                - public
          /bar:
            get:
              tags:
                - private
                - v2
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'tags',
            value: ['public', 'v2'],
            target: 'Operation',
            matchStrategy: 'all',
            noPropertyStrategy: 'remove',
          },
        },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /foo:
          get:
            tags:
              - public
              - v2
      components: {}

    `);
  });

  it('should remove operations without the specified property', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /users:
            get:
              x-audience: Public
              summary: Public endpoint
            post:
              summary: No audience set
          /internal:
            get:
              summary: No audience at all
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({
        decorators: {
          'filter-in': {
            property: 'x-audience',
            value: ['Public'],
            target: 'Operation',
            noPropertyStrategy: 'remove',
          },
        },
      }),
      types: Oas3Types,
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /users:
          get:
            x-audience: Public
            summary: Public endpoint
      components: {}

    `);
  });

  it('should filter referenced operations and remove unused components', async () => {
    const config = await createConfig({
      decorators: {
        'filter-in': {
          property: 'tags',
          value: ['internal'],
          target: 'Operation',
        },
        'remove-unused-components': 'on',
      },
    });
    const { bundle: res } = await bundle({
      config,
      ref: path.join(__dirname, 'fixtures/filter-in/openapi.yaml'),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.2.0
      info:
        title: Example API
        version: 1.0.0
      paths:
        /admin:
          get:
            operationId: adminOp
            tags:
              - internal
            responses:
              '200':
                description: Success
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/admin-schema'
      components:
        schemas:
          admin-schema:
            type: object
    `);
  });
});
