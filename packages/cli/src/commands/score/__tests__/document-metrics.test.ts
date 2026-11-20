import { parseYaml } from '@redocly/openapi-core';
import { outdent } from 'outdent';

import { DEFAULT_SCORING_CONSTANTS } from '../constants.js';
import type { ScoringConstants } from '../types.js';
import { collectDocumentMetrics } from './collect-metrics-helper.js';

const yaml = (source: string) => parseYaml(source) as Record<string, unknown>;

describe('collectDocumentMetrics', () => {
  it('returns zero operations for empty paths', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths: {}
      `)
    );
    expect(metrics.operationCount).toBe(0);
    expect(metrics.operations.size).toBe(0);
  });

  it('counts operations, uses operationId as key or falls back to METHOD /path', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths:
          /items:
            get:
              operationId: listItems
              responses:
                '200':
                  description: OK
            post:
              responses:
                '201':
                  description: Created
          /items/{id}:
            get:
              operationId: getItem
              responses:
                '200':
                  description: OK
      `)
    );
    expect(metrics.operationCount).toBe(3);
    expect(metrics.operations.has('listItems')).toBe(true);
    expect(metrics.operations.has('getItem')).toBe(true);
    expect(metrics.operations.has('POST /items')).toBe(true);
  });

  it('counts parameters, resolves $refs, merges path-level params, and detects ambiguous names', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths:
          /items/{id}:
            parameters:
              - name: id
                in: path
                required: true
                description: Item ID
            get:
              operationId: getItem
              parameters:
                - $ref: '#/components/parameters/Fields'
                - name: type
                  in: query
              responses:
                '200':
                  description: OK
        components:
          parameters:
            Fields:
              name: fields
              in: query
              description: Select fields
      `)
    );

    const op = metrics.operations.get('getItem')!;
    expect(op.parameterCount).toBe(3);
    expect(op.requiredParameterCount).toBe(1);
    expect(op.paramsWithDescription).toBe(2);
    expect(op.ambiguousIdentifierCount).toBe(1);
  });

  it('detects request body with $ref schema, examples, constraints, and property descriptions', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths:
          /items:
            post:
              operationId: createItem
              requestBody:
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Item'
                    example:
                      name: Widget
                      price: 10
              responses:
                '201':
                  description: Created
        components:
          schemas:
            Item:
              type: object
              properties:
                name:
                  type: string
                  description: Item name
                  minLength: 1
                price:
                  type: integer
                  minimum: 0
      `)
    );

    const op = metrics.operations.get('createItem')!;
    expect(op.requestBodyPresent).toBe(true);
    expect(op.requestExamplePresent).toBe(true);
    expect(op.totalSchemaProperties).toBe(2);
    expect(op.constraintCount).toBe(2);
    expect(op.schemaPropertiesWithDescription).toBe(1);
  });

  it('resolves response $refs, counts structured errors, and computes schema depth', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths:
          /items:
            get:
              operationId: listItems
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          items:
                            type: array
                            items:
                              type: object
                              properties:
                                name:
                                  type: string
                      example:
                        items:
                          - name: test
                '400':
                  $ref: '#/components/responses/BadRequest'
                '404':
                  description: Not found
                default:
                  description: Unexpected error
        components:
          responses:
            BadRequest:
              description: Bad request
              content:
                application/json:
                  schema:
                    type: object
      `)
    );

    const op = metrics.operations.get('listItems')!;
    expect(op.responseExamplePresent).toBe(true);
    expect(op.maxResponseSchemaDepth).toBe(3);
    expect(op.totalErrorResponses).toBe(3);
    expect(op.structuredErrorResponseCount).toBe(3);
  });

  it('records whether a success response of an operation declares a body', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.1.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        paths:
          /orders/{orderId}:
            get:
              operationId: getOrder
              responses:
                '200':
                  description: Order details.
                  content:
                    application/json:
                      schema:
                        type: object
            delete:
              operationId: cancelOrder
              responses:
                '204':
                  description: Order cancelled.
      `)
    );

    expect(metrics.operations.get('getOrder')!.responseBodyPresent).toBe(true);
    expect(metrics.operations.get('cancelOrder')!.responseBodyPresent).toBe(false);
  });

  it('counts a shared response for every operation that references it', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.1.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        paths:
          /orders/{orderId}:
            get:
              operationId: getOrder
              responses:
                '200':
                  $ref: '#/components/responses/Order'
                '404':
                  $ref: '#/components/responses/NotFound'
            patch:
              operationId: updateOrder
              responses:
                '200':
                  $ref: '#/components/responses/Order'
                '404':
                  $ref: '#/components/responses/NotFound'
        components:
          responses:
            Order:
              description: Order details.
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      id:
                        type: string
                      status:
                        type: string
                  example:
                    id: ord_1
                    status: placed
            NotFound:
              description: Not found.
              content:
                application/problem+json:
                  schema:
                    type: object
      `)
    );

    for (const operationId of ['getOrder', 'updateOrder']) {
      expect(metrics.operations.get(operationId)).toMatchObject({
        responseBodyPresent: true,
        responseExamplePresent: true,
        totalSchemaProperties: 2,
        totalErrorResponses: 1,
        structuredErrorResponseCount: 1,
      });
    }
  });

  it('counts error responses only toward error clarity', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.1.0
        info:
          title: Redocly Cafe
          version: 1.0.0
        paths:
          /orders/{orderId}:
            delete:
              operationId: deleteOrder
              responses:
                '204':
                  description: Order deleted successfully.
                '404':
                  description: Not found.
                  content:
                    application/problem+json:
                      schema:
                        $ref: '#/components/schemas/Error'
                      example:
                        title: Not found
        components:
          schemas:
            Error:
              type: object
              properties:
                title:
                  type: string
      `)
    );

    const deleteOrder = metrics.operations.get('deleteOrder')!;
    expect(deleteOrder).toMatchObject({
      responseBodyPresent: false,
      responseExamplePresent: false,
      totalSchemaProperties: 0,
      maxResponseSchemaDepth: 0,
      totalErrorResponses: 1,
      structuredErrorResponseCount: 1,
    });
    expect(deleteOrder.refsUsed.size).toBe(0);
  });

  it('treats OpenAPI 3.1 wildcard error codes 4XX and 5XX as errors', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.1.0
        info:
          title: Test
          version: '1.0'
        paths:
          /items:
            get:
              operationId: listItems
              responses:
                '200':
                  description: OK
                '4XX':
                  description: Client error
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          code:
                            type: string
                '5xx':
                  description: Server error
                  content:
                    application/json:
                      schema:
                        type: object
      `)
    );

    const op = metrics.operations.get('listItems')!;
    expect(op.totalErrorResponses).toBe(2);
    expect(op.structuredErrorResponseCount).toBe(2);
  });

  it('when media types tie on property count, keeps doc + constraint metrics from the stronger schema', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths:
          /items:
            post:
              operationId: samePropTie
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        a:
                          type: string
                        b:
                          type: string
                          description: B only
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                            description: A
                          b:
                            type: string
                            description: B
      `)
    );

    const op = metrics.operations.get('samePropTie')!;
    expect(op.totalSchemaProperties).toBe(2);
    expect(op.schemaPropertiesWithDescription).toBe(2);
  });

  it('keeps polymorphismCount and anyOfCount from the same schema (max effective polymorphism across media types)', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths:
          /items:
            post:
              operationId: mixedPoly
              requestBody:
                content:
                  application/json:
                    schema:
                      oneOf:
                        - type: string
                        - type: number
                        - type: boolean
                        - type: object
                        - type: array
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        anyOf:
                          - type: object
                          - type: object
                          - type: object
      `)
    );

    const op = metrics.operations.get('mixedPoly')!;
    // Request alone: poly 5 / anyOf 0 (effective 5). Response alone: poly 3 / anyOf 3 (effective 6 with multiplier 2).
    // Must not mix into poly 5 + anyOf 3 (invalid effective 11).
    expect(op.polymorphismCount).toBe(3);
    expect(op.anyOfCount).toBe(3);
  });

  it('uses scoringConstants.anyOfPenaltyMultiplier when rolling up polymorphism across media types', async () => {
    const doc = yaml(outdent`
      openapi: 3.0.0
      info:
        title: Test
        version: '1.0'
      paths:
        /items:
          post:
            operationId: mixedPoly
            requestBody:
              content:
                application/json:
                  schema:
                    oneOf:
                      - type: string
                      - type: number
                      - type: boolean
                      - type: object
                      - type: array
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      anyOf:
                        - type: object
                        - type: object
                        - type: object
    `);
    const lowMultiplier: ScoringConstants = {
      ...DEFAULT_SCORING_CONSTANTS,
      weights: {
        ...DEFAULT_SCORING_CONSTANTS.weights,
        anyOfPenaltyMultiplier: 1,
      },
    };
    const { metrics } = await collectDocumentMetrics(doc, { scoringConstants: lowMultiplier });
    const op = metrics.operations.get('mixedPoly')!;
    // With multiplier 1, response effective = 3; request = 5 — request branch should win.
    expect(op.polymorphismCount).toBe(5);
    expect(op.anyOfCount).toBe(0);
  });

  it('applies max-branch counting to both oneOf and anyOf when both are present', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths:
          /items:
            post:
              operationId: bothOneOfAndAnyOf
              requestBody:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        common:
                          type: string
                      oneOf:
                        - type: object
                          properties:
                            a:
                              type: string
                        - type: object
                          properties:
                            b1:
                              type: string
                            b2:
                              type: string
                            b3:
                              type: string
                            b4:
                              type: string
                            b5:
                              type: string
                      anyOf:
                        - type: object
                          properties:
                            p1:
                              type: string
                            p2:
                              type: string
                            p3:
                              type: string
                        - type: object
                          properties:
                            q:
                              type: string
      `)
    );

    const op = metrics.operations.get('bothOneOfAndAnyOf')!;
    // Parent: 1 prop. oneOf max branch: 5 props. anyOf max branch: 3 props (not 3+1 summed from both anyOf branches).
    expect(op.totalSchemaProperties).toBe(9);
  });

  it('detects operation descriptions and tracks shared $ref usage across operations', async () => {
    const { metrics } = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths:
          /items:
            get:
              operationId: listItems
              description: List all items
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        $ref: '#/components/schemas/Item'
            post:
              operationId: createItem
              requestBody:
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Item'
              responses:
                '201':
                  description: Created
        components:
          schemas:
            Item:
              type: object
              properties:
                id:
                  type: string
                  example: abc123
      `)
    );

    expect(metrics.operations.get('listItems')!.operationDescriptionPresent).toBe(true);
    expect(metrics.operations.get('createItem')!.operationDescriptionPresent).toBe(false);
    expect(metrics.operations.get('listItems')!.refsUsed.has('#/components/schemas/Item')).toBe(
      true
    );
    expect(metrics.operations.get('createItem')!.refsUsed.has('#/components/schemas/Item')).toBe(
      true
    );
    expect(metrics.operations.get('listItems')!.responseExamplePresent).toBe(true);
  });
});
