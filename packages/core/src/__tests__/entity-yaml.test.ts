import { entityFileSchema, entityFileDefaultSchema } from '@redocly/config';
import { describe, it, expect } from 'vitest';
import { createEntityTypes } from '../types/entity-yaml.js';
import { NormalizedNodeType, normalizeTypes, ResolveTypeFn } from '../types/index.js';
describe('entity-yaml', () => {
  it('should create entity types with discriminator', () => {
    const entityTypes = createEntityTypes(entityFileSchema, entityFileDefaultSchema);

    expect(entityTypes).toHaveProperty('user');
    expect(entityTypes).toHaveProperty('api-operation');
    expect(entityTypes).toHaveProperty('data-schema');
    expect(entityTypes).toHaveProperty('api-description');
    expect(entityTypes).toHaveProperty('service');
    expect(entityTypes).toHaveProperty('domain');
    expect(entityTypes).toHaveProperty('team');
    expect(entityTypes).toHaveProperty('EntityFileDefault');
    expect(entityTypes).toHaveProperty('EntityFileArray');
  });

  it('should resolve entity type to default for array items', () => {
    const entityTypes = createEntityTypes(entityFileSchema, entityFileDefaultSchema);
    const normalizedTypes = normalizeTypes(entityTypes);

    const entityFileArrayNode = normalizedTypes['EntityFileArray'];

    const unknownEntity = { key: 'unknown', title: 'Unknown' };
    const resolvedType = (entityFileArrayNode.items as ResolveTypeFn)(
      unknownEntity,
      'root'
    ) as NormalizedNodeType;

    expect(resolvedType).toBeTruthy();
    expect(resolvedType.name).toBe('EntityFileDefault');
  });

  it('should resolve entity type based on discriminator for array items', () => {
    const entityTypes = createEntityTypes(entityFileSchema, entityFileDefaultSchema);
    const normalizedTypes = normalizeTypes(entityTypes);

    const entityFileArrayNode = normalizedTypes['EntityFileArray'];
    const userEntity = {
      type: 'user',
      key: 'john-doe',
      title: 'John Doe',
      metadata: { email: 'john@example.com' },
    };
    const resolvedType = (entityFileArrayNode.items as ResolveTypeFn)(
      userEntity,
      'root'
    ) as NormalizedNodeType;

    expect(resolvedType).toBeTruthy();
    expect(resolvedType.name).toBe('user');
    expect(resolvedType.properties).toHaveProperty('metadata');
  });

  it('should have correct required fields for entity types', () => {
    const entityTypes = createEntityTypes(entityFileSchema, entityFileDefaultSchema);
    const normalizedTypes = normalizeTypes(entityTypes);

    const userNode = normalizedTypes['user'];
    expect(userNode.required).toContain('key');
    expect(userNode.required).toContain('title');
    expect(userNode.required).toContain('type');

    const defaultNode = normalizedTypes['EntityFileDefault'];
    expect(defaultNode.required).toContain('type');
    expect(defaultNode.required).toContain('key');
    expect(defaultNode.required).toContain('title');
  });
});
