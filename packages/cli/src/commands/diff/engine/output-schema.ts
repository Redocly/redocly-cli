const changeSideSchema = {
  type: 'object',
  properties: {
    pointer: { type: 'string' },
    value: {}, // any JSON value
  },
  required: ['pointer'],
  additionalProperties: false,
} as const;

// JSON Schema for the versioned `json` output format (spec §8).
export const DIFF_OUTPUT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    version: { const: '1' },
    specVersions: {
      type: 'object',
      properties: { base: { type: 'string' }, revision: { type: 'string' } },
      required: ['base', 'revision'],
      additionalProperties: false,
    },
    summary: {
      type: 'object',
      properties: {
        breaking: { type: 'integer', minimum: 0 },
        warning: { type: 'integer', minimum: 0 },
        nonBreaking: { type: 'integer', minimum: 0 },
      },
      required: ['breaking', 'warning', 'nonBreaking'],
      additionalProperties: false,
    },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pointer: { type: 'string' },
          property: { type: 'string' },
          kind: { enum: ['added', 'removed', 'changed'] },
          typeName: { type: 'string' },
          base: changeSideSchema,
          revision: changeSideSchema,
          compat: { enum: ['breaking', 'warning', 'non-breaking'] },
          ruleIds: { type: 'array', items: { type: 'string' } },
          message: { type: 'string' },
        },
        required: ['pointer', 'kind', 'typeName', 'compat'],
        additionalProperties: false,
      },
    },
  },
  required: ['version', 'specVersions', 'summary', 'changes'],
  additionalProperties: false,
} as const;
