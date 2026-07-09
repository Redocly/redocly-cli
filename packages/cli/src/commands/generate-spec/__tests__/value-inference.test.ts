import { extractSchemaComponents } from '../components.js';
import {
  type GeneratedDocument,
  inferSchema,
  type JsonSchema,
  mergeSchemas,
} from '../generator.js';
import { applyValueInference } from '../value-inference.js';

function documentWithSchema(schema: JsonSchema, path = '/things/{thingId}'): GeneratedDocument {
  return {
    openapi: '3.1.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      [path]: {
        get: {
          operationId: 'read',
          responses: {
            '200': { description: 'ok', content: { 'application/json': { schema } } },
          },
        },
      },
    },
  };
}

function inferredResponseSchema(
  document: GeneratedDocument,
  path = '/things/{thingId}'
): JsonSchema {
  return document.paths[path].get.responses['200'].content!['application/json'].schema;
}

function inferMerged(values: unknown[]): JsonSchema {
  return mergeSchemas(values.map(inferSchema));
}

describe('applyValueInference', () => {
  it('detects well-known string formats from a single observation', () => {
    const schema = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(
          inferSchema({
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            createdAt: '2024-06-01T10:30:00Z',
            birthday: '1990-01-31',
            email: 'ada@example.com',
            website: 'https://example.com/ada',
            lastIp: '192.168.0.1',
            name: 'Ada',
          })
        )
      )
    );

    expect(schema.properties?.id).toEqual({ type: 'string', format: 'uuid' });
    expect(schema.properties?.createdAt).toEqual({ type: 'string', format: 'date-time' });
    expect(schema.properties?.birthday).toEqual({ type: 'string', format: 'date' });
    expect(schema.properties?.email).toEqual({ type: 'string', format: 'email' });
    expect(schema.properties?.website).toEqual({ type: 'string', format: 'uri' });
    expect(schema.properties?.lastIp).toEqual({ type: 'string', format: 'ipv4' });
    expect(schema.properties?.name).toEqual({ type: 'string' });
  });

  it('drops a format as soon as one observed value does not match it', () => {
    const schema = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(
          inferMerged([{ ref: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }, { ref: 'latest' }])
        )
      )
    );

    expect(schema.properties?.ref).toEqual({ type: 'string' });
  });

  it('detects an enum from repeated identifier-like values', () => {
    const schema = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(
          inferMerged([
            { status: 'active' },
            { status: 'inactive' },
            { status: 'active' },
            { status: 'inactive' },
          ])
        )
      )
    );

    expect(schema.properties?.status).toEqual({ type: 'string', enum: ['active', 'inactive'] });
  });

  it('does not emit an enum without enough repeated observations', () => {
    const twoObservations = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(inferMerged([{ status: 'active' }, { status: 'inactive' }]))
      )
    );
    expect(twoObservations.properties?.status).toEqual({ type: 'string' });

    const noRepetition = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(
          inferMerged([{ name: 'Ada' }, { name: 'Grace' }, { name: 'Linus' }, { name: 'Barbara' }])
        )
      )
    );
    expect(noRepetition.properties?.name).toEqual({ type: 'string' });
  });

  it('does not emit an enum for free-text or identifier-token values', () => {
    const freeText = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(
          inferMerged([
            { note: 'out of stock' },
            { note: 'out of stock' },
            { note: 'back soon' },
            { note: 'back soon' },
          ])
        )
      )
    );
    expect(freeText.properties?.note).toEqual({ type: 'string' });

    const hexTokens = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(
          inferMerged([
            { blob: 'a3f5c9d2e8b1470f' },
            { blob: 'a3f5c9d2e8b1470f' },
            { blob: 'b4e6d0e3f9c2581a' },
            { blob: 'b4e6d0e3f9c2581a' },
          ])
        )
      )
    );
    expect(hexTokens.properties?.blob).toEqual({ type: 'string' });
  });

  it('applies formats but not enums to nullable string unions', () => {
    const schema = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(
          inferMerged([
            { deletedAt: '2024-06-01T10:30:00Z', kind: 'a' },
            { deletedAt: null, kind: 'b' },
            { deletedAt: '2024-06-02T11:00:00Z', kind: 'a' },
            { deletedAt: null, kind: 'b' },
          ])
        )
      )
    );

    expect(schema.properties?.deletedAt).toEqual({ type: ['string', 'null'], format: 'date-time' });
    expect(schema.properties?.kind).toEqual({ type: 'string', enum: ['a', 'b'] });
  });

  it('prefers a format over an enum when both would apply', () => {
    const schema = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(
          inferMerged([
            { contact: 'a@example.com' },
            { contact: 'b@example.com' },
            { contact: 'a@example.com' },
            { contact: 'b@example.com' },
          ])
        )
      )
    );

    expect(schema.properties?.contact).toEqual({ type: 'string', format: 'email' });
  });

  it('gives up on an enum once too many distinct values were observed', () => {
    const samples = Array.from({ length: 24 }, (_, index) => ({ code: `code${index % 12}` }));
    const schema = inferredResponseSchema(
      applyValueInference(documentWithSchema(inferMerged(samples)))
    );

    expect(schema.properties?.code).toEqual({ type: 'string' });
  });

  it('pools observations across operations into an extracted component', () => {
    const document: GeneratedDocument = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'list',
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': {
                    schema: inferMerged([
                      { id: 1, role: 'admin' },
                      { id: 2, role: 'member' },
                    ]),
                  },
                },
              },
            },
          },
        },
        '/users/{userId}': {
          get: {
            operationId: 'read',
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': {
                    schema: inferMerged([
                      { id: 3, role: 'admin' },
                      { id: 4, role: 'admin' },
                    ]),
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = applyValueInference(extractSchemaComponents(document));

    expect(result.components?.schemas.User.properties?.role).toEqual({
      type: 'string',
      enum: ['admin', 'member'],
    });
  });

  it('infers enums for repeated array item values', () => {
    const schema = inferredResponseSchema(
      applyValueInference(
        documentWithSchema(inferSchema({ tags: ['new', 'sale', 'new', 'sale'], id: 1 }))
      )
    );

    expect(schema.properties?.tags).toEqual({
      type: 'array',
      items: { type: 'string', enum: ['new', 'sale'] },
    });
  });
});
