import {
  parameterAddedRequired,
  parameterBecameRequired,
  parameterRemoved,
} from '../classify/rules/parameter-rules.js';
import { mediaTypeRemoved, responseRemoved } from '../classify/rules/response-rules.js';
import type { RawChange, RuleContext } from '../types.js';

function ctx(polarity: RuleContext['polarity']): RuleContext {
  return { polarity, specVersion: 'oas3_1', base: () => undefined, revision: () => undefined };
}

describe('parameter rules', () => {
  it('parameter-removed: breaking in request, silent in response context', () => {
    const change: RawChange = {
      pointer: '#/paths/~1p/get/parameters/{query:limit}',
      kind: 'removed',
      typeName: 'Parameter',
      base: { pointer: '#/paths/~1p/get/parameters/0', value: { name: 'limit', in: 'query' } },
    };
    expect(parameterRemoved.visit(change, ctx('request'))?.compat).toBe('breaking');
    expect(parameterRemoved.visit(change, ctx('response'))).toBeUndefined();
  });

  it('parameter-added-required: breaking only when the new parameter is required', () => {
    const added = (required?: boolean): RawChange => ({
      pointer: '#/paths/~1p/get/parameters/{query:limit}',
      kind: 'added',
      typeName: 'Parameter',
      revision: {
        pointer: '#/paths/~1p/get/parameters/0',
        value: { name: 'limit', in: 'query', ...(required === undefined ? {} : { required }) },
      },
    });
    expect(parameterAddedRequired.visit(added(true), ctx('request'))?.compat).toBe('breaking');
    expect(parameterAddedRequired.visit(added(false), ctx('request'))).toBeUndefined();
    expect(parameterAddedRequired.visit(added(), ctx('request'))).toBeUndefined();
  });

  it('parameter-became-required: breaking when required flips to true in request', () => {
    const change: RawChange = {
      pointer: '#/paths/~1p/get/parameters/{query:limit}',
      property: 'required',
      kind: 'changed',
      typeName: 'Parameter',
      base: { pointer: '#/paths/~1p/get/parameters/0/required', value: undefined },
      revision: { pointer: '#/paths/~1p/get/parameters/0/required', value: true },
    };
    expect(parameterBecameRequired.visit(change, ctx('request'))?.compat).toBe('breaking');
    expect(parameterBecameRequired.visit(change, ctx('response'))).toBeUndefined();

    const relaxed: RawChange = {
      ...change,
      base: { pointer: change.base!.pointer, value: true },
      revision: { pointer: change.revision!.pointer, value: false },
    };
    expect(parameterBecameRequired.visit(relaxed, ctx('request'))).toBeUndefined();
  });
});

describe('response rules', () => {
  it('response-removed is breaking', () => {
    const change: RawChange = {
      pointer: '#/paths/~1p/get/responses/200',
      kind: 'removed',
      typeName: 'Response',
      base: { pointer: '#/paths/~1p/get/responses/200', value: { description: 'OK' } },
    };
    expect(responseRemoved.visit(change, ctx('response'))?.compat).toBe('breaking');
  });

  it('media-type-removed is breaking in any polarity', () => {
    const change: RawChange = {
      pointer: '#/paths/~1p/get/responses/200/content/application~1json',
      kind: 'removed',
      typeName: 'MediaType',
      base: { pointer: '#/paths/~1p/get/responses/200/content/application~1json', value: {} },
    };
    expect(mediaTypeRemoved.visit(change, ctx('response'))?.compat).toBe('breaking');
    expect(mediaTypeRemoved.visit(change, ctx('request'))?.compat).toBe('breaking');
  });
});
