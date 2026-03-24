import {
  normalizeTypes,
  getTypes,
  normalizeVisitors,
  walkDocument,
  resolveDocument,
  BaseResolver,
  Source,
  parseYaml,
  type Document,
  type WalkContext,
} from '@redocly/openapi-core';
import { outdent } from 'outdent';

const yaml = (source: string) => parseYaml(source) as Record<string, unknown>;

import {
  createScoreAccumulator,
  createScoreVisitor,
  createSchemaWalkState,
  resetSchemaWalkState,
  createSchemaMetricVisitor,
  getDocumentMetrics,
} from '../collectors/document-metrics.js';
import type { DocumentMetrics } from '../types.js';

async function collectDocumentMetrics(doc: Record<string, unknown>): Promise<DocumentMetrics> {
  const types = normalizeTypes(getTypes('oas3_0'), {});
  const source = new Source('test.yaml', JSON.stringify(doc));
  const document: Document = { source, parsed: doc };
  const externalRefResolver = new BaseResolver();
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });
  const ctx: WalkContext = {
    problems: [],
    specVersion: 'oas3_0',
    visitorsData: {},
  };

  const schemaWalkState = createSchemaWalkState();
  const schemaVisitor = createSchemaMetricVisitor(schemaWalkState);
  const normalizedSchemaVis = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'test-schema', visitor: schemaVisitor }],
    types
  );

  const walkSchema = (schemaNode: any) => {
    resetSchemaWalkState(schemaWalkState);
    walkDocument({
      document: { ...document, parsed: schemaNode },
      rootType: types.Schema,
      normalizedVisitors: normalizedSchemaVis,
      resolvedRefMap,
      ctx,
    });
    return {
      maxDepth: schemaWalkState.maxDepth,
      polymorphismCount: schemaWalkState.polymorphismCount,
      anyOfCount: schemaWalkState.anyOfCount,
      hasDiscriminator: schemaWalkState.hasDiscriminator,
      propertyCount: schemaWalkState.propertyCount,
      totalSchemaProperties: schemaWalkState.totalSchemaProperties,
      schemaPropertiesWithDescription: schemaWalkState.schemaPropertiesWithDescription,
      constraintCount: schemaWalkState.constraintCount,
      hasPropertyExamples: schemaWalkState.hasPropertyExamples,
      writableTopLevelFields: schemaWalkState.writableTopLevelFields,
      refsUsed: [...schemaWalkState.refsUsed],
    };
  };

  const accumulator = createScoreAccumulator(walkSchema);
  const visitor = createScoreVisitor(accumulator);
  const normalizedVis = normalizeVisitors([{ severity: 'warn', ruleId: 'test', visitor }], types);
  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizedVis,
    resolvedRefMap,
    ctx,
  });
  return getDocumentMetrics(accumulator);
}

describe('collectDocumentMetrics', () => {
  it('returns zero operations for empty paths', async () => {
    const result = await collectDocumentMetrics(
      yaml(outdent`
        openapi: 3.0.0
        info:
          title: Test
          version: '1.0'
        paths: {}
      `)
    );
    expect(result.operationCount).toBe(0);
    expect(result.operations.size).toBe(0);
  });

  it('counts operations, uses operationId as key or falls back to METHOD /path', async () => {
    const result = await collectDocumentMetrics(
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
    expect(result.operationCount).toBe(3);
    expect(result.operations.has('listItems')).toBe(true);
    expect(result.operations.has('getItem')).toBe(true);
    expect(result.operations.has('POST /items')).toBe(true);
  });

  it('counts parameters, resolves $refs, merges path-level params, and detects ambiguous names', async () => {
    const result = await collectDocumentMetrics(
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

    const op = result.operations.get('getItem')!;
    expect(op.parameterCount).toBe(3);
    expect(op.requiredParameterCount).toBe(1);
    expect(op.paramsWithDescription).toBe(2);
    expect(op.ambiguousIdentifierCount).toBe(1);
  });

  it('detects request body with $ref schema, examples, constraints, and property descriptions', async () => {
    const result = await collectDocumentMetrics(
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

    const op = result.operations.get('createItem')!;
    expect(op.requestBodyPresent).toBe(true);
    expect(op.requestExamplePresent).toBe(true);
    expect(op.propertyCount).toBe(2);
    expect(op.constraintCount).toBe(2);
    expect(op.schemaPropertiesWithDescription).toBe(1);
  });

  it('resolves response $refs, counts structured errors, and computes schema depth', async () => {
    const result = await collectDocumentMetrics(
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

    const op = result.operations.get('listItems')!;
    expect(op.responseExamplePresent).toBe(true);
    expect(op.maxResponseSchemaDepth).toBe(3);
    expect(op.totalErrorResponses).toBe(3);
    expect(op.structuredErrorResponseCount).toBe(3);
  });

  it('detects operation descriptions and tracks shared $ref usage across operations', async () => {
    const result = await collectDocumentMetrics(
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

    expect(result.operations.get('listItems')!.operationDescriptionPresent).toBe(true);
    expect(result.operations.get('createItem')!.operationDescriptionPresent).toBe(false);
    expect(result.operations.get('listItems')!.refsUsed.has('#/components/schemas/Item')).toBe(
      true
    );
    expect(result.operations.get('createItem')!.refsUsed.has('#/components/schemas/Item')).toBe(
      true
    );
    expect(result.operations.get('listItems')!.responseExamplePresent).toBe(true);
  });
});
