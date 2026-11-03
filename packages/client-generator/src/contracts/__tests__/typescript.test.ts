import { logger } from '@redocly/openapi-core';

import { apiModel, operation, param, SCALAR } from '../../__tests__/fixtures.js';
import { operationSignature, templatePathParams, wrappableOperations } from '../typescript.js';

describe('operationSignature', () => {
  it('orders path params by URL-template position, keeping their wire names', () => {
    // Declared out of order; the path dictates order. The wire name is the key in the
    // `path` layer, so no binding identifier is derived from it any more.
    const params = templatePathParams(
      operation({
        path: '/x/{second}/y/{a-b}',
        pathParams: [param('a-b', 'path', true), param('second', 'path', true)],
      })
    );
    expect(params.map((param) => param.name)).toEqual(['second', 'a-b']);
  });

  it('drops a declared path param the template never mentions', () => {
    const params = templatePathParams(
      operation({ path: '/x', pathParams: [param('ghost', 'path', true)] })
    );
    expect(params).toEqual([]);
  });

  it('reports slot presence and hasInputs', () => {
    const none = operationSignature(operation({ path: '/x', method: 'get' }));
    expect(none).toMatchObject({
      hasQuery: false,
      hasBody: false,
      hasHeaders: false,
      hasInputs: false,
    });

    const all = operationSignature(
      operation({
        path: '/x/{id}',
        pathParams: [param('id', 'path', true)],
        queryParams: [param('q', 'query', false)],
        headerParams: [param('h', 'header', false)],
        requestBody: {
          contentType: 'application/json',
          schema: { kind: 'ref', name: 'Body' },
          required: false,
        },
      })
    );
    expect(all).toMatchObject({ hasQuery: true, hasBody: true, hasHeaders: true, hasInputs: true });
  });

  it('marks vars required when any input is required', () => {
    const required = operationSignature(
      operation({ path: '/x', queryParams: [param('q', 'query', true)] })
    );
    expect(required.varsRequired).toBe(true);

    const optional = operationSignature(
      operation({ path: '/x', queryParams: [param('q', 'query', false)] })
    );
    expect(optional).toMatchObject({ hasInputs: true, varsRequired: false });
  });

  it('derives the <Op>Variables type name from the (PascalCased) operation name', () => {
    expect(operationSignature(operation({ name: 'getPet' })).variablesTypeName).toBe(
      'GetPetVariables'
    );
  });
});

describe('wrappableOperations', () => {
  it('reports a skipped operation when an older ejected wrapper passes no reportFinding', () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const model = apiModel({
      services: [
        {
          name: 'Default',
          operations: [
            operation({
              name: 'streamEvents',
              method: 'get',
              path: '/events',
              successResponses: [{ contentType: 'text/event-stream', schema: SCALAR, status: 200 }],
            }),
          ],
        },
      ],
    });

    expect(wrappableOperations(model, 'swr')).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('swr skipped 1 server-sent-events operation(s)')
    );
  });
});
