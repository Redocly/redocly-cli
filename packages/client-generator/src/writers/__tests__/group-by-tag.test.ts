import type { ApiModel, OperationModel } from '../../ir/model.js';
import { groupByTag, sanitizeTagStem } from '../group-by-tag.js';

function op(name: string, tags: string[] = []): OperationModel {
  return {
    name,
    method: 'get',
    path: `/${name}`,
    pathParams: [],
    queryParams: [],
    headerParams: [],
    successResponses: [],
    errorResponses: [],
    security: [],
    tags,
  };
}

function model(ops: OperationModel[]): ApiModel {
  return {
    title: 'T',
    version: '1.0.0',
    serverUrl: '',
    services: [{ name: 'Default', operations: ops }],
    schemas: [],
    securitySchemes: [],
  };
}

describe('sanitizeTagStem', () => {
  it('keeps safe characters and replaces the rest with dashes', () => {
    expect(sanitizeTagStem('Pets')).toBe('Pets');
    expect(sanitizeTagStem('Pet Store')).toBe('Pet-Store');
    expect(sanitizeTagStem('pets/v2')).toBe('pets-v2');
    expect(sanitizeTagStem('a.b.c')).toBe('a-b-c');
  });

  it('collapses repeats and trims edge dashes', () => {
    expect(sanitizeTagStem('  **weird**  ')).toBe('weird');
  });

  it('falls back to `tag` when nothing survives', () => {
    expect(sanitizeTagStem('***')).toBe('tag');
  });
});

describe('groupByTag', () => {
  it('assigns each operation to its first tag, in first-seen order', () => {
    const groups = groupByTag(
      model([op('a', ['pets', 'public']), op('b', ['orders']), op('c', ['pets'])]),
      'client'
    );
    expect(groups.map((g) => g.stem)).toEqual(['pets', 'orders']);
    expect(groups[0].operations.map((o) => o.name)).toEqual(['a', 'c']);
    expect(groups[1].operations.map((o) => o.name)).toEqual(['b']);
  });

  it('routes untagged operations to the `default` group', () => {
    const groups = groupByTag(model([op('health')]), 'client');
    expect(groups).toHaveLength(1);
    expect(groups[0].stem).toBe('default');
    expect(groups[0].operations.map((o) => o.name)).toEqual(['health']);
  });

  it('de-duplicates stems that collide after sanitization', () => {
    const groups = groupByTag(model([op('a', ['Pet Store']), op('b', ['Pet/Store'])]), 'client');
    expect(groups.map((g) => g.stem)).toEqual(['Pet-Store', 'Pet-Store-2']);
  });

  it('reserves the anchor stem so a tag cannot overwrite the entry file', () => {
    const groups = groupByTag(model([op('a', ['client'])]), 'client');
    expect(groups[0].stem).toBe('client-2');
  });
});
