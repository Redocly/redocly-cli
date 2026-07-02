import { describe, expect, test } from 'vitest';

import { createConfig } from '../config/index.js';
import { detectSpec } from '../detect-spec.js';
import { lintFromString } from '../lint.js';

describe('Open-RPC support', () => {
  const openRpcDocument = JSON.stringify({
    openrpc: '1.2.6',
    info: {
      title: 'Petstore',
      version: '1.0.0',
    },
    methods: [
      {
        name: 'listPets',
        params: [],
        result: {
          name: 'pets',
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/Pet' },
          },
        },
      },
    ],
    components: {
      schemas: {
        Pet: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
          },
          required: ['id', 'name'],
        },
      },
    },
  });

  test('detects Open-RPC 1.x', () => {
    const parsed = JSON.parse(openRpcDocument);
    expect(detectSpec(parsed)).toBe('openrpc1');
  });

  test('lints valid Open-RPC document', async () => {
    const config = await createConfig({
      extends: ['recommended'],
      rules: { 'info-license': 'off' },
    });
    const result = await lintFromString({
      source: openRpcDocument,
      config,
    });

    expect(result).toEqual([]);
  });

  test('lints invalid Open-RPC document (structural error)', async () => {
    const invalidDocument = JSON.stringify({
      openrpc: '1.2.6',
      info: {
        // missing version
        title: 'Petstore',
      },
      methods: [],
    });

    const config = await createConfig({
      extends: ['recommended'],
      rules: { 'info-license': 'off' },
    });
    const result = await lintFromString({
      source: invalidDocument,
      config,
    });

    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('struct');
    expect(result[0].message).toContain('The field `version` must be present on this level');
  });

  test('lints invalid Open-RPC document (missing required field)', async () => {
    const invalidDocument = JSON.stringify({
      openrpc: '1.2.6',
      // missing info
      methods: [],
    });

    const config = await createConfig({
      extends: ['recommended'],
      rules: { 'info-license': 'off' },
    });
    const result = await lintFromString({
      source: invalidDocument,
      config,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].ruleId).toBe('struct');
    expect(result[0].message).toContain('The field `info` must be present on this level');
  });

  test('reports unused components', async () => {
    const documentWithUnused = JSON.stringify({
      openrpc: '1.2.6',
      info: {
        title: 'Petstore',
        version: '1.0.0',
      },
      methods: [
        {
          name: 'listPets',
          params: [],
          result: {
            name: 'pets',
            schema: {
              type: 'array',
              items: { $ref: '#/components/schemas/Pet' },
            },
          },
        },
      ],
      components: {
        schemas: {
          Pet: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
          UnusedPet: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
        },
      },
    });

    const config = await createConfig({
      rules: { 'no-unused-components': 'error' },
    });
    const result = await lintFromString({
      source: documentWithUnused,
      config,
    });

    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('no-unused-components');
    expect(result[0].message).toContain('Component: "UnusedPet" is never used.');
  });

  test('reports duplicated method parameters', async () => {
    const documentWithDuplicates = JSON.stringify({
      openrpc: '1.2.6',
      info: { title: 'Petstore', version: '1.0.0' },
      methods: [
        {
          name: 'listPets',
          params: [
            { name: 'limit', schema: { type: 'integer' } },
            { name: 'limit', schema: { type: 'integer' } },
          ],
          result: { name: 'pets', schema: { type: 'array' } },
        },
      ],
    });

    const config = await createConfig({
      rules: { 'spec-no-duplicated-method-params': 'error' },
    });
    const result = await lintFromString({
      source: documentWithDuplicates,
      config,
    });

    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('spec-no-duplicated-method-params');
    expect(result[0].message).toContain("Duplicate parameter name 'limit' found.");
  });

  test('reports required parameters after optional ones', async () => {
    const documentWithBadOrder = JSON.stringify({
      openrpc: '1.2.6',
      info: { title: 'Petstore', version: '1.0.0' },
      methods: [
        {
          name: 'listPets',
          params: [
            { name: 'optionalParam', required: false, schema: { type: 'integer' } },
            { name: 'requiredParam', required: true, schema: { type: 'integer' } },
          ],
          result: { name: 'pets', schema: { type: 'array' } },
        },
      ],
    });

    const config = await createConfig({
      rules: { 'spec-no-required-params-after-optional': 'error' },
    });
    const result = await lintFromString({
      source: documentWithBadOrder,
      config,
    });

    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('spec-no-required-params-after-optional');
    expect(result[0].message).toContain(
      "Required parameter 'requiredParam' must be positioned before optional parameters."
    );
  });
});
