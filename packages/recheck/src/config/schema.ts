// Shape of one Markdoc tag attribute. It matches `MarkdocAttributeSchema` in
// parser/markdoc/schema.ts. Unknown keys are errors.
const MARKDOC_ATTRIBUTE_SCHEMA = {
  type: 'object',
  properties: {
    type: { enum: ['string', 'number', 'boolean'] },
    required: { type: 'boolean' },
    // `oneOf` instead of a `type` array, because AJV strict mode warns about the array form.
    default: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
    enum: { type: 'array', items: { type: 'string' }, minItems: 1 },
    dynamic: { type: 'boolean' },
  },
  required: ['type'],
  additionalProperties: false,
};

export const MARKDOC_TAG_SCHEMA = {
  type: 'object',
  properties: {
    selfClosing: { type: 'boolean' },
    attributes: {
      type: 'object',
      additionalProperties: MARKDOC_ATTRIBUTE_SCHEMA,
    },
  },
  additionalProperties: false,
};

export const RECHECK_CONFIG_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    // Preset names, expanded in validate.ts before validation. Not a rule.
    extends: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    // Applies to every rule, before each rule's own `excludes`. Not a rule.
    excludes: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    // Off by default, because Liquid and Jinja use the same {% %} delimiters.
    // `true` means `{ schema: 'realm' }`. `schema: false` parses Markdoc without
    // checking tags against a schema.
    //
    // Uses `if`/`then`/`else` instead of `oneOf: [boolean, object]`, because
    // `oneOf` would also report "must be boolean" for an invalid object.
    markdoc: {
      if: { type: 'object' },
      then: {
        type: 'object',
        properties: {
          schema: { enum: ['realm', false] },
          extend: {
            type: 'object',
            properties: {
              tags: { type: 'object', additionalProperties: MARKDOC_TAG_SCHEMA },
              // YAML file of tag schemas, relative to the config file. Inline `tags` win over it.
              tagsFile: { type: 'string', minLength: 1 },
            },
            anyOf: [{ required: ['tags'] }, { required: ['tagsFile'] }],
            additionalProperties: false,
          },
        },
        required: ['schema'],
        additionalProperties: false,
      },
      else: { type: 'boolean' },
    },
  },
  patternProperties: {
    // Rule keys are `<namespace>/<name>`, for example `recheck/x` or
    // `google/no-latinisms`. Presets use their own namespace so they can be
    // combined without key clashes.
    '^[a-z][a-z0-9-]*/[a-z0-9-_]+$': {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          enum: ['off', 'info', 'warn', 'error'],
          default: 'error',
        },
        message: {
          type: 'string',
          minLength: 1,
        },
        fix: {
          type: 'boolean',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        description: {
          type: 'string',
        },
        link: {
          type: 'string',
          format: 'uri',
        },
        // Only the shape is checked here. validate.ts checks each scope term
        // afterwards, so it can give a better error message.
        scope: {
          oneOf: [
            { type: 'string', minLength: 1 },
            {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              minItems: 1,
            },
          ],
          default: 'all',
        },
        appliesTo: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        excludes: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        exceptions: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            lines: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          additionalProperties: false,
        },
        assertions: {
          type: 'object',
          additionalProperties: true,
          minProperties: 1,
        },
      },
      required: ['severity', 'message', 'assertions'],
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};
