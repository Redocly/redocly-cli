import { entityFileDefaultSchema, entityFileSchema } from '@redocly/config';
import { outdent } from 'outdent';
import { describe, it, expect } from 'vitest';

import { lintEntityFile, lintEntityWithScorecardLevel } from '../lint-entity.js';
import { makeDocumentFromString } from '../resolve.js';
import type { NormalizedProblem } from '../walk.js';

describe('lint-entity', () => {
  describe('lintEntityFile', () => {
    it('should lint a valid user entity file', async () => {
      const entityYaml = outdent`
        type: user
        key: john-doe
        title: John Doe
        summary: Senior Software Engineer
        metadata:
          email: john@example.com
        tags:
          - engineering
      `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBe(0);
    });

    it('should detect missing required fields in entity', async () => {
      const entityYaml = outdent`
        type: user
        key: john-doe
        # Missing required 'title' field
        metadata:
          email: john@example.com
      `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('title'))).toBe(true);
    });

    it('should lint array of entities', async () => {
      const entitiesYaml = outdent`
        - type: user
          key: john-doe
          title: John Doe
          metadata:
            email: john@example.com
        
        - type: service
          key: api-service
          title: API Service
          summary: Core API service
        
        - type: api-description
          key: users-api
          title: Users API
          metadata:
            specType: openapi
            descriptionFile: users-api.yaml
      `;

      const document = makeDocumentFromString(entitiesYaml, '/entities.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBe(0);
    });

    it('should use default schema when type is missing', async () => {
      const entityYaml = outdent`
        key: unknown-entity
        title: Unknown Entity
        summary: An entity without a type field
      `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('type'))).toBe(true);
    });

    it('should detect missing metadata.email for user entity', async () => {
      const entityYaml = outdent`
        type: user
        key: john-doe
        title: John Doe
        metadata:
          name: John
      `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('email'))).toBe(true);
    });

    it('should detect missing metadata for user entity', async () => {
      const entityYaml = outdent`
        type: user
        key: john-doe
        title: John Doe
      `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('metadata'))).toBe(true);
    });

    it('should not validate patterns with Struct rule', async () => {
      const entityYaml = outdent`
        type: service
        key: Invalid_Key_With_Underscores
        title: Invalid Service
      `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBe(1);
      expect(problems[0].ruleId).toBe('entity key-valid');
      expect(problems[0].message).toContain('lowercase letters');
    });

    it('should detect missing metadata fields for specific entity types', async () => {
      const entityYaml = outdent`
        type: api-description
        key: my-api
        title: My API
        metadata:
          specType: openapi
          # Missing descriptionFile
      `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
    });

    it('should detect invalid entity type in array', async () => {
      const entitiesYaml = outdent`
        - type: user
          key: john-doe
          title: John Doe
          metadata:
            email: john@example.com
        
        - type: service
          key: invalid-service
          # Missing required title field
      `;

      const document = makeDocumentFromString(entitiesYaml, '/entities.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.message.includes('title'))).toBe(true);
    });

    it('should validate service entity without metadata', async () => {
      const entityYaml = outdent`
        type: service
        key: my-service
        title: My Service
        summary: A simple service
      `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBe(0);
    });

    it('should detect invalid relation type', async () => {
      const entityYaml = outdent`
        type: service
        key: my-service
        title: My Service
        relations:
          - type: invalidRelationType
            key: some-entity
      `;

      const document = makeDocumentFromString(entityYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      expect(
        problems.some(
          (p) =>
            p.message.toLowerCase().includes('enum') ||
            p.message.includes('invalidRelationType') ||
            p.message.includes('type')
        )
      ).toBe(true);
    });

    it('should validate type-specific metadata fields correctly', async () => {
      const apiOperationYaml = outdent`
        type: api-operation
        key: test-operation
        title: Test Operation
        metadata:
          wrongField: value
      `;

      const document = makeDocumentFromString(apiOperationYaml, '/entity.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      const hasMethodOrPathError = problems.some(
        (p) => p.message.includes('method') || p.message.includes('path')
      );
      const hasEmailError = problems.some((p) => p.message.includes('email'));

      expect(hasEmailError).toBe(false);
      expect(hasMethodOrPathError).toBe(true);
    });

    it('should validate different metadata schemas in array of mixed entity types', async () => {
      const mixedEntitiesYaml = outdent`
        - type: api-description
          key: my-api
          title: My API
          metadata:
            specType: openapi
            # Missing descriptionFile
        
        - type: api-operation
          key: my-operation
          title: My Operation
          metadata:
            wrongField: value
            # Missing method and path
        
        - type: data-schema
          key: my-schema
          title: My Schema
          metadata:
            wrongField: value
            # Missing specType
      `;

      const document = makeDocumentFromString(mixedEntitiesYaml, '/entities.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);

      const hasDescriptionFileError = problems.some((p) => p.message.includes('descriptionFile'));

      const hasMethodError = problems.some((p) => p.message.includes('method'));
      const hasPathError = problems.some((p) => p.message.includes('path'));

      const hasSpecTypeError = problems.some((p) => p.message.includes('specType'));

      const hasEmailError = problems.some((p) => p.message.includes('email'));

      expect(hasDescriptionFileError).toBe(true);
      expect(hasMethodError).toBe(true);
      expect(hasPathError).toBe(true);
      expect(hasSpecTypeError).toBe(true);

      expect(hasEmailError).toBe(false);
    });

    it('should handle entity without type in array using default schema', async () => {
      const mixedEntitiesYaml = outdent`
        - type: user
          key: valid-user
          title: Valid User
          metadata:
            email: user@example.com
        
        - key: no-type-entity
          title: Entity Without Type
          summary: This entity is missing the type field
          # Missing type - should use EntityFileDefault schema
        
        - type: service
          key: valid-service
          title: Valid Service
      `;

      const document = makeDocumentFromString(mixedEntitiesYaml, '/entities.yaml');

      const problems = await lintEntityFile({
        document,
        entitySchema: entityFileSchema,
        entityDefaultSchema: entityFileDefaultSchema,
      });

      expect(problems.length).toBeGreaterThan(0);
      const hasTypeError = problems.some((p) => p.message.includes('type'));

      expect(hasTypeError).toBe(true);
    });
  });

  describe('lintEntityWithScorecardLevel', () => {
    it('should lint entity with EntityMetadata property assertions', async () => {
      const entity = {
        type: 'user',
        key: 'john-doe',
        title: 'John Doe',
        metadata: {
          name: '@@john', // Invalid: contains special characters
          email: 'john@example.com',
        },
      };

      const scorecardLevel = {
        name: 'Basic',
        rules: {
          'rule/has_name_pattern': {
            subject: {
              type: 'EntityMetadata',
              property: 'name',
            },
            severity: 'error',
            message: 'Name must match the pattern',
            assertions: {
              pattern: '^[a-z]+$',
              defined: true,
            },
          },
        },
      };

      const problems = await lintEntityWithScorecardLevel(entity, scorecardLevel);

      expect(problems.length).toBeGreaterThan(0);
      expect(
        problems.some((p: NormalizedProblem) => p.message.includes('Name must match the pattern'))
      ).toBe(true);
      expect(problems.some((p: NormalizedProblem) => p.ruleId === 'rule/has_name_pattern')).toBe(
        true
      );
    });

    it('should pass validation when metadata property matches pattern', async () => {
      const entity = {
        type: 'user',
        key: 'john-doe',
        title: 'John Doe',
        metadata: {
          name: 'john',
          email: 'john@example.com',
        },
      };

      const scorecardLevel = {
        name: 'Basic',
        rules: {
          'rule/has_name_pattern': {
            subject: {
              type: 'EntityMetadata',
              property: 'name',
            },
            severity: 'error',
            message: 'Name must match the pattern',
            assertions: {
              pattern: '^[a-z]+$',
              defined: true,
            },
          },
        },
      };

      const problems = await lintEntityWithScorecardLevel(entity, scorecardLevel);

      expect(problems.length).toBe(0);
    });

    it('should throw error when rules are not defined', async () => {
      const entity = {
        type: 'user',
        key: 'john-doe',
        title: 'John Doe',
        metadata: {
          email: 'john@example.com',
        },
      };

      const scorecardLevel = {
        name: 'Basic',
      };

      await expect(lintEntityWithScorecardLevel(entity, scorecardLevel)).rejects.toThrow(
        'Scorecard level "Basic" has no rules defined.'
      );
    });

    it('should validate Entity property assertions', async () => {
      const entity = {
        type: 'user',
        key: 'john-doe',
        title: 'John Doe',
        metadata: {
          email: 'john@example.com',
        },
        // Missing 'foo' property
      };

      const scorecardLevel = {
        name: 'Basic',
        rules: {
          'rule/has_foo_property': {
            subject: {
              type: 'Entity',
              property: 'foo',
            },
            severity: 'error',
            message: 'FOO is required',
            assertions: {
              defined: true,
              nonEmpty: true,
            },
          },
        },
      };

      const problems = await lintEntityWithScorecardLevel(entity, scorecardLevel);

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p: NormalizedProblem) => p.message.includes('FOO is required'))).toBe(
        true
      );
      expect(problems.some((p: NormalizedProblem) => p.ruleId === 'rule/has_foo_property')).toBe(
        true
      );
    });

    it('should lint API rules for api-description entity type', async () => {
      const entity = {
        type: 'api-description',
        key: 'my-api',
        title: 'My API',
        metadata: {
          specType: 'openapi',
          descriptionFile: 'openapi.yaml',
        },
      };

      const documentYaml = outdent`
        openapi: 3.0.0
        info:
          title: Test API
          version: "1.0"
          # Missing license
        servers:
          - url: http://example.com
        paths: {}
      `;

      const document = makeDocumentFromString(documentYaml, 'openapi.yaml');

      const scorecardLevel = {
        name: 'Basic',
        rules: {
          'info-license': 'error',
        },
      };

      const problems = await lintEntityWithScorecardLevel(entity, scorecardLevel, document);

      expect(problems.some((p: NormalizedProblem) => p.ruleId === 'info-license')).toBe(true);
    });

    it('should throw error when schema is not found in document for data-schema entity', async () => {
      const entity = {
        type: 'data-schema',
        key: 'user-schema',
        title: 'User',
        metadata: {
          specType: 'openapi',
          schema: JSON.stringify({
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
          }),
        },
      };

      const documentYaml = outdent`
        openapi: 3.0.0
        info:
          title: Test API
          version: "1.0"
        paths: {}
        components:
          schemas:
            User:
              type: object
              properties:
                name:
                  type: string
                # Missing age property - schema doesn't match entity
      `;

      const document = makeDocumentFromString(documentYaml, 'openapi.yaml');

      const scorecardLevel = {
        name: 'Basic',
        rules: {
          'rule/has_items_in_schema': {
            subject: {
              type: 'Schema',
            },
            assertions: {
              required: ['items'],
            },
          },
        },
      };

      await expect(lintEntityWithScorecardLevel(entity, scorecardLevel, document)).rejects.toThrow(
        'Schema "User" not found in the document.'
      );
    });

    it('should lint data-schema entity with Schema assertions', async () => {
      const entity = {
        type: 'data-schema',
        key: 'user-schema',
        title: 'User',
        metadata: {
          specType: 'openapi',
          schema: JSON.stringify({
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            // Missing 'items' property
          }),
        },
      };

      const documentYaml = outdent`
        openapi: 3.0.0
        info:
          title: Test API
          version: "1.0"
        paths: {}
        components:
          schemas:
            User:
              type: object
              properties:
                name:
                  type: string
      `;

      const document = makeDocumentFromString(documentYaml, 'openapi.yaml');

      const scorecardLevel = {
        name: 'Basic',
        rules: {
          'rule/has_items_in_schema': {
            subject: {
              type: 'Schema',
            },
            assertions: {
              required: ['items'],
            },
          },
        },
      };

      const problems = await lintEntityWithScorecardLevel(entity, scorecardLevel, document);

      expect(problems.some((p: NormalizedProblem) => p.ruleId === 'rule/has_items_in_schema')).toBe(
        true
      );
    });

    it('should throw error for non-Schema custom API rules on data-schema entity', async () => {
      const entity = {
        type: 'data-schema',
        key: 'user-schema',
        title: 'User',
        metadata: {
          specType: 'openapi',
          schema: JSON.stringify({
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          }),
        },
      };

      const documentYaml = outdent`
        openapi: 3.0.0
        info:
          title: Test API
          version: "1.0"
        paths: {}
        components:
          schemas:
            User:
              type: object
              properties:
                name:
                  type: string
      `;

      const document = makeDocumentFromString(documentYaml, 'openapi.yaml');

      const scorecardLevel = {
        name: 'Basic',
        rules: {
          'rule/has_items_in_schema': {
            subject: {
              type: 'PathItem', // Invalid: should be Schema
            },
            assertions: {
              required: ['items'],
            },
          },
        },
      };

      await expect(lintEntityWithScorecardLevel(entity, scorecardLevel, document)).rejects.toThrow(
        'API rules for "data-schema" entity must target Schema subject'
      );
    });

    it('should throw error when API rules are provided for non-API entity type', async () => {
      const entity = {
        type: 'user',
        key: 'john-doe',
        title: 'John Doe',
        metadata: {
          email: 'john@example.com',
        },
      };

      const scorecardLevel = {
        name: 'Basic',
        rules: {
          'info-license': 'error',
        },
      };

      await expect(lintEntityWithScorecardLevel(entity, scorecardLevel)).rejects.toThrow(
        'API rules are not supported for entity type "user"'
      );
    });

    it('should handle mixed entity and API rules for api-description', async () => {
      const entity = {
        type: 'api-description',
        key: 'my-api',
        title: 'My API',
        metadata: {
          name: '123invalid', // Invalid pattern
          specType: 'openapi',
          descriptionFile: 'openapi.yaml',
        },
      };

      const documentYaml = outdent`
        openapi: 3.0.0
        info:
          title: Test API
          version: "1.0"
          # Missing license
        servers:
          - url: http://example.com
        paths: {}
      `;

      const document = makeDocumentFromString(documentYaml, 'openapi.yaml');

      const scorecardLevel = {
        name: 'Basic',
        rules: {
          'rule/has_name_pattern': {
            subject: {
              type: 'EntityMetadata',
              property: 'name',
            },
            severity: 'error',
            message: 'Name must match the pattern',
            assertions: {
              pattern: '^[a-z]+$',
              defined: true,
            },
          },
          'info-license': 'error',
        },
      };

      const problems = await lintEntityWithScorecardLevel(entity, scorecardLevel, document);

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p: NormalizedProblem) => p.ruleId === 'rule/has_name_pattern')).toBe(
        true
      );
      expect(problems.some((p: NormalizedProblem) => p.ruleId === 'info-license')).toBe(true);
    });
  });
});
