import { outdent } from 'outdent';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleDocument } from '../../bundle/bundle-document.js';
import { BaseResolver } from '../../resolve.js';
import { parseYamlToDocument, yamlSerializer } from '../../../__tests__/utils.js';
import { createConfig } from '../../config/index.js';
import { Oas3Types, Oas2Types, bundle } from '../../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('oas3 filter-operations', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  it('should keep only operations with a specific property+value', async () => {
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
        decorators: { 'filter-operations': { property: 'x-public', values: [true] } },
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
          'filter-operations': {
            property: 'operationId',
            values: ['createFoo', 'getBar'],
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
        decorators: { 'filter-operations': { property: 'tags', values: ['private'] } },
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

  it('should filter referenced operations and remove unused components', async () => {
    const config = await createConfig({
      decorators: {
        'filter-operations': { property: 'tags', values: ['internal'] },
        'remove-unused-components': 'on',
      },
    });
    const { bundle: res } = await bundle({
      config,
      ref: path.join(__dirname, 'fixtures/filter-operations/openapi.yaml'),
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
