import { describe, it, expect } from 'vitest';
import { createEntityTypes } from '../types/entity-yaml.js';
import { NormalizedNodeType, normalizeTypes, ResolveTypeFn } from '../types/index.js';
import { entityFileSchema, entityFileDefaultSchema } from '@redocly/config';
import { outdent } from 'outdent';
describe('entity-yaml', () => {
  it('should create entity types with discriminator', () => {
    const { entityTypes } = createEntityTypes(entityFileSchema, entityFileDefaultSchema);

    expect(entityTypes).toHaveProperty('UserEntity');
    expect(entityTypes).toHaveProperty('ApiOperationEntity');
    expect(entityTypes).toHaveProperty('DataSchemaEntity');
    expect(entityTypes).toHaveProperty('ApiDescriptionEntity');
    expect(entityTypes).toHaveProperty('ServiceEntity');
    expect(entityTypes).toHaveProperty('DomainEntity');
    expect(entityTypes).toHaveProperty('TeamEntity');
    expect(entityTypes).toHaveProperty('Entity');
    expect(entityTypes).toHaveProperty('EntityFileArray');
  });

  it('should resolve entity type to default for array items', () => {
    const { entityTypes } = createEntityTypes(entityFileSchema, entityFileDefaultSchema);
    const normalizedTypes = normalizeTypes(entityTypes);

    const entityFileArrayNode = normalizedTypes['EntityFileArray'];

    const unknownEntity = { key: 'unknown', title: 'Unknown' };
    const resolvedType = (entityFileArrayNode.items as ResolveTypeFn)(
      unknownEntity,
      'root'
    ) as NormalizedNodeType;

    expect(resolvedType).toBeTruthy();
    expect(resolvedType.name).toBe('UserEntity'); // Falls back to first type when discriminator fails
  });

  it('should resolve entity type based on discriminator for array items', () => {
    const { entityTypes } = createEntityTypes(entityFileSchema, entityFileDefaultSchema);
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
    expect(resolvedType.name).toBe('UserEntity');
    expect(resolvedType.properties).toHaveProperty('metadata');
  });

  it('should have correct required fields for entity types', () => {
    const { entityTypes } = createEntityTypes(entityFileSchema, entityFileDefaultSchema);
    const normalizedTypes = normalizeTypes(entityTypes);

    const userNode = normalizedTypes['UserEntity'];
    expect(userNode.required).toContain('key');
    expect(userNode.required).toContain('title');
    expect(userNode.required).toContain('type');

    const defaultNode = normalizedTypes['Entity'];
    expect(defaultNode.required).toContain('type');
    expect(defaultNode.required).toContain('key');
    expect(defaultNode.required).toContain('title');
  });

  it('should correctly discriminate between different entity types in an array', async () => {
    const { lintEntityFile } = await import('../lint.js');
    const { makeDocumentFromString, BaseResolver } = await import('../resolve.js');

    const entities = outdent`
    - type: user
      key: john-doe
      title: John Doe
      metadata:
        name: John

    - type: service
      key: payment-service
      metadata:
        owner: john-doe
    `;

    const externalRefResolver = new BaseResolver();

    const entityProblems = await lintEntityFile({
      document: makeDocumentFromString(entities, 'entities.yaml'),
      entitySchema: entityFileSchema,
      entityDefaultSchema: entityFileDefaultSchema,
      externalRefResolver,
    });

    expect(entityProblems.length).toBeGreaterThan(0);

    const userError = entityProblems.find(
      (p) => p.message.includes('email') && p.location[0].pointer === '#/0/metadata'
    );
    expect(userError).toBeDefined();
    expect(userError?.ruleId).toBe('entity struct');

    const serviceError = entityProblems.find(
      (p) => p.message.includes('title') && p.location[0].pointer === '#/1'
    );
    expect(serviceError).toBeDefined();
    expect(serviceError?.ruleId).toBe('entity struct');
  });
});
