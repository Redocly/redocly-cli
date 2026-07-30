import { summarize } from '../../../commands/coverage/engine/analyse.js';
import type { Schema } from '../../../commands/coverage/engine/schema.js';
import { createCoverage } from '../../../commands/coverage/engine/walk.js';

const SPEC: Schema = {
  paths: {
    '/thing': {
      parameters: [{ name: 'x', in: 'query' }],
      get: { operationId: 'getThing', tags: ['things'], responses: {} },
      put: { operationId: 'putThing', tags: ['things'], responses: {} },
    },
    '/other': {
      get: { operationId: 'getOther', responses: {} },
    },
  },
  components: { schemas: {} },
};

function report(exercised: string[]) {
  return summarize(SPEC, createCoverage(), { total: 0, withBody: 0 }, undefined, new Set(exercised));
}

describe('operation coverage', () => {
  it('counts operations the traffic reached', () => {
    expect(report(['get /thing']).operations).toMatchObject({ seen: 1, total: 3 });
  });

  it('lists the operations nothing reached', () => {
    expect(report(['get /thing']).operations.unused).toEqual([
      'GET /other  getOther',
      'PUT /thing  putThing',
    ]);
  });

  it('reports every operation as unused when there is no traffic', () => {
    expect(report([]).operations).toMatchObject({ seen: 0, total: 3 });
  });

  it('reports none unused once every operation is reached', () => {
    expect(report(['get /thing', 'put /thing', 'get /other']).operations.unused).toEqual([]);
  });

  it('ignores a path-level parameters entry, which is not an operation', () => {
    expect(report([]).operations.total).toBe(3);
  });
});

describe('a path item behind a $ref', () => {
  const REFERENCED: Schema = {
    paths: {
      '/thing': { $ref: '#/components/pathItems/Thing' },
    },
    components: {
      pathItems: {
        Thing: { get: { operationId: 'getThing', responses: {} } },
      },
      schemas: {},
    },
  };

  it('counts the operations the referenced path item declares', () => {
    const result = summarize(REFERENCED, createCoverage(), { total: 0, withBody: 0 }, undefined, new Set(['get /thing']));

    expect(result.operations).toMatchObject({ seen: 1, total: 1, unused: [] });
  });
});
