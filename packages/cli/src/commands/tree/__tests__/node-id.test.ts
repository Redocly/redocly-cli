import { mapForeignLocation, mapRootPointer, parsePointerSegments } from '../node-id.js';

describe('parsePointerSegments', () => {
  it('splits and unescapes pointer fragments', () => {
    expect(parsePointerSegments('#/paths/~1pets~1{petId}/get')).toEqual([
      'paths',
      '/pets/{petId}',
      'get',
    ]);
    expect(parsePointerSegments('#/components/schemas/Tilde~0Name')).toEqual([
      'components',
      'schemas',
      'Tilde~Name',
    ]);
    expect(parsePointerSegments('#/')).toEqual([]);
    expect(parsePointerSegments('')).toEqual([]);
  });
});

describe('mapRootPointer', () => {
  it('maps the document root', () => {
    expect(mapRootPointer('#/', 'openapi.yaml')).toEqual({ id: 'openapi.yaml', kind: 'root' });
  });

  it('maps a path item', () => {
    expect(mapRootPointer('#/paths/~1pets', 'openapi.yaml')).toEqual({
      id: '/pets',
      kind: 'path',
      ancestry: [],
    });
  });

  it('maps an operation and everything nested in it', () => {
    expect(mapRootPointer('#/paths/~1pets/get', 'openapi.yaml')).toEqual({
      id: 'GET /pets',
      kind: 'operation',
      ancestry: ['/pets'],
    });
    expect(
      mapRootPointer(
        '#/paths/~1pets/post/requestBody/content/application~1json/schema',
        'openapi.yaml'
      )
    ).toEqual({ id: 'POST /pets', kind: 'operation', ancestry: ['/pets'] });
  });

  it('attributes callback sites to the outer operation', () => {
    expect(
      mapRootPointer(
        '#/paths/~1pets/post/callbacks/onEvent/{$request.body#~1url}/post/responses/200',
        'openapi.yaml'
      )
    ).toEqual({ id: 'POST /pets', kind: 'operation', ancestry: ['/pets'] });
  });

  it('maps path-level (non-method) members to the path', () => {
    expect(mapRootPointer('#/paths/~1pets/parameters/0', 'openapi.yaml')).toEqual({
      id: '/pets',
      kind: 'path',
      ancestry: [],
    });
  });

  it('maps x-query operations', () => {
    expect(mapRootPointer('#/paths/~1pets/x-query', 'openapi.yaml')).toEqual({
      id: 'X-QUERY /pets',
      kind: 'operation',
      ancestry: ['/pets'],
    });
  });

  it('maps OAS3 components and nested pointers inside them', () => {
    expect(mapRootPointer('#/components/schemas/Pet', 'openapi.yaml')).toEqual({
      id: 'schemas/Pet',
      kind: 'component',
    });
    expect(mapRootPointer('#/components/schemas/User/properties/address', 'openapi.yaml')).toEqual({
      id: 'schemas/User',
      kind: 'component',
    });
  });

  it('maps OAS2 root sections as components', () => {
    expect(mapRootPointer('#/definitions/Pet', 'openapi.yaml')).toEqual({
      id: 'definitions/Pet',
      kind: 'component',
    });
    expect(mapRootPointer('#/securityDefinitions/api_key', 'openapi.yaml')).toEqual({
      id: 'securityDefinitions/api_key',
      kind: 'component',
    });
  });

  it('falls back to the first two segments for other root-level sites', () => {
    expect(mapRootPointer('#/webhooks/newPet/post/requestBody', 'openapi.yaml')).toEqual({
      id: 'webhooks/newPet',
      kind: 'component',
      ancestry: [],
    });
    expect(mapRootPointer('#/servers/0', 'openapi.yaml')).toEqual({
      id: 'servers/0',
      kind: 'component',
      ancestry: [],
    });
    expect(mapRootPointer('#/info', 'openapi.yaml')).toEqual({
      id: 'info',
      kind: 'component',
      ancestry: [],
    });
  });
});

describe('mapForeignLocation', () => {
  it('maps a component section inside another file to a canonical ref id', () => {
    expect(mapForeignLocation('common.yaml', '#/components/schemas/Pet/properties/x')).toEqual({
      id: 'common.yaml#/components/schemas/Pet',
      kind: 'component',
      file: 'common.yaml',
    });
    expect(mapForeignLocation('legacy.yaml', '#/definitions/Pet')).toEqual({
      id: 'legacy.yaml#/definitions/Pet',
      kind: 'component',
      file: 'legacy.yaml',
    });
  });

  it('maps anything else to the whole file', () => {
    expect(mapForeignLocation('schemas/pet.yaml', '#/')).toEqual({
      id: 'schemas/pet.yaml',
      kind: 'file',
      file: 'schemas/pet.yaml',
    });
    expect(mapForeignLocation('schemas/pet.yaml', '#/properties/name')).toEqual({
      id: 'schemas/pet.yaml',
      kind: 'file',
      file: 'schemas/pet.yaml',
    });
  });

  it('treats a path-item parameters array as the whole file, not an OAS2 component', () => {
    expect(mapForeignLocation('paths/pets.yaml', '#/parameters/0')).toEqual({
      id: 'paths/pets.yaml',
      kind: 'file',
      file: 'paths/pets.yaml',
    });
  });

  it('still maps a named OAS2 parameters component in another file', () => {
    expect(mapForeignLocation('common.yaml', '#/parameters/PetId')).toEqual({
      id: 'common.yaml#/parameters/PetId',
      kind: 'component',
      file: 'common.yaml',
    });
  });

  it('treats a path-item parameters array as the whole file, not an OAS2 component', () => {
    expect(mapForeignLocation('paths/pets.yaml', '#/parameters/0')).toEqual({
      id: 'paths/pets.yaml',
      kind: 'file',
      file: 'paths/pets.yaml',
    });
  });

  it('still maps a named OAS2 parameters component in another file', () => {
    expect(mapForeignLocation('common.yaml', '#/parameters/PetId')).toEqual({
      id: 'common.yaml#/parameters/PetId',
      kind: 'component',
      file: 'common.yaml',
    });
  });
});
