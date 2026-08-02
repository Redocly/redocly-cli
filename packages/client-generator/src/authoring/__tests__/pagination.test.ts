import type { OperationModel } from '../../intermediate-representation/model.js';
import { paginationRuleFor } from '../pagination.js';

function op(extra: Partial<OperationModel> = {}): OperationModel {
  return {
    name: 'listOrders',
    specName: 'listOrders',
    method: 'get',
    path: '/orders',
    tags: [],
    pathParams: [],
    queryParams: [
      { name: 'after', in: 'query', required: false, schema: { kind: 'scalar', scalar: 'string' } },
    ],
    headerParams: [],
    cookieParams: [],
    security: [],
    successResponses: [],
    errorResponses: [],
    ...extra,
  } as unknown as OperationModel;
}

const CURSOR = { style: 'cursor', cursorParam: 'after', nextCursor: '/next', items: '/items' };

describe('paginationRuleFor', () => {
  it('per-operation config beats the x-redocly-pagination extension', () => {
    const operation = op({ paginationExtension: { ...CURSOR, items: '/fromExtension' } });
    const rule = paginationRuleFor(operation, { operations: { listOrders: CURSOR } })!;
    expect(rule).toEqual({
      style: 'cursor',
      param: 'after',
      nextCursor: '/next',
      items: '/items',
    });
  });

  it('falls back to the extension, then to a fitting convention', () => {
    expect(paginationRuleFor(op({ paginationExtension: CURSOR }), undefined)).toMatchObject({
      style: 'cursor',
      param: 'after',
    });
    // Convention fits: the advance param exists on the operation.
    expect(paginationRuleFor(op(), CURSOR)).toMatchObject({ style: 'cursor', param: 'after' });
    // Convention does not fit: no such query param.
    expect(paginationRuleFor(op(), { ...CURSOR, cursorParam: 'ghost' })).toBeUndefined();
  });

  it('honors exclude and returns undefined without any source', () => {
    expect(
      paginationRuleFor(op({ paginationExtension: CURSOR }), { exclude: ['listOrders'] })
    ).toBeUndefined();
    expect(paginationRuleFor(op(), undefined)).toBeUndefined();
  });
});
