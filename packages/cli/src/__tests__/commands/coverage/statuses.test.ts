import type { Schema } from '../../../commands/coverage/engine/schema.js';
import {
  collectStatuses,
  createStatusUse,
  matchStatusKey,
  recordStatus,
  summarizeStatuses,
} from '../../../commands/coverage/engine/statuses.js';

const SPEC: Schema = {
  paths: {
    '/things': {
      get: {
        operationId: 'listThings',
        responses: { '200': {}, '404': {}, default: {} },
      },
    },
  },
};

describe('matchStatusKey', () => {
  it('prefers the exact status over the class and the default', () => {
    expect(matchStatusKey(['200', '2XX', 'default'], 200)).toBe('200');
  });

  it('falls back to the class when the exact status is absent', () => {
    expect(matchStatusKey(['2XX', 'default'], 201)).toBe('2XX');
  });

  it('accepts the lowercase class form, as drift does', () => {
    expect(matchStatusKey(['2xx', 'default'], 201)).toBe('2xx');
  });

  it('falls back to default last', () => {
    expect(matchStatusKey(['200', 'default'], 503)).toBe('default');
  });

  it('matches nothing when the description documents no fitting response', () => {
    expect(matchStatusKey(['200'], 503)).toBeUndefined();
  });
});

describe('collectStatuses', () => {
  it('lists the responses each operation documents', () => {
    expect(collectStatuses(SPEC).get('get /things')).toEqual(['200', '404', 'default']);
  });
});

describe('summarizeStatuses', () => {
  const declared = collectStatuses(SPEC);

  it('reports the documented responses the traffic never produced', () => {
    const use = createStatusUse();
    recordStatus(use, 'get /things', 200, ['200', '404', 'default']);

    const result = summarizeStatuses(declared, use);

    expect(result.unused).toEqual(['GET /things  404', 'GET /things  default']);
    expect(result).toMatchObject({ seen: 1, total: 3 });
  });

  it('counts a status reached through its class', () => {
    const spec: Schema = { paths: { '/x': { get: { responses: { '2XX': {} } } } } };
    const use = createStatusUse();
    recordStatus(use, 'get /x', 201, ['2XX']);

    expect(summarizeStatuses(collectStatuses(spec), use)).toMatchObject({
      seen: 1,
      total: 1,
      unused: [],
    });
  });

  it('reports every response when nothing reached the operation', () => {
    expect(summarizeStatuses(declared, createStatusUse())).toMatchObject({ seen: 0, total: 3 });
  });
});
