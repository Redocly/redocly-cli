import { outdent } from 'outdent';

import { parseYamlToDocument } from '../../../../__tests__/utils.js';
import { createConfig } from '../../../config/index.js';
import { lintDocument } from '../../../lint.js';
import {
  type Async2RuleSet,
  type Async3RuleSet,
  type Oas2RuleSet,
  type Oas3RuleSet,
} from '../../../oas-types.js';
import { BaseResolver } from '../../../resolve.js';
import { AsyncApi2Types } from '../../../types/asyncapi2.js';
import { AsyncApi3Types } from '../../../types/asyncapi3.js';
import { type NodeType } from '../../../types/index.js';
import { Oas2Types } from '../../../types/oas2.js';
import { Oas3Types } from '../../../types/oas3.js';
import { Oas3_1Types } from '../../../types/oas3_1.js';
import { Oas3_2Types } from '../../../types/oas3_2.js';
import {
  type AsyncAPIStatsAccumulator,
  type OASStatsAccumulator,
} from '../../../typings/common.js';
import { type Async2Visitor, type Async3Visitor, type Oas2Visitor } from '../../../visitors.js';
import { StatsAsync2, StatsAsync3, StatsOAS } from '../stats.js';

function createOasStatsAccumulator(): OASStatsAccumulator {
  return {
    refs: { metric: 'References', total: 0, color: 'red', items: new Set() },
    externalDocs: { metric: 'External Documents', total: 0, color: 'magenta' },
    schemas: { metric: 'Schemas', total: 0, color: 'white' },
    parameters: { metric: 'Parameters', total: 0, color: 'yellow', items: new Set() },
    links: { metric: 'Links', total: 0, color: 'cyan', items: new Set() },
    pathItems: { metric: 'Path Items', total: 0, color: 'green' },
    webhooks: { metric: 'Webhooks', total: 0, color: 'green' },
    operations: { metric: 'Operations', total: 0, color: 'yellow' },
    tags: { metric: 'Tags', total: 0, color: 'white', items: new Set() },
    xExtensions: { metric: 'Vendor Extensions', total: 0, color: 'cyan', counts: {} },
  };
}

function createAsyncStatsAccumulator(): AsyncAPIStatsAccumulator {
  return {
    refs: { metric: 'References', total: 0, color: 'red', items: new Set() },
    externalDocs: { metric: 'External Documents', total: 0, color: 'magenta' },
    schemas: { metric: 'Schemas', total: 0, color: 'white' },
    parameters: { metric: 'Parameters', total: 0, color: 'yellow', items: new Set() },
    channels: { metric: 'Channels', total: 0, color: 'green' },
    operations: { metric: 'Operations', total: 0, color: 'yellow' },
    tags: { metric: 'Tags', total: 0, color: 'white', items: new Set() },
    xExtensions: { metric: 'Vendor Extensions', total: 0, color: 'cyan', counts: {} },
  };
}

function declaredExtensionTypeNames(propType: unknown, propName: string): string[] {
  const sampleValues: unknown[] = [{}, [], true, 0, 'text'];
  const typeNames =
    typeof propType === 'function'
      ? sampleValues.map((value) => propType(value, propName))
      : [propType];
  return typeNames.filter((typeName): typeName is string => typeof typeName === 'string');
}

describe('stats', () => {
  it('should have a counting hook for SpecExtension and for every declared extension type', () => {
    const statsVisitors = [
      {
        visitor: StatsOAS(createOasStatsAccumulator()) as Record<string, unknown>,
        typeMaps: [Oas2Types, Oas3Types, Oas3_1Types, Oas3_2Types],
      },
      {
        visitor: StatsAsync2(createAsyncStatsAccumulator()) as Record<string, unknown>,
        typeMaps: [AsyncApi2Types],
      },
      {
        visitor: StatsAsync3(createAsyncStatsAccumulator()) as Record<string, unknown>,
        typeMaps: [AsyncApi3Types],
      },
    ];

    for (const { visitor, typeMaps } of statsVisitors) {
      expect(visitor.SpecExtension, 'missing SpecExtension counting hook').toBeDefined();
      for (const typeMap of typeMaps as Array<Record<string, NodeType>>) {
        for (const nodeType of Object.values(typeMap)) {
          for (const [propName, propType] of Object.entries(nodeType.properties ?? {})) {
            if (!propName.startsWith('x-')) continue;
            for (const typeName of declaredExtensionTypeNames(propType, propName)) {
              expect(
                visitor[typeName],
                `missing counting hook for declared extension ${propName} (type ${typeName})`
              ).toBeDefined();
            }
          }
        }
      }
    }
  });

  it('should count vendor extensions in every extension place', async () => {
    const statsAccumulator = createOasStatsAccumulator();
    const testRuleSet: Oas3RuleSet = {
      stats: () => StatsOAS(statsAccumulator),
    };

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          info:
            title: t
            version: '1'
            x-metadata:
              x-nested: 1
            contact:
              name: c
              x-contact-ext: true
            license:
              name: MIT
              x-license-ext: true
          servers:
            - url: https://api.example.com
              x-server-ext: true
              variables:
                env:
                  default: prod
                  x-server-variable-ext: true
          tags:
            - name: pets
              x-tag-ext: true
              externalDocs:
                url: https://example.com
                x-external-docs-ext: true
          x-tagGroups:
            - name: Core
              tags:
                - pets
              x-tag-group-ext: true
          x-webhooks:
            newPet:
              post:
                responses:
                  '200':
                    description: ok
              x-query:
                operationId: webhookQuery
                responses:
                  '200':
                    description: ok
          paths:
            /a:
              get:
                operationId: a
                x-internal: true
                x-hideTryItPanel: true
                x-codeSamples:
                  - lang: curl
                    source: echo
                callbacks:
                  onEvent:
                    x-callback-ext: true
                    '{$request.body#/url}':
                      post:
                        responses:
                          '200':
                            description: ok
                requestBody:
                  x-request-body-ext: true
                  content:
                    application/json:
                      x-media-type-ext: true
                      examples:
                        first:
                          value: 1
                          x-example-ext: true
                      encoding:
                        field:
                          x-encoding-ext: true
                      schema:
                        type: object
                        x-schema-ext: true
                        discriminator:
                          propertyName: kind
                          x-discriminator-ext: true
                        xml:
                          name: pet
                          x-xml-ext: true
                responses:
                  '200':
                    $ref: '#/components/responses/Shared'
            /b:
              get:
                operationId: b
                x-internal: true
                responses:
                  x-responses-ext: true
                  '200':
                    $ref: '#/components/responses/Shared'
                    # ignored per the Reference Object spec — must not be counted
                    x-sibling-ext: true
                  '201':
                    description: created
                    x-response-ext: true
                    headers:
                      X-Rate:
                        x-header-ext: true
                        schema:
                          type: string
                    links:
                      next:
                        operationId: b
                        x-link-ext: true
              x-query:
                operationId: pathQuery
                responses:
                  '200':
                    description: ok
          components:
            x-components-ext: true
            responses:
              Shared:
                description: ok
            schemas:
              x-NotAnExtension:
                type: string
            securitySchemes:
              oauth:
                type: oauth2
                x-security-scheme-ext: true
                flows:
                  x-oauth2-flows-ext: true
                  implicit:
                    authorizationUrl: https://example.com/auth
                    scopes: {}
                    x-implicit-ext: true
                  password:
                    tokenUrl: https://example.com/token
                    scopes: {}
                    x-password-ext: true
                  clientCredentials:
                    tokenUrl: https://example.com/token
                    scopes: {}
                    x-client-credentials-ext: true
                  authorizationCode:
                    authorizationUrl: https://example.com/auth
                    tokenUrl: https://example.com/token
                    scopes: {}
                    x-authorization-code-ext: true
                    x-usePkce:
                      disableManualConfiguration: true
        `,
        ''
      ),
      config: await createConfig({
        plugins: [{ id: 'test', rules: { oas3: testRuleSet } }],
        rules: { 'test/stats': 'error' },
      }),
    });

    expect(statsAccumulator.xExtensions.counts).toEqual({
      'x-authorization-code-ext': 1,
      'x-callback-ext': 1,
      'x-client-credentials-ext': 1,
      'x-codeSamples': 1,
      'x-components-ext': 1,
      'x-contact-ext': 1,
      'x-discriminator-ext': 1,
      'x-encoding-ext': 1,
      'x-example-ext': 1,
      'x-external-docs-ext': 1,
      'x-header-ext': 1,
      'x-hideTryItPanel': 1,
      'x-implicit-ext': 1,
      'x-internal': 2,
      'x-license-ext': 1,
      'x-link-ext': 1,
      'x-media-type-ext': 1,
      'x-metadata': 1,
      'x-oauth2-flows-ext': 1,
      'x-password-ext': 1,
      'x-query': 2,
      'x-request-body-ext': 1,
      'x-response-ext': 1,
      'x-responses-ext': 1,
      'x-schema-ext': 1,
      'x-security-scheme-ext': 1,
      'x-server-ext': 1,
      'x-server-variable-ext': 1,
      'x-tag-ext': 1,
      'x-tag-group-ext': 1,
      'x-tagGroups': 1,
      'x-usePkce': 1,
      'x-webhooks': 1,
      'x-xml-ext': 1,
    });
    expect(statsAccumulator.xExtensions.total).toBe(34);
  });

  it('should not count standard keys that reach extension-typed nodes', async () => {
    const statsAccumulator = createOasStatsAccumulator();
    const testRuleSet: Oas3RuleSet = {
      stats: () => StatsOAS(statsAccumulator),
    };

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: parseYamlToDocument(
        outdent`
          openapi: 3.1.0
          info:
            title: t
            version: '1'
          webhooks:
            newPet:
              post:
                responses:
                  '200':
                    description: ok
          paths:
            /a:
              get:
                operationId: a
                requestBody:
                  content:
                    application/json:
                      examples:
                        first:
                          value: 1
                responses:
                  '200':
                    description: ok
        `,
        ''
      ),
      config: await createConfig({
        plugins: [{ id: 'test', rules: { oas3: testRuleSet } }],
        rules: { 'test/stats': 'error' },
      }),
    });

    expect(statsAccumulator.xExtensions.counts).toEqual({});
  });

  it('should count vendor extensions in Swagger 2.0 specific places, leaving scope names out', async () => {
    const statsAccumulator = createOasStatsAccumulator();
    const testRuleSet: Oas2RuleSet = {
      // the stats command reuses the OAS3-typed visitor for Swagger 2.0 documents
      stats: () => StatsOAS(statsAccumulator) as unknown as Oas2Visitor,
    };

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: parseYamlToDocument(
        outdent`
          swagger: '2.0'
          info:
            title: t
            version: '1'
            x-logo:
              url: https://example.com/logo.png
              x-logo-ext: true
          paths:
            /a:
              get:
                operationId: a
                parameters:
                  - name: filters
                    in: query
                    type: array
                    items:
                      type: string
                      x-items-ext: true
                responses:
                  '200':
                    description: ok
          securityDefinitions:
            oauth:
              type: oauth2
              flow: implicit
              authorizationUrl: https://example.com/auth
              scopes:
                read: Read access
                x-scopes-ext: internal note
        `,
        ''
      ),
      config: await createConfig({
        plugins: [{ id: 'test', rules: { oas2: testRuleSet } }],
        rules: { 'test/stats': 'error' },
      }),
    });

    expect(statsAccumulator.xExtensions.counts).toEqual({
      'x-items-ext': 1,
      'x-logo': 1,
      'x-logo-ext': 1,
      'x-scopes-ext': 1,
    });
  });

  it('should count vendor extensions in every AsyncAPI 2.x extension place', async () => {
    const statsAccumulator = createAsyncStatsAccumulator();
    const testRuleSet: Async2RuleSet = {
      stats: () => StatsAsync2(statsAccumulator) as unknown as Async2Visitor,
    };

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: parseYamlToDocument(
        outdent`
          asyncapi: 2.6.0
          x-root-ext: true
          info:
            title: t
            version: '1'
            x-info-ext: true
            contact:
              name: c
              x-contact-ext: true
            license:
              name: MIT
              x-license-ext: true
          externalDocs:
            url: https://example.com
            x-external-docs-ext: true
          tags:
            - name: events
              x-tag-ext: true
          servers:
            prod:
              url: mqtt://example.com
              protocol: mqtt
              x-server-ext: true
              variables:
                env:
                  default: prod
                  x-server-variable-ext: true
              bindings:
                x-server-bindings-ext: true
          channels:
            user/signedup:
              x-channel-ext: true
              bindings:
                x-channel-bindings-ext: true
              parameters:
                userId:
                  x-parameter-ext: true
                  schema:
                    type: string
              subscribe:
                operationId: userSignedUp
                x-operation-ext: true
                tags:
                  - name: events
                traits:
                  - x-operation-trait-ext: true
                bindings:
                  x-operation-bindings-ext: true
                message:
                  x-message-ext: true
                  correlationId:
                    location: $message.header#/id
                    x-correlation-id-ext: true
                  traits:
                    - x-message-trait-ext: true
                  bindings:
                    x-message-bindings-ext: true
                  examples:
                    - payload: {}
                      x-message-example-ext: true
                  payload:
                    $ref: '#/components/schemas/MySchema'
          components:
            x-components-ext: true
            schemas:
              MySchema:
                type: object
                x-schema-ext: true
            securitySchemes:
              oauth:
                type: oauth2
                x-security-scheme-ext: true
                flows:
                  x-flows-ext: true
                  implicit:
                    authorizationUrl: https://example.com/auth
                    scopes: {}
                    x-implicit-ext: true
                  password:
                    tokenUrl: https://example.com/token
                    scopes: {}
                    x-password-ext: true
                  clientCredentials:
                    tokenUrl: https://example.com/token
                    scopes: {}
                    x-client-credentials-ext: true
                  authorizationCode:
                    authorizationUrl: https://example.com/auth
                    tokenUrl: https://example.com/token
                    scopes: {}
                    x-authorization-code-ext: true
        `,
        ''
      ),
      config: await createConfig({
        plugins: [{ id: 'test', rules: { async2: testRuleSet } }],
        rules: { 'test/stats': 'error' },
      }),
    });

    expect(statsAccumulator.xExtensions.counts).toEqual({
      'x-authorization-code-ext': 1,
      'x-channel-bindings-ext': 1,
      'x-channel-ext': 1,
      'x-client-credentials-ext': 1,
      'x-components-ext': 1,
      'x-contact-ext': 1,
      'x-correlation-id-ext': 1,
      'x-external-docs-ext': 1,
      'x-flows-ext': 1,
      'x-implicit-ext': 1,
      'x-info-ext': 1,
      'x-license-ext': 1,
      'x-message-bindings-ext': 1,
      'x-message-example-ext': 1,
      'x-message-ext': 1,
      'x-message-trait-ext': 1,
      'x-operation-bindings-ext': 1,
      'x-operation-ext': 1,
      'x-operation-trait-ext': 1,
      'x-parameter-ext': 1,
      'x-password-ext': 1,
      'x-root-ext': 1,
      'x-schema-ext': 1,
      'x-security-scheme-ext': 1,
      'x-server-bindings-ext': 1,
      'x-server-ext': 1,
      'x-server-variable-ext': 1,
      'x-tag-ext': 1,
    });
    expect(statsAccumulator.xExtensions.total).toBe(28);
  });

  it('should count vendor extensions in every AsyncAPI 3.0 extension place', async () => {
    const statsAccumulator = createAsyncStatsAccumulator();
    const testRuleSet: Async3RuleSet = {
      stats: () => StatsAsync3(statsAccumulator) as unknown as Async3Visitor,
    };

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: parseYamlToDocument(
        outdent`
          asyncapi: 3.0.0
          x-root-ext: true
          info:
            title: t
            version: '1'
            x-info-ext: true
            contact:
              name: c
              x-contact-ext: true
            license:
              name: MIT
              x-license-ext: true
            externalDocs:
              url: https://example.com
              x-external-docs-ext: true
            tags:
              - name: events
                x-tag-ext: true
          servers:
            prod:
              host: example.com
              protocol: mqtt
              x-server-ext: true
              variables:
                env:
                  default: prod
                  x-server-variable-ext: true
              bindings:
                x-server-bindings-ext: true
          channels:
            userSignedup:
              address: user/signedup
              x-channel-ext: true
              bindings:
                x-channel-bindings-ext: true
              parameters:
                userId:
                  x-parameter-ext: true
              messages:
                userSignedUp:
                  x-message-ext: true
                  correlationId:
                    location: $message.header#/id
                    x-correlation-id-ext: true
                  traits:
                    - x-message-trait-ext: true
                  bindings:
                    x-message-bindings-ext: true
                  examples:
                    - payload: {}
                      x-message-example-ext: true
                  payload:
                    type: object
                    x-schema-ext: true
          operations:
            onSignup:
              action: receive
              channel:
                $ref: '#/channels/userSignedup'
              x-operation-ext: true
              tags:
                - name: events
              traits:
                - x-operation-trait-ext: true
              bindings:
                x-operation-bindings-ext: true
              reply:
                x-operation-reply-ext: true
                address:
                  location: $message.header#/replyTo
                  x-reply-address-ext: true
                channel:
                  $ref: '#/channels/userSignedup'
          components:
            x-components-ext: true
            schemas:
              MySchema:
                type: object
            securitySchemes:
              oauth:
                type: oauth2
                x-security-scheme-ext: true
                flows:
                  x-flows-ext: true
                  implicit:
                    authorizationUrl: https://example.com/auth
                    availableScopes: {}
                    x-implicit-ext: true
                  password:
                    tokenUrl: https://example.com/token
                    availableScopes: {}
                    x-password-ext: true
                  clientCredentials:
                    tokenUrl: https://example.com/token
                    availableScopes: {}
                    x-client-credentials-ext: true
                  authorizationCode:
                    authorizationUrl: https://example.com/auth
                    tokenUrl: https://example.com/token
                    availableScopes: {}
                    x-authorization-code-ext: true
        `,
        ''
      ),
      config: await createConfig({
        plugins: [{ id: 'test', rules: { async3: testRuleSet } }],
        rules: { 'test/stats': 'error' },
      }),
    });

    expect(statsAccumulator.xExtensions.counts).toEqual({
      'x-authorization-code-ext': 1,
      'x-channel-bindings-ext': 1,
      'x-channel-ext': 1,
      'x-client-credentials-ext': 1,
      'x-components-ext': 1,
      'x-contact-ext': 1,
      'x-correlation-id-ext': 1,
      'x-external-docs-ext': 1,
      'x-flows-ext': 1,
      'x-implicit-ext': 1,
      'x-info-ext': 1,
      'x-license-ext': 1,
      'x-message-bindings-ext': 1,
      'x-message-example-ext': 1,
      'x-message-ext': 1,
      'x-message-trait-ext': 1,
      'x-operation-bindings-ext': 1,
      'x-operation-ext': 1,
      'x-operation-reply-ext': 1,
      'x-operation-trait-ext': 1,
      'x-parameter-ext': 1,
      'x-password-ext': 1,
      'x-reply-address-ext': 1,
      'x-root-ext': 1,
      'x-schema-ext': 1,
      'x-security-scheme-ext': 1,
      'x-server-bindings-ext': 1,
      'x-server-ext': 1,
      'x-server-variable-ext': 1,
      'x-tag-ext': 1,
    });
    expect(statsAccumulator.xExtensions.total).toBe(30);
  });
});
