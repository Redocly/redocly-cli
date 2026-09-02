// The object form of the `markdoc` option (schema selection and extension),
// alongside the boolean shorthand below. Every nested level is
// `additionalProperties: false` so a misspelled or removed key fails loudly
// instead of silently doing nothing — the same treatment a rule's own options
// get. The shape mirrors `MarkdocAttributeSchema`/`MarkdocTagSchema` in
// parser/markdoc/schema.ts, so a user's `extend.tags` entry is validated
// exactly like the built-in Realm schema.
const MARKDOC_ATTRIBUTE_SCHEMA = {
  type: 'object',
  properties: {
    type: { enum: ['string', 'number', 'boolean'] },
    required: { type: 'boolean' },
    // `oneOf` of single-type schemas, not a `type: [...]` union array: AJV's
    // strict mode (on by default -- see the `ajv` instance below) warns
    // "use allowUnionTypes" on the array form, and this avoids loosening
    // strict mode globally just for one field.
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
    // Preset names to expand before schema/semantic rule validation runs —
    // resolved in src/config/validate.ts via resolveExtends() (see
    // src/config/presets/index.ts). Not a rule; excluded from rule
    // iteration in validateSemantics().
    extends: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    // Applies to every rule, merged ahead of each rule's own `excludes`.
    // Not a rule; excluded from rule iteration in validateSemantics().
    excludes: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    // Path to the generated baseline file, relative to this config. Not a
    // rule; excluded from rule iteration in validateSemantics().
    baseline: { type: 'string', minLength: 1 },
    // Opt-in because Liquid/Jinja share the {% %} delimiters: default-on would
    // tokenize Jekyll/Hugo template syntax as Markdoc. `true` is shorthand for
    // `{ schema: 'realm' }` (see parser/markdoc/schema.ts's
    // resolveMarkdocConfig, which normalizes both forms); `schema: false`
    // still parses/pairs, just without a schema to validate tags/attributes
    // against. `extend.tags` layers a project's own custom tags over the
    // chosen base.
    //
    // `if`/`then`/`else` on `type`, not a flat `oneOf: [boolean, object]`. With
    // `allErrors: true`, AJV collects errors from every failing branch of a
    // `oneOf`, so an invalid object such as `{ schema: 'bogus' }` also failed
    // the boolean branch and reported a misleading `/markdoc: must be boolean`
    // ahead of the real problem. Routing each input shape to exactly one branch
    // means an object only sees the object-shaped errors, and anything else
    // only sees `must be boolean`.
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
              // Path to a YAML file of tag-name -> tag schema, resolved
              // relative to the config file's directory and read by
              // config/validate.ts (this module has no filesystem access).
              // Inline `tags` above override file entries on collision.
              tagsFile: { type: 'string', minLength: 1 },
            },
            // At least one of the two is required -- an `extend` with neither
            // is a no-op the user almost certainly didn't intend.
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
    // Originally `^recheck/[a-z0-9-_]+$` only, back when every rule key in
    // every config was `recheck/<name>`. Widened for the style-guide presets,
    // which namespace each preset's own rule ids by preset name
    // (`google/no-latinisms`,
    // `microsoft/use-contractions`, ...) precisely so two flagship presets
    // can be composed in one config without their rule keys colliding --
    // `recheck/<name>` remains valid (it's just the `recheck` namespace),
    // and any other lowercase-alpha-led namespace segment before the `/`
    // is now accepted too.
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
        // Structural shape only (string, or non-empty array of strings).
        // Term-level vocabulary/selector-syntax validation (the full scope
        // vocabulary, `~negation`, `&`-conjunction) happens post-schema in
        // src/config/validate.ts, which can produce a helpful per-term error
        // message — something AJV's enum/pattern errors can't do well. See
        // src/scopes/vocabulary.ts for the shared vocabulary list.
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
