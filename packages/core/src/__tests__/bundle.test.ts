import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import {
  parseYamlToDocument,
  replaceSourceWithRef,
  yamlSerializer,
} from '../../__tests__/utils.js';
import { bundleDocument } from '../bundle/bundle-document.js';
import { bundle, bundleFromString } from '../bundle/bundle.js';
import { createConfig, loadConfig } from '../config/index.js';
import { AsyncApi2Types, AsyncApi3Types, Oas3Types } from '../index.js';
import { BaseResolver } from '../resolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const stringDocument = outdent`
  openapi: 3.0.0
  paths:
    /pet:
      get:
        operationId: get
        parameters:
          - $ref: '#/components/parameters/shared_a'
          - name: get_b
      post:
        operationId: post
        parameters:
          - $ref: '#/components/parameters/shared_a'
  components:
    parameters:
      shared_a:
        name: shared-a
`;

const testDocument = parseYamlToDocument(stringDocument, '');

describe('bundle', () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      text: () => 'External schema content',
      headers: {
        get: () => '',
      },
    })
  );

  expect.addSnapshotSerializer(yamlSerializer);

  it('change nothing with only internal refs', async () => {
    const { bundle, problems } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({}),
      types: Oas3Types,
    });

    const origCopy = JSON.parse(JSON.stringify(testDocument.parsed));

    expect(problems).toHaveLength(0);
    expect(bundle.parsed).toEqual(origCopy);
  });

  it('should bundle external refs', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs.yaml'),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe('warn');
    expect(problems[0].message).toEqual(
      `Two schemas are referenced with the same name but different content. Renamed first to first-2.`
    );
    expect(res.parsed).toMatchSnapshot();
  });

  it('should bundle external refs under x-query operation (no dereference)', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-x-query.yaml'),
    });

    expect(problems).toHaveLength(0);
    const parsed = res.parsed as any;
    expect(
      parsed.paths['/pet']['x-query'].responses['200'].content['application/json'].schema
    ).toMatchObject({
      $ref: '#/components/schemas/schema-a',
    });
    expect(parsed.components.schemas['schema-a']).toEqual({ type: 'string' });
  });

  it('should bundle external refs and warn for conflicting names', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-conflicting-names.yaml'),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe('warn');
    expect(problems[0].message).toEqual(
      `Two schemas are referenced with the same name but different content. Renamed param-b to param-b-2.`
    );
    expect(res.parsed).toMatchSnapshot();
  });

  it('should bundle external refs and do not show warnings for conflicting names', async () => {
    const { problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-conflicting-names.yaml'),
      componentRenamingConflicts: 'off',
    });
    expect(problems).toHaveLength(0);
  });

  it('should bundle external refs and show errors for conflicting names', async () => {
    const { problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-conflicting-names.yaml'),
      componentRenamingConflicts: 'error',
    });
    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe('error');
    expect(problems[0].message).toEqual(
      `Two schemas are referenced with the same name but different content. Renamed param-b to param-b-2.`
    );
  });

  it('should bundle external pointer refs and warn for conflicting names', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(
        __dirname,
        'fixtures/refs/openapi-with-external-refs-pointer-conflicting-names.yaml'
      ),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe('warn');
    expect(problems[0].message).toEqual(
      `Two schemas are referenced with the same name but different content. Renamed User to User-2.`
    );
    expect(res.parsed).toMatchSnapshot();
  });

  it('should bundle external pointer refs and do not show warnings for conflicting names', async () => {
    const { problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(
        __dirname,
        'fixtures/refs/openapi-with-external-refs-pointer-conflicting-names.yaml'
      ),
      componentRenamingConflicts: 'off',
    });
    expect(problems).toHaveLength(0);
  });

  it('should report error-severity problems for conflicting pointer ref names', async () => {
    const { problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(
        __dirname,
        'fixtures/refs/openapi-with-external-refs-pointer-conflicting-names.yaml'
      ),
      componentRenamingConflicts: 'error',
    });
    expect(problems).toHaveLength(1);
    expect(problems[0].severity).toBe('error');
    expect(problems[0].message).toEqual(
      `Two schemas are referenced with the same name but different content. Renamed User to User-2.`
    );
  });

  it('should keep dotted JSON pointer schema keys and rename conflicting User schemas', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(
        __dirname,
        'fixtures/refs/openapi-bundle-external-schema-names-and-user-conflict.yaml'
      ),
    });

    expect(problems).toHaveLength(0);
    const schemas = (res.parsed as { components: { schemas: Record<string, unknown> } }).components
      .schemas;
    expect(schemas['my.org.User']).toBeDefined();
    expect(schemas['my.User']).toBeDefined();
    expect(res.parsed).toMatchSnapshot();
  });

  it('should dereferenced correctly when used with dereference', async () => {
    const { bundle: res, problems } = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      config: await createConfig({}),
      document: testDocument,
      dereference: true,
      types: Oas3Types,
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should dereference external refs under x-query operation when dereference is enabled', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-x-query.yaml'),
      dereference: true,
    });

    expect(problems).toHaveLength(0);
    const parsed = res.parsed as any;
    expect(
      parsed.paths['/pet']['x-query'].responses['200'].content['application/json'].schema
    ).toEqual({
      type: 'string',
    });
  });

  it('should place referenced schema inline when referenced schema name resolves to original schema name', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/externalref.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not place referenced schema inline when component in question is not of type "schemas"', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/external-request-body.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should bundle mediaTypes refs correctly (OAS 3.2)', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.2.0"
        paths:
          /test:
            get:
              responses:
                '200':
                  description: OK
                  content:
                    $ref: '#/components/mediaTypes/Test'
        components:
          mediaTypes:
            Test:
              'application/json':
                schema:
                  $ref: '#/components/schemas/User'
                examples:
                  example1:
                    value:
                      id: 1
                      name: John
          schemas:
            User:
              type: object
              properties:
                id:
                  type: integer
                name:
                  type: string
        `,
      'test.yaml'
    );

    const { bundle: res, problems } = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({}),
      types: Oas3Types,
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.2.0
      paths:
        /test:
          get:
            responses:
              '200':
                description: OK
                content:
                  $ref: '#/components/mediaTypes/Test'
      components:
        mediaTypes:
          Test:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
              examples:
                example1:
                  value:
                    id: 1
                    name: John
        schemas:
          User:
            type: object
            properties:
              id:
                type: integer
              name:
                type: string
    `);
  });

  it('should bundle external mediaTypes refs correctly (OAS 3.2)', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/external-media-types.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.2.0
      paths:
        /test:
          get:
            responses:
              '200':
                description: OK
                content:
                  $ref: '#/components/mediaTypes/testMediaType'
      components:
        mediaTypes:
          testMediaType:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
              examples:
                Test:
                  value:
                    id: 1
    `);
  });

  it('should accept parameter in: querystring (OAS 3.2)', async () => {
    const document = outdent`
      openapi: 3.2.0
      paths:
        /test:
          get:
            parameters:
              - name: filters
                in: querystring
                content:
                  application/x-www-form-urlencoded:
                    schema:
                      type: object
                      properties:
                        filters:
                          type: string
    `;

    const { problems } = await bundleFromString({
      source: document,
      config: await createConfig({}),
    });

    expect(problems).toHaveLength(0);
  });

  it('should pull hosted schema', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: [],
        },
      }),
      ref: path.join(__dirname, 'fixtures/refs/hosted.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith('https://someexternal.schema', {
      headers: {},
    });
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not bundle url refs if used with keepUrlRefs', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: [],
        },
      }),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-url-refs.yaml'),
      keepUrlRefs: true,
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should bundle refs using $anchors', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            User:
              type: object
              properties:
                profile:
                  $ref: '#user-profile'
            UserProfile:
              $anchor: user-profile
              type: string
      `,
      ''
    );

    const config = await createConfig({});

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
      types: Oas3Types,
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      components:
        schemas:
          User:
            type: object
            properties:
              profile:
                $ref: '#user-profile'
          UserProfile:
            $anchor: user-profile
            type: string

    `);
  });

  it('should throw an error when there is no document to bundle', async () => {
    const config = await createConfig({});
    const wrapper = () =>
      bundle({
        config,
      });

    expect(wrapper()).rejects.toThrowError('Document or reference is required.\n');
  });

  it('should bundle with a doc provided', async () => {
    const {
      bundle: { parsed },
      problems,
    } = await bundle({
      config: await loadConfig({ configPath: path.join(__dirname, 'fixtures/redocly.yaml') }),
      doc: testDocument,
    });

    const origCopy = JSON.parse(JSON.stringify(testDocument.parsed));

    expect(problems).toHaveLength(0);
    expect(parsed).toEqual(origCopy);
  });

  it('should bundle schemas with properties named $ref and externalValues correctly', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-special-names-in-props.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not fail when bundling openapi with nulls', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths: 
          /:
            get: 
              responses: 
                200:
                  content: 
                    application/json: 
                      schema: 
                        type: object
                        properties: 
                      examples: 
                        Foo:           
      `,
      ''
    );

    const config = await createConfig({});

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
      types: Oas3Types,
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      paths:
        /:
          get:
            responses:
              '200':
                content:
                  application/json:
                    schema:
                      type: object
                      properties: null
                    examples:
                      Foo: null
      components: {}

    `);
  });

  it('should normalize self-file explicit $ref in oas2', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/self-file-refs/oas2.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should normalize self-file explicit $ref in nested referenced file', async () => {
    const config = await createConfig({});

    const { bundle: res, problems } = await bundle({
      config,
      ref: path.join(__dirname, 'fixtures/self-file-refs/oas3-root.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should resolve discriminator mapping with relative file refs without "./" prefix', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/discriminator-mapping-file-refs/openapi.yaml'),
    });
    expect(problems).toHaveLength(0);
    const discriminated = (res.parsed as any).components.schemas.discriminated;
    expect(discriminated.discriminator.mapping).toEqual({
      a: '#/components/schemas/type-a',
      b: '#/components/schemas/type-b',
    });
  });

  it('should bundle discriminator with defaultMapping and mapping as component names to the same document', async () => {
    const document = outdent`
      openapi: 3.2.0
      components:
        schemas:
          Pet:
            type: object
            discriminator:
              propertyName: kind
              defaultMapping: Cat
              mapping:
                cat: Cat
          Cat:
            type: object
            properties:
              kind:
                type: string

    `;

    const {
      bundle: { parsed },
      problems,
    } = await bundleFromString({
      source: document,
      config: await createConfig({}),
    });

    expect(problems).toMatchInlineSnapshot(`[]`);
    expect(parsed).toMatchInlineSnapshot(document);
  });
});

describe('bundleFromString', () => {
  it('should bundle from string using bundleFromString', async () => {
    const {
      bundle: { parsed: _parsed, ...rest },
      problems,
    } = await bundleFromString({
      config: await createConfig(`
        extends:
        - recommended
      `),
      source: testDocument.source.body,
    });
    expect(problems).toHaveLength(0);
    expect(rest.source.body).toEqual(stringDocument);
  });
});

describe('bundle async', () => {
  it('should bundle async of version 2.x', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Account Service
          version: 1.0.0
          description: This service is in charge of processing user signups
        channels:
          user/signedup:
            subscribe:
              message:
                $ref: '#/components/messages/UserSignedUp'
        components:
          schemas:
            UserSignedUp:
              type: object
              properties:
                displayName:
                  type: string
                  description: Name of the user
          messages:
            UserSignedUp:
              payload:
                $ref: '#/components/schemas/UserSignedUp'
      `,
      ''
    );

    const config = await createConfig({});

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
      dereference: true,
      types: AsyncApi2Types,
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchInlineSnapshot(`
      asyncapi: 2.6.0
      info:
        title: Account Service
        version: 1.0.0
        description: This service is in charge of processing user signups
      channels:
        user/signedup:
          subscribe:
            message:
              payload: &ref_1
                type: object
                properties: &ref_0
                  displayName:
                    type: string
                    description: Name of the user
      components:
        schemas:
          UserSignedUp:
            type: object
            properties: *ref_0
        messages:
          UserSignedUp:
            payload: *ref_1

    `);
  });

  it('should bundle async of version 3.0', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        asyncapi: 3.0.0
        info:
          title: Account Service
          version: 1.0.0
          description: This service is in charge of processing user signups
        operations:
          sendUserSignedup:
            action: send
            messages:
              - $ref: '#/components/messages/UserSignedUp'
        components:
          schemas:
            UserSignedUp:
              type: object
              properties:
                displayName:
                  type: string
                  description: Name of the user
          messages:
            UserSignedUp:
              payload:
                $ref: '#/components/schemas/UserSignedUp'
      `,
      ''
    );

    const config = await createConfig({});

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
      dereference: true,
      types: AsyncApi3Types,
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchInlineSnapshot(`
      asyncapi: 3.0.0
      info:
        title: Account Service
        version: 1.0.0
        description: This service is in charge of processing user signups
      operations:
        sendUserSignedup:
          action: send
          messages:
            - payload: &ref_1
                type: object
                properties: &ref_0
                  displayName:
                    type: string
                    description: Name of the user
      components:
        schemas:
          UserSignedUp:
            type: object
            properties: *ref_0
        messages:
          UserSignedUp:
            payload: *ref_1

    `);
  });

  it('should bundle async of version 3.1 with a ros2 binding', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        asyncapi: 3.1.0
        info:
          title: Robot Service
          version: 1.0.0
        servers:
          production:
            host: localhost
            protocol: ros2
            bindings:
              ros2:
                domainId: 42
        operations:
          sendCmdVel:
            action: send
            messages:
              - $ref: '#/components/messages/TwistMsg'
        components:
          schemas:
            Twist:
              type: object
              properties:
                linear:
                  type: number
          messages:
            TwistMsg:
              payload:
                $ref: '#/components/schemas/Twist'
      `,
      ''
    );

    const config = await createConfig({});

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
      dereference: true,
      types: AsyncApi3Types,
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchSnapshot();
  });

  it('should normalize self-file explicit $ref in asyncapi 2', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/self-file-refs/async2.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should normalize self-file explicit $ref in nested referenced file for async3', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/self-file-refs/async3-root.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should keep operation message refs pointing to channel messages in asyncapi 3', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: 3.0.0
        info:
          title: Ping service
          version: 1.0.0
        channels:
          ping:
            address: /ping
            messages:
              ping:
                $ref: '#/components/messages/ping'
        operations:
          sendPing:
            action: send
            channel:
              $ref: '#/channels/ping'
            messages:
              - $ref: '#/channels/ping/messages/ping'
        components:
          messages:
            ping:
              payload:
                type: string
      `,
      ''
    );

    const { bundle: res, problems } = await bundleDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({}),
      types: AsyncApi3Types,
    });

    expect(problems).toHaveLength(0);
    expect((res.parsed as any).operations.sendPing.messages).toEqual([
      { $ref: '#/channels/ping/messages/ping' },
    ]);
  });

  it('should keep operation channel refs pointing to root channels in asyncapi 3', async () => {
    const document = parseYamlToDocument(
      outdent`
        asyncapi: 3.0.0
        info:
          title: Ping service
          version: 1.0.0
        channels:
          ping:
            $ref: '#/components/channels/ping'
        operations:
          sendPing:
            action: send
            channel:
              $ref: '#/channels/ping'
        components:
          channels:
            ping:
              address: /ping
      `,
      ''
    );

    const { bundle: res, problems } = await bundleDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: await createConfig({}),
      types: AsyncApi3Types,
    });

    expect(problems).toHaveLength(0);
    expect((res.parsed as any).operations.sendPing.channel).toEqual({
      $ref: '#/channels/ping',
    });
  });
});

describe('sibling $ref resolution by spec', () => {
  it('should resolve description and summary refs alongside $ref in Schema - OAS 3', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/sibling-refs/openapi.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should resolve description and summary refs alongside $ref in Schema - AsyncAPI 3', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/sibling-refs/asyncapi.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should resolve description and summary refs alongside $ref in Schema contexts - Arazzo 1', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/sibling-refs/arazzo.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not resolve non-description/summary sibling ref', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/sibling-refs/openapi-non-summary-desc-ref.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should prefer description from sibling ref over target schema description', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/sibling-refs/openapi-with-description-ref.yaml'),
    });

    const field = (res.parsed as any).paths['/test'].get.responses['200'].content[
      'application/json'
    ].schema.properties.field;

    expect(problems).toHaveLength(0);
    expect(field.description).toBe('This is a description resolved from a reference file.\n');
  });

  it('should resolve RequestBody.description as $ref sibling to RequestBody $ref (non-Schema context)', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/sibling-refs/openapi-request-body.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });
});

describe('bundle with --component-names-strategy title', () => {
  it('should build Schema component names from title when flag is on', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/title-naming/openapi.yaml'),
      componentNamesStrategy: 'title',
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('reports an error when a schema has no `title`', async () => {
    const { problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/title-naming-missing-title/openapi.yaml'),
      componentNamesStrategy: 'title',
    });
    expect(replaceSourceWithRef(problems, __dirname)).toMatchInlineSnapshot(`
      - ruleId: bundler
        severity: error
        message: Schema must define a \`title\` when using \`--component-names-strategy title\`.
        location:
          - source: fixtures/refs/title-naming-missing-title/schemas/NoTitle.yaml
            pointer: '#/'
            reportOnKey: false
        forceSeverity: error
        suggest: []
    `);
  });

  it('sanitizes unsupported characters in a title into the component name', async () => {
    const { bundle: res, problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/title-naming-unsupported-title/openapi.yaml'),
      componentNamesStrategy: 'title',
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('reports a title collision once and points `from` at the first schema, even when referenced repeatedly', async () => {
    const { problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/title-naming-collision/openapi.yaml'),
      componentNamesStrategy: 'title',
    });
    expect(problems).toHaveLength(1);
    expect(replaceSourceWithRef(problems, __dirname)).toMatchInlineSnapshot(`
      - ruleId: bundler
        severity: warn
        message: >-
          Title "User" maps to component name \`User\`, already used by another schema.
          Rename one of the titles.
        location:
          - source: fixtures/refs/title-naming-collision/schemas/b/User.yaml
            pointer: '#/title'
            reportOnKey: false
        from:
          source: fixtures/refs/title-naming-collision/schemas/a/User.yaml
          pointer: '#/title'
        forceSeverity: warn
        suggest: []
    `);
  });

  it('leaves non-schema components (parameters) untouched when the flag is on', async () => {
    const { problems } = await bundle({
      config: await createConfig({}),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-conflicting-names.yaml'),
      componentNamesStrategy: 'title',
    });
    expect(replaceSourceWithRef(problems, __dirname)).toMatchInlineSnapshot(`
      - ruleId: bundler
        severity: warn
        message: >-
          Two schemas are referenced with the same name but different content. Renamed
          param-b to param-b-2.
        location:
          - source: fixtures/refs/openapi-with-external-refs-conflicting-names.yaml
            pointer: '#/paths/~1pet/put/parameters/1'
            reportOnKey: false
        forceSeverity: warn
        suggest: []
    `);
  });
});
