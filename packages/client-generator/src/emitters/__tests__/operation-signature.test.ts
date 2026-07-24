import { operationSignature } from '../operation-signature.js';
import { operation, param } from './fixtures.js';

describe('operationSignature', () => {
  it('orders path params by URL-template position and assigns unique identifiers', () => {
    // Declared out of order; the path dictates order. `a-b` sanitizes to `a_b`.
    const sig = operationSignature(
      operation({
        path: '/x/{second}/y/{a-b}',
        pathParams: [param('a-b', 'path', true), param('second', 'path', true)],
      })
    );
    expect(sig.pathParams.map((p) => p.param.name)).toEqual(['second', 'a-b']);
    expect(sig.pathParams.map((p) => p.ident)).toEqual(['second', 'a_b']);
  });

  it('renames a path param binding that would collide with the trailing init argument', () => {
    // The wire name stays `init` (the flat sugar remaps `{ init: init_2 }`); only the
    // local binding moves aside for the trailing `init: RequestOptions` parameter.
    const sig = operationSignature(
      operation({ path: '/x/{init}', pathParams: [param('init', 'path', true)] })
    );
    expect(sig.pathParams.map((p) => p.ident)).toEqual(['init_2']);
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
