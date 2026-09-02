import Ajv from '@redocly/ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {
  resolveMarkdocConfig,
  type MarkdocSchema,
  type MarkdocTagSchema,
  type MarkdocUserConfig,
  type ResolvedExtend,
} from '../parser/markdoc/schema.js';
import { resolveAssertion } from '../rules/registry.js';
import { resolveDictionaryPaths } from '../rules/scope/spelling.js';
import type { TokenRule } from '../rules/types.js';
import { tokenizeSelector, wholeDocumentKeywordProblems } from '../scopes/selector.js';
import { validateScopeSelector } from '../scopes/vocabulary.js';
import type { RecheckConfig, NormalizedRule, ValidationError, BaseRule } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { resolveExtends } from './presets/index.js';
import { RECHECK_CONFIG_SCHEMA, MARKDOC_TAG_SCHEMA } from './schema.js';

const ajv = new (Ajv as any)({
  useDefaults: true,
  allErrors: true,
  verbose: true,
});
(addFormats as any)(ajv); // mismatching AJV typing due to fork
ajv.addSchema(RECHECK_CONFIG_SCHEMA, 'recheck-config');
// Compiled once so `markdoc.extend.tagsFile` entries get exactly the same
// per-tag shape check a config's own inline `extend.tags` gets from the
// schema above, without recompiling on every validate() call.
const validateMarkdocTagShape = ajv.compile(MARKDOC_TAG_SCHEMA);

/**
 * Validates configuration structure using JSON Schema
 */
function validateStructure(config: any): ValidationError[] {
  const validate = ajv.getSchema('recheck-config');
  if (!validate) {
    throw new Error('Schema not loaded');
  }

  const valid = validate(config) as boolean;

  if (!valid && validate.errors) {
    return validate.errors.map((error: any) => {
      // AJV's own `additionalProperties` message ("must NOT have additional
      // properties") never names the offending key in `error.message`
      // itself — it's only available on `error.params.additionalProperty`.
      // Naming it here is what turns a schema-illegal key (e.g. the removed
      // `autoFixable`) into an actionable, greppable error rather than a
      // "which property?" guessing game.
      const extra =
        error.keyword === 'additionalProperties' && error.params?.additionalProperty
          ? ` (unknown property "${error.params.additionalProperty}")`
          : '';
      return {
        message: `${error.instancePath || '/'}: ${error.message}${extra}`,
        path: error.instancePath,
        value: error.data,
      };
    });
  }

  return [];
}

/**
 * Validates assertions in a rule
 */
function validateAssertions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  if (!isPlainObject(rule.assertions)) {
    errors.push({
      message: `Rule "${name}": assertions must be an object`,
      path: `${name}.assertions`,
    });
    return;
  }

  for (const assertionType of Object.keys(rule.assertions)) {
    let resolved;
    try {
      // Delegates to the same registry runRules() uses to dispatch
      // assertions (rules/registry.ts resolveAssertion), rather than a
      // hand-maintained list of known assertion ids duplicated here. Every
      // scope AND token rule (including every markdownlint-ported rule
      // registered via src/rules/token/index.ts) is "known" the moment
      // it's registered, so this can't silently drift out of sync the way
      // a hardcoded switch/case list did per rule-porting batch.
      resolved = resolveAssertion(assertionType);
    } catch {
      errors.push({
        message: `Rule "${name}": unknown assertion type "${assertionType}"`,
        path: `${name}.assertions.${assertionType}`,
      });
      continue;
    }

    // Scope-rule assertions (pattern, occurrence, swap, ...) each have their
    // own dedicated per-assertion validator below; token rules (the 53
    // markdownlint-ported rules) had no option checking at all until now --
    // see validateTokenRuleOptions.
    if (resolved.kind === 'token') {
      validateTokenRuleOptions(rule, name, assertionType, resolved.rule, errors);
    }
  }
}

// A misspelled option on a ported (token) rule used to validate clean and
// silently no-op -- invisible in a 100-rule style-guide config. Each token
// rule's own `defaults` object is the schema of record: it's the exact set
// of keys the rule reads off `ctx.config` (see e.g. rules/token/line-length.ts
// `defaults: { message, lineLength, codeBlocks, tables, headings, ... }`).
// `message` is always allowed because every token rule's `defaults` includes
// it (verified for all 53 ported rules) -- this is distinct from the
// RULE-level `message`/`severity`/`scope`/`fix`/`link`/`excludes`/
// `appliesTo`/`exceptions`/`assertions` keys, which are not assertion
// options and are validated elsewhere (schema.ts / validateAssertions).
function validateTokenRuleOptions(
  rule: BaseRule,
  name: string,
  id: string,
  tokenRule: TokenRule,
  errors: ValidationError[]
): void {
  const optionsObject = requireOptionsObject(rule, name, id, errors);
  if (!optionsObject) return;

  const allowed = new Set(Object.keys(tokenRule.defaults));
  for (const key of Object.keys(optionsObject)) {
    if (!allowed.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown option "${key}" for assertion "${id}" (accepted: ${[...allowed].sort().join(', ')})`,
        path: `${name}.assertions.${id}.${key}`,
        value: key,
      });
    }
  }
}

/**
 * Shared guard for every per-assertion option validator below: returns the
 * assertion's options when they are a plain object, `undefined` when the
 * assertion isn't configured on this rule, and pushes an "options must be
 * an object" error for anything else. The JSON schema can't catch this
 * shape mistake (`assertions` values are `additionalProperties: true`), so
 * without it e.g. `occurrence: "oops"` validates cleanly and misbehaves at
 * lint time.
 */
function requireOptionsObject(
  rule: BaseRule,
  name: string,
  assertionId: string,
  errors: ValidationError[]
): Record<string, unknown> | undefined {
  const assertions = rule.assertions;
  if (!isPlainObject(assertions) || !(assertionId in assertions)) {
    return undefined;
  }
  const config = assertions[assertionId];
  if (!isPlainObject(config)) {
    errors.push({
      message: `Rule "${name}": ${assertionId} assertion options must be an object`,
      path: `${name}.assertions.${assertionId}`,
    });
    return undefined;
  }
  return config;
}

// `negate` is included here (rather than left to fall through to the
// generic "unknown option" error below) so a config that sets it gets ONE
// specific, actionable message -- see the dedicated check in
// validatePatternOptions, not a redundant generic one alongside it.
const PATTERN_OPTION_KEYS = new Set(['tokens', 'ignoreCase', 'nonword', 'includeCode', 'negate']);

/**
 * Rejects the removed `pattern` option `negate`. Git history shows it never
 * functioned in ANY version of the engine — the check always sat inside the
 * match-iteration loop, so `negate: true` reported nothing, ever, and a
 * pattern's ABSENCE never reported either. Rather than silently ignoring a
 * config key that reads like it inverts the rule, validation fails loudly;
 * existence checks ("flag when a pattern is absent") are planned as a
 * Vale-parity feature.
 */
function validatePatternOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const patternConfig = requireOptionsObject(rule, name, 'pattern', errors);
  if (!patternConfig) return;

  for (const key of Object.keys(patternConfig)) {
    if (!PATTERN_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown pattern option "${key}"`,
        path: `${name}.assertions.pattern.${key}`,
      });
    }
  }

  if ('negate' in patternConfig) {
    errors.push({
      message:
        `Rule "${name}": pattern option "negate" was removed — it never worked ` +
        `(it never reported anything); remove it from the config`,
      path: `${name}.assertions.pattern.negate`,
    });
  }

  // `tokens`, `ignoreCase`, and `nonword` used to have no type check at all --
  // `tokens: "ab"` (a string, not an array) validated
  // clean, then pattern.ts's `for (const token of tokens)` iterated the
  // STRING CHARACTER BY CHARACTER ('a' and 'b' each compiled as their own
  // regex), and `ignoreCase: "yes"` (any non-empty string is truthy)
  // silently flipped case-sensitivity on a typo. `tokens` is required (not
  // `tokens?:` -- see PatternAssertion in types/assertions.ts) and, like
  // `swap`'s `pairs` and `consistency`'s `either`, an EMPTY tokens array can
  // never report anything, so both shape and non-emptiness are checked here
  // -- same reasoning as validateSwapOptions/validateConsistencyOptions.
  const { tokens, ignoreCase, nonword } = patternConfig as {
    tokens?: unknown;
    ignoreCase?: unknown;
    nonword?: unknown;
  };

  const isValidTokens =
    Array.isArray(tokens) &&
    tokens.length > 0 &&
    tokens.every((token) => typeof token === 'string');
  if (!isValidTokens) {
    errors.push({
      message: `Rule "${name}": pattern requires "tokens" to be a non-empty array of strings`,
      path: `${name}.assertions.pattern.tokens`,
    });
  }

  if (ignoreCase !== undefined && typeof ignoreCase !== 'boolean') {
    errors.push({
      message: `Rule "${name}": pattern option "ignoreCase" must be a boolean`,
      path: `${name}.assertions.pattern.ignoreCase`,
    });
  }

  if (nonword !== undefined && typeof nonword !== 'boolean') {
    errors.push({
      message: `Rule "${name}": pattern option "nonword" must be a boolean`,
      path: `${name}.assertions.pattern.nonword`,
    });
  }

  // Default `false`: a match inside inline code is skipped, by range, not
  // by masking the text (see rules/scope/pattern.ts), matching swap's
  // `includeCode` option.
  const includeCode = patternConfig.includeCode;
  if (includeCode !== undefined && typeof includeCode !== 'boolean') {
    errors.push({
      message: `Rule "${name}": pattern option "includeCode" must be a boolean`,
      path: `${name}.assertions.pattern.includeCode`,
    });
  }
}

/**
 * Validates the `occurrence` assertion's options. Omitting BOTH `min` and
 * `max` is an error — an occurrence assertion with no bound can never
 * report anything — and so is an inverted range (`min` > `max`), which no
 * count can satisfy.
 */
const OCCURRENCE_OPTION_KEYS = new Set(['pattern', 'min', 'max', 'ignoreCase']);

function validateOccurrenceOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const occurrenceConfig = requireOptionsObject(rule, name, 'occurrence', errors);
  if (!occurrenceConfig) return;

  for (const key of Object.keys(occurrenceConfig)) {
    if (!OCCURRENCE_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown occurrence option "${key}"`,
        path: `${name}.assertions.occurrence.${key}`,
      });
    }
  }

  const { min, max, pattern } = occurrenceConfig as {
    min?: unknown;
    max?: unknown;
    pattern?: unknown;
  };
  if (min === undefined && max === undefined) {
    errors.push({
      message: `Rule "${name}": occurrence requires at least one of "min" or "max"`,
      path: `${name}.assertions.occurrence`,
    });
  }

  // `min`/`max` used to have no type check at all --
  // `occurrence: { pattern: ",", max: "two" }` used to validate clean, then
  // occurrence.ts's `count > "two"` is NaN-false (a number is never `>` a
  // non-numeric string), so a max-bounded rule NEVER fires. Every sibling
  // numeric validator (`metric`, `length`, `list-length`) already checks
  // this; occurrence didn't.
  if (min !== undefined && typeof min !== 'number') {
    errors.push({
      message: `Rule "${name}": occurrence option "min" must be a number`,
      path: `${name}.assertions.occurrence.min`,
    });
  }

  if (max !== undefined && typeof max !== 'number') {
    errors.push({
      message: `Rule "${name}": occurrence option "max" must be a number`,
      path: `${name}.assertions.occurrence.max`,
    });
  }

  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push({
      message: `Rule "${name}": occurrence "min" (${min}) must not exceed "max" (${max})`,
      path: `${name}.assertions.occurrence`,
    });
  }

  // A missing/empty/non-string `pattern` silently compiles to an
  // always-matching empty pattern in occurrence.ts's execute() — a
  // max-bounded rule then floods every segment with false positives and a
  // min-only rule can never fire. Reject loudly instead.
  if (typeof pattern !== 'string' || pattern.length === 0) {
    errors.push({
      message: `Rule "${name}": occurrence requires a non-empty string "pattern"`,
      path: `${name}.assertions.occurrence.pattern`,
    });
  }
}

/**
 * Validates the `repetition` assertion's options. Both are optional
 * (defaults `\w+` / `true` -- see rules/scope/repetition.ts), but when
 * present `pattern` must be a non-empty string (an empty one compiles to an
 * always-matching zero-width regex) and `ignoreCase` a boolean.
 */
const REPETITION_OPTION_KEYS = new Set(['pattern', 'ignoreCase']);

function validateRepetitionOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const repetitionConfig = requireOptionsObject(rule, name, 'repetition', errors);
  if (!repetitionConfig) return;

  for (const key of Object.keys(repetitionConfig)) {
    if (!REPETITION_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown repetition option "${key}"`,
        path: `${name}.assertions.repetition.${key}`,
      });
    }
  }

  const { pattern, ignoreCase } = repetitionConfig as { pattern?: unknown; ignoreCase?: unknown };

  if (pattern !== undefined && (typeof pattern !== 'string' || pattern.length === 0)) {
    errors.push({
      message: `Rule "${name}": repetition option "pattern" must be a non-empty string`,
      path: `${name}.assertions.repetition.pattern`,
    });
  }

  if (ignoreCase !== undefined && typeof ignoreCase !== 'boolean') {
    errors.push({
      message: `Rule "${name}": repetition option "ignoreCase" must be a boolean`,
      path: `${name}.assertions.repetition.ignoreCase`,
    });
  }
}

/**
 * Validates the `consistency` assertion's options. `either` is required and
 * must be a non-empty object mapping one non-empty variant string to
 * another -- with no pairs the assertion can never report anything, and an
 * empty-string key would reach consistency.ts's scan loop as a zero-width
 * regex.
 */
const CONSISTENCY_OPTION_KEYS = new Set(['either', 'ignoreCase']);

function validateConsistencyOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const consistencyConfig = requireOptionsObject(rule, name, 'consistency', errors);
  if (!consistencyConfig) return;

  for (const key of Object.keys(consistencyConfig)) {
    if (!CONSISTENCY_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown consistency option "${key}"`,
        path: `${name}.assertions.consistency.${key}`,
      });
    }
  }

  const { either, ignoreCase } = consistencyConfig as { either?: unknown; ignoreCase?: unknown };

  if (!isPlainObject(either)) {
    errors.push({
      message: `Rule "${name}": consistency requires "either" to be an object mapping one variant to another (e.g. behavior: behaviour)`,
      path: `${name}.assertions.consistency.either`,
    });
  } else {
    const entries = Object.entries(either);
    if (entries.length === 0) {
      errors.push({
        message: `Rule "${name}": consistency "either" must declare at least one variant pair`,
        path: `${name}.assertions.consistency.either`,
      });
    }
    for (const [variant, alternative] of entries) {
      if (variant.length === 0) {
        errors.push({
          message: `Rule "${name}": consistency "either" entry keys must be non-empty strings`,
          path: `${name}.assertions.consistency.either`,
        });
      }
      if (typeof alternative !== 'string' || alternative.length === 0) {
        errors.push({
          message: `Rule "${name}": consistency "either" entry "${variant}" must map to a non-empty string variant`,
          path: `${name}.assertions.consistency.either.${variant}`,
        });
      }
    }
  }

  if (ignoreCase !== undefined && typeof ignoreCase !== 'boolean') {
    errors.push({
      message: `Rule "${name}": consistency option "ignoreCase" must be a boolean`,
      path: `${name}.assertions.consistency.ignoreCase`,
    });
  }
}

/**
 * Validates the `conditional` assertion's options. Both `first` and
 * `second` are required, non-empty strings. Deliberately does NOT check
 * that they compile as regexes: like `pattern`'s `tokens`, they are raw
 * user patterns and an invalid one silently produces zero problems at
 * runtime (see conditional.ts).
 */
const CONDITIONAL_OPTION_KEYS = new Set(['first', 'second', 'ignoreCase']);

function validateConditionalOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const conditionalConfig = requireOptionsObject(rule, name, 'conditional', errors);
  if (!conditionalConfig) return;

  for (const key of Object.keys(conditionalConfig)) {
    if (!CONDITIONAL_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown conditional option "${key}"`,
        path: `${name}.assertions.conditional.${key}`,
      });
    }
  }

  const { first, second, ignoreCase } = conditionalConfig as {
    first?: unknown;
    second?: unknown;
    ignoreCase?: unknown;
  };

  if (typeof first !== 'string' || first.length === 0) {
    errors.push({
      message: `Rule "${name}": conditional requires a non-empty string "first"`,
      path: `${name}.assertions.conditional.first`,
    });
  }

  if (typeof second !== 'string' || second.length === 0) {
    errors.push({
      message: `Rule "${name}": conditional requires a non-empty string "second"`,
      path: `${name}.assertions.conditional.second`,
    });
  }

  if (ignoreCase !== undefined && typeof ignoreCase !== 'boolean') {
    errors.push({
      message: `Rule "${name}": conditional option "ignoreCase" must be a boolean`,
      path: `${name}.assertions.conditional.ignoreCase`,
    });
  }
}

/**
 * Validates the `capitalization` assertion's options. `match` is required
 * and must be a non-empty string (a `$`-style or a custom regex — an
 * invalid regex is deliberately NOT rejected here; it silently produces
 * zero problems at runtime, like `pattern`'s `tokens`). `style` is accepted
 * alongside ANY `match` value, not just `$title` (the only one it affects)
 * — setting it elsewhere is a documented harmless no-op. `exceptions`
 * entries must be non-empty strings or they'd silently never match in the
 * exception lookup. `builtinVocabulary` (default `true`, see
 * ../data/proper-nouns.ts) must be a boolean when present.
 */
const CAPITALIZATION_OPTION_KEYS = new Set(['match', 'exceptions', 'style', 'builtinVocabulary']);

function validateCapitalizationOptions(
  rule: BaseRule,
  name: string,
  errors: ValidationError[]
): void {
  const capitalizationConfig = requireOptionsObject(rule, name, 'capitalization', errors);
  if (!capitalizationConfig) return;

  for (const key of Object.keys(capitalizationConfig)) {
    if (!CAPITALIZATION_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown capitalization option "${key}"`,
        path: `${name}.assertions.capitalization.${key}`,
      });
    }
  }

  const { match, exceptions, style, builtinVocabulary } = capitalizationConfig as {
    match?: unknown;
    exceptions?: unknown;
    style?: unknown;
    builtinVocabulary?: unknown;
  };

  if (builtinVocabulary !== undefined && typeof builtinVocabulary !== 'boolean') {
    errors.push({
      message: `Rule "${name}": capitalization option "builtinVocabulary" must be a boolean`,
      path: `${name}.assertions.capitalization.builtinVocabulary`,
    });
  }

  if (typeof match !== 'string' || match.length === 0) {
    errors.push({
      message:
        `Rule "${name}": capitalization requires a non-empty string "match" ` +
        `($title, $sentence, $lower, $upper, or a regex pattern)`,
      path: `${name}.assertions.capitalization.match`,
    });
  }

  if (style !== undefined && style !== 'ap' && style !== 'chicago') {
    errors.push({
      message: `Rule "${name}": capitalization option "style" must be "ap" or "chicago"`,
      path: `${name}.assertions.capitalization.style`,
    });
  }

  if (exceptions !== undefined) {
    const isValidExceptions =
      Array.isArray(exceptions) &&
      exceptions.every((entry) => typeof entry === 'string' && entry.length > 0);
    if (!isValidExceptions) {
      errors.push({
        message: `Rule "${name}": capitalization option "exceptions" must be an array of non-empty strings`,
        path: `${name}.assertions.capitalization.exceptions`,
      });
    }
  }
}

/**
 * Validates the `metric` assertion's options. `formula` is required and
 * must be one of the six formulas `computeReadability` supports -- an
 * unrecognized value would otherwise throw at lint time. At least one of
 * `min`/`max` is required, and an inverted range (`min` > `max`) is an
 * error -- same reasoning as `occurrence` above.
 */
const METRIC_OPTION_KEYS = new Set(['formula', 'min', 'max']);
const METRIC_FORMULAS = new Set([
  'flesch-reading-ease',
  'flesch-kincaid-grade',
  'gunning-fog',
  'smog',
  'coleman-liau',
  'automated-readability',
]);

function validateMetricOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const metricConfig = requireOptionsObject(rule, name, 'metric', errors);
  if (!metricConfig) return;

  for (const key of Object.keys(metricConfig)) {
    if (!METRIC_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown metric option "${key}"`,
        path: `${name}.assertions.metric.${key}`,
      });
    }
  }

  const { formula, min, max } = metricConfig as { formula?: unknown; min?: unknown; max?: unknown };

  if (typeof formula !== 'string' || !METRIC_FORMULAS.has(formula)) {
    errors.push({
      message: `Rule "${name}": metric requires "formula" to be one of ${[...METRIC_FORMULAS].join(', ')}`,
      path: `${name}.assertions.metric.formula`,
    });
  }

  if (min === undefined && max === undefined) {
    errors.push({
      message: `Rule "${name}": metric requires at least one of "min" or "max"`,
      path: `${name}.assertions.metric`,
    });
  }

  if (min !== undefined && typeof min !== 'number') {
    errors.push({
      message: `Rule "${name}": metric option "min" must be a number`,
      path: `${name}.assertions.metric.min`,
    });
  }

  if (max !== undefined && typeof max !== 'number') {
    errors.push({
      message: `Rule "${name}": metric option "max" must be a number`,
      path: `${name}.assertions.metric.max`,
    });
  }

  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push({
      message: `Rule "${name}": metric "min" (${min}) must not exceed "max" (${max})`,
      path: `${name}.assertions.metric`,
    });
  }
}

/**
 * Shared `min`/`max` integer-range check for `length` and `list-length`:
 * both measure a COUNT
 * that can never be negative (characters/words/sentences/list items), so a
 * bound of `min: 0` (or any `min <= 0`) can NEVER be violated by a real
 * count -- "must have at least 0 words" is vacuously true for every
 * document -- and a negative `max` (e.g. `max: -1`) is violated by EVERY
 * real count, since no count is ever less than a negative number. Neither is
 * a meaningful bound; both are silent no-op/always-fire footguns. `min` must
 * therefore be a positive integer and `max` a non-negative integer when
 * present (`max: 0` is a real, meaningful "must be empty" bound, unlike a
 * negative one). Fractional bounds (`min: 2.5`) are also rejected: both
 * assertions always measure whole units, so a fractional bound could never
 * be matched exactly either. Only runs when the value is ALREADY a number --
 * a wrong-typed value is reported once by the caller's own type check, not
 * duplicated here.
 */
function validateCountBounds(
  name: string,
  assertionId: string,
  min: unknown,
  max: unknown,
  errors: ValidationError[]
): void {
  if (typeof min === 'number' && (!Number.isInteger(min) || min < 1)) {
    errors.push({
      message:
        `Rule "${name}": ${assertionId} option "min" must be a positive integer ` +
        `(${min} could never be violated by a real count)`,
      path: `${name}.assertions.${assertionId}.min`,
    });
  }

  if (typeof max === 'number' && (!Number.isInteger(max) || max < 0)) {
    errors.push({
      message:
        `Rule "${name}": ${assertionId} option "max" must be a non-negative integer ` +
        `(${max} would be violated by every real count)`,
      path: `${name}.assertions.${assertionId}.max`,
    });
  }
}

/**
 * Validates the `list-length` assertion's options (rules/token/list-length.ts
 * -- a Recheck-original TOKEN rule, not a markdownlint port). Unlike the
 * scope-assertion validators above (occurrence, metric, ...), the generic
 * `validateTokenRuleOptions` already rejects an unknown option name for every
 * token rule -- derived from `Object.keys(rule.defaults)`, which declares
 * both `min` and `max` (see list-length.ts's doc comment on its `max:
 * undefined` default) -- so this only adds the type/range checks that
 * mirror validateOccurrenceOptions/validateMetricOptions: `min`/`max` must be
 * numbers when present, an inverted range (`min` > `max`) is an error -- no
 * item count could ever satisfy it -- and `min`/`max`
 * must additionally be a positive/non-negative INTEGER, per
 * validateCountBounds above: unlike occurrence/metric, list-length's counts
 * can never be negative, so `min: 0` can never fire and `max: -1` always
 * fires, neither a meaningful bound. Omitting BOTH `min` and `max` is
 * deliberately NOT an error here, unlike occurrence/metric: list-length's own
 * `defaults.min` is 2, so an empty `list-length: {}` is already a complete,
 * meaningful configuration (flag any list under 2 items), not a no-op
 * assertion with nothing to check.
 */
function validateListLengthOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const listLengthConfig = requireOptionsObject(rule, name, 'list-length', errors);
  if (!listLengthConfig) return;

  const { min, max } = listLengthConfig as { min?: unknown; max?: unknown };

  if (min !== undefined && typeof min !== 'number') {
    errors.push({
      message: `Rule "${name}": list-length option "min" must be a number`,
      path: `${name}.assertions.list-length.min`,
    });
  }

  if (max !== undefined && typeof max !== 'number') {
    errors.push({
      message: `Rule "${name}": list-length option "max" must be a number`,
      path: `${name}.assertions.list-length.max`,
    });
  }

  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push({
      message: `Rule "${name}": list-length "min" (${min}) must not exceed "max" (${max})`,
      path: `${name}.assertions.list-length`,
    });
  }

  validateCountBounds(name, 'list-length', min, max, errors);
}

/**
 * Validates the `spelling` assertion's options. All are optional — an
 * empty `spelling: {}` is valid (default dictionary). When present,
 * `dictionary` must be a non-empty string, and `vocab`/`ignore` arrays of
 * non-empty strings — an empty-string `ignore` pattern would compile to an
 * always-matching regex, silencing every word. `builtinVocabulary` (default
 * `true`, see ../data/proper-nouns.ts) must be a boolean when present.
 */
const SPELLING_OPTION_KEYS = new Set(['dictionary', 'vocab', 'ignore', 'builtinVocabulary']);

function validateSpellingOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const spellingConfig = requireOptionsObject(rule, name, 'spelling', errors);
  if (!spellingConfig) return;

  for (const key of Object.keys(spellingConfig)) {
    if (!SPELLING_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown spelling option "${key}"`,
        path: `${name}.assertions.spelling.${key}`,
      });
    }
  }

  const { dictionary, vocab, ignore, builtinVocabulary } = spellingConfig as {
    dictionary?: unknown;
    vocab?: unknown;
    ignore?: unknown;
    builtinVocabulary?: unknown;
  };

  if (builtinVocabulary !== undefined && typeof builtinVocabulary !== 'boolean') {
    errors.push({
      message: `Rule "${name}": spelling option "builtinVocabulary" must be a boolean`,
      path: `${name}.assertions.spelling.builtinVocabulary`,
    });
  }

  if (dictionary !== undefined && (typeof dictionary !== 'string' || dictionary.length === 0)) {
    errors.push({
      message: `Rule "${name}": spelling option "dictionary" must be a non-empty string`,
      path: `${name}.assertions.spelling.dictionary`,
    });
  }

  if (vocab !== undefined) {
    const isValidVocab =
      Array.isArray(vocab) && vocab.every((word) => typeof word === 'string' && word.length > 0);
    if (!isValidVocab) {
      errors.push({
        message: `Rule "${name}": spelling option "vocab" must be an array of non-empty strings`,
        path: `${name}.assertions.spelling.vocab`,
      });
    }
  }

  if (ignore !== undefined) {
    const isValidIgnore =
      Array.isArray(ignore) && ignore.every((word) => typeof word === 'string' && word.length > 0);
    if (!isValidIgnore) {
      errors.push({
        message: `Rule "${name}": spelling option "ignore" must be an array of non-empty strings`,
        path: `${name}.assertions.spelling.ignore`,
      });
    }
  }
}

/**
 * Validates the `length` assertion's options. `unit` is required and must be
 * one of `'characters' | 'words' | 'sentences'` -- an unrecognized value
 * would otherwise reach `length.ts`'s `measure()` and fall through to the
 * word-tokenizer branch silently, scoring the wrong thing with no error.
 * At least one of `min`/`max` is required, and an inverted range (`min` >
 * `max`) is an error -- same reasoning as `occurrence`/`metric` above.
 */
const LENGTH_OPTION_KEYS = new Set(['unit', 'min', 'max']);
const LENGTH_UNITS = new Set(['characters', 'words', 'sentences']);

function validateLengthOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const lengthConfig = requireOptionsObject(rule, name, 'length', errors);
  if (!lengthConfig) return;

  for (const key of Object.keys(lengthConfig)) {
    if (!LENGTH_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Rule "${name}": unknown length option "${key}"`,
        path: `${name}.assertions.length.${key}`,
      });
    }
  }

  const { unit, min, max } = lengthConfig as { unit?: unknown; min?: unknown; max?: unknown };

  if (typeof unit !== 'string' || !LENGTH_UNITS.has(unit)) {
    errors.push({
      message: `Rule "${name}": length requires "unit" to be one of ${[...LENGTH_UNITS].join(', ')}`,
      path: `${name}.assertions.length.unit`,
    });
  }

  if (min === undefined && max === undefined) {
    errors.push({
      message: `Rule "${name}": length requires at least one of "min" or "max"`,
      path: `${name}.assertions.length`,
    });
  }

  if (min !== undefined && typeof min !== 'number') {
    errors.push({
      message: `Rule "${name}": length option "min" must be a number`,
      path: `${name}.assertions.length.min`,
    });
  }

  if (max !== undefined && typeof max !== 'number') {
    errors.push({
      message: `Rule "${name}": length option "max" must be a number`,
      path: `${name}.assertions.length.max`,
    });
  }

  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push({
      message: `Rule "${name}": length "min" (${min}) must not exceed "max" (${max})`,
      path: `${name}.assertions.length`,
    });
  }

  // `min: 0` (never
  // violated -- a segment can't have fewer than 0 characters/words/
  // sentences) and a negative `max` (always violated) are silent no-op/
  // always-fire footguns, same reasoning as list-length's identical check
  // above -- see validateCountBounds's doc comment.
  validateCountBounds(name, 'length', min, max, errors);
}

/**
 * Validates each find -> replace entry under `swap.pairs`: the KEY must be
 * a non-empty string (an empty one escapes to a zero-width pattern in
 * swap.ts's findMatches, same hazard as consistency's `either` keys); the
 * VALUE must be a string, possibly empty -- an empty replacement is a
 * legitimate "delete this word" swap.
 */
function validateSwapPairEntries(
  entries: [string, unknown][],
  name: string,
  path: string,
  errors: ValidationError[]
): void {
  for (const [key, value] of entries) {
    const entryPath = `${path}.${key}`;
    if (key.length === 0) {
      errors.push({
        message: `Rule "${name}": swap "pairs" entry keys must be non-empty strings`,
        path: entryPath,
      });
    }
    if (typeof value !== 'string') {
      errors.push({
        message: `Rule "${name}": swap "pairs" entry "${key}" must map to a string replacement`,
        path: entryPath,
      });
    }
  }
}

/**
 * Validates the `swap` assertion's options. Exactly one shape is accepted
 * -- the only one swap.ts's findMatches actually consumes:
 *
 *   `{ ignoreCase?, wordBoundary?, keysAreRegex?, pairs: {find: replace} }`
 *
 * The legacy "direct" top-level shape (`swap: { he: they }`) is rejected
 * with a migration hint: findMatches only ever reads `options.pairs`, so
 * direct entries validated fine but were silently inert -- rejecting them
 * turns that no-op into an actionable config error.
 */
const SWAP_RESERVED_KEYS = new Set([
  'ignoreCase',
  'wordBoundary',
  'keysAreRegex',
  'pairs',
  'includeCode',
]);
const SWAP_BOOLEAN_OPTION_KEYS = [
  'ignoreCase',
  'wordBoundary',
  'keysAreRegex',
  'includeCode',
] as const;

function validateSwapOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const swapConfig = requireOptionsObject(rule, name, 'swap', errors);
  if (!swapConfig) return;

  for (const key of Object.keys(swapConfig)) {
    if (!SWAP_RESERVED_KEYS.has(key)) {
      errors.push({
        message:
          `Rule "${name}": unknown swap option "${key}" -- swap does not accept ` +
          `find -> replace entries at the top level; move find -> replace entries under "pairs:"`,
        path: `${name}.assertions.swap.${key}`,
      });
    }
  }

  for (const key of SWAP_BOOLEAN_OPTION_KEYS) {
    const value = swapConfig[key];
    if (value !== undefined && typeof value !== 'boolean') {
      errors.push({
        message: `Rule "${name}": swap option "${key}" must be a boolean`,
        path: `${name}.assertions.swap.${key}`,
      });
    }
  }

  if (!('pairs' in swapConfig)) {
    errors.push({
      message: `Rule "${name}": swap requires a "pairs" object mapping find -> replace strings`,
      path: `${name}.assertions.swap.pairs`,
    });
    return;
  }

  const pairs = swapConfig.pairs;
  if (!isPlainObject(pairs) || Object.keys(pairs).length === 0) {
    errors.push({
      message: `Rule "${name}": swap option "pairs" must be a non-empty object mapping find -> replace strings`,
      path: `${name}.assertions.swap.pairs`,
    });
  } else {
    validateSwapPairEntries(
      Object.entries(pairs as Record<string, unknown>),
      name,
      `${name}.assertions.swap.pairs`,
      errors
    );
  }
}

/**
 * Missing-peer validation for `spelling`: `nspell` and `dictionary-en` are
 * OPTIONAL peer dependencies, so a config that enables `spelling` without
 * them installed must fail here with an actionable install command rather
 * than as a bare "Cannot find module" the first time a file is linted.
 * Runs per spelling rule so a mix of default-dictionary and
 * custom-dictionary rules gets the right install command for each; a
 * config with no `spelling` assertion never reaches an `import()` call at
 * all, keeping validate() lazy about the peers.
 *
 * ALSO validates that a custom `dictionary`
 * path actually names a readable `.aff`/`.dic` pair: the check above only
 * ever checked whether `nspell` itself imports, never whether the FILES a
 * `dictionary` option points at exist — so a missing/unreadable custom
 * dictionary used to pass validation cleanly and only fail (silently: see
 * spelling.ts's `loadSpeller`/`spellerCache`) the first time a file was
 * linted, disabling spelling for the rest of the process. Resolved via
 * `resolveDictionaryPaths`, SHARED with spelling.ts's own
 * `readCustomDictionary`, so validate() and the runtime can never disagree
 * about which files a `dictionary` path names.
 */
// oxlint-disable-next-line sonarjs/cognitive-complexity -- ported from the source engine, written and reviewed against that repo's threshold of 100 (this repo's default is 30); needs a dedicated refactor or a per-package override, not a same-task rewrite of correctness-critical rule logic.
async function checkSpellingPeerDependencies(rules: NormalizedRule[]): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const reportedMessages = new Set<string>();
  const reportedDictionaryPaths = new Set<string>();

  for (const rule of rules) {
    const spellingConfig = rule.assertions?.['spelling'];
    if (!isPlainObject(spellingConfig)) continue;

    const dictionaryPath = (spellingConfig as { dictionary?: unknown }).dictionary;
    const hasCustomDictionary = typeof dictionaryPath === 'string' && dictionaryPath.length > 0;

    let missingPeer = false;
    try {
      await import('nspell');
    } catch {
      missingPeer = true;
    }

    // A custom-dictionary rule never touches `dictionary-en` (see
    // spelling.ts's loadDictionary), so its absence must not fail it.
    if (!hasCustomDictionary) {
      try {
        await import('dictionary-en');
      } catch {
        missingPeer = true;
      }
    }

    if (missingPeer) {
      const installCommand = hasCustomDictionary ? 'npm i nspell' : 'npm i nspell dictionary-en';
      const peerNames = hasCustomDictionary ? '"nspell"' : '"nspell" and "dictionary-en"';
      const message =
        `The spelling assertion requires the optional peer dependenc${hasCustomDictionary ? 'y' : 'ies'} ` +
        `${peerNames} — run \`${installCommand}\` to enable it.`;
      // Each distinct message is reported once, at the first offending
      // rule's path; a mixed config still reports both install commands.
      if (!reportedMessages.has(message)) {
        reportedMessages.add(message);
        errors.push({ message, path: `${rule.name}.assertions.spelling` });
      }
    }

    // Independent of the peer-import check above: even when `nspell`
    // imports fine, a custom `dictionary` option may still name files that
    // don't exist or aren't readable. Dedupe by the raw dictionary path
    // string so several rules sharing one bad path only report once.
    if (hasCustomDictionary && !reportedDictionaryPaths.has(dictionaryPath)) {
      reportedDictionaryPaths.add(dictionaryPath);
      const { aff, dic } = resolveDictionaryPaths(dictionaryPath);
      const unreadable: string[] = [];
      for (const filePath of [aff, dic]) {
        try {
          await fs.access(filePath, fs.constants.R_OK);
        } catch {
          unreadable.push(filePath);
        }
      }
      if (unreadable.length > 0) {
        errors.push({
          message:
            `Rule "${rule.name}": spelling dictionary file${unreadable.length > 1 ? 's' : ''} ` +
            `not found or not readable: ${unreadable.join(', ')}`,
          path: `${rule.name}.assertions.spelling.dictionary`,
        });
      }
    }
  }

  return errors;
}

/**
 * Warns about a config that extends the `recheck/markdoc` preset without
 * turning markdoc parsing on. The preset's four rules only look at
 * `ctx.markdoc`, which the runner populates only when parsing is enabled, so
 * such a config ships four rule entries that can never report. That is dead
 * weight rather than a broken config, so this goes to `console.warn` (the
 * validation result carries only errors, no warnings) and `isValid` stays
 * `true`.
 *
 * Reads the raw, pre-`resolveExtends` `extends` array rather than the merged
 * config: post-merge, the four rule keys the preset contributes are
 * indistinguishable from a user hand-writing the same `recheck/markdoc-*` keys
 * directly, which is a legitimate way to opt into only some of them and is not
 * what this warning is about. The literal `"recheck/markdoc"` entry in
 * `extends` is the one unambiguous signal that the preset itself was requested.
 */
function warnStaleMarkdocPreset(
  extendsList: unknown,
  markdocEnabled: boolean,
  warnOnce: (message: string) => void
): void {
  if (markdocEnabled || !Array.isArray(extendsList)) return;
  if (!extendsList.includes('recheck/markdoc')) return;
  warnOnce(
    'recheck: config extends "recheck/markdoc" but "markdoc" parsing is off — its four rules ' +
      'can never fire; set "markdoc: true" (or an object form) to enable them.'
  );
}

/**
 * Reads, parses, and shape-checks `markdoc.extend.tagsFile`, resolved
 * relative to `configDir`. Returns the file's tags (already validated per
 * entry against the same `MARKDOC_TAG_SCHEMA` inline `extend.tags` uses) plus
 * any config errors; a non-empty error list means the caller must treat
 * markdoc as disabled for this call, the same as any other structurally
 * invalid markdoc shape.
 *
 * Deliberately does not touch the filesystem unless `raw` actually names a
 * `tagsFile` -- a config with markdoc off, or with only inline `extend.tags`,
 * must never probe for a file it never referenced.
 */
async function loadMarkdocTagsFile(
  raw: boolean | MarkdocUserConfig | undefined,
  configDir: string
): Promise<{ fileTags?: Record<string, MarkdocTagSchema>; errors: ValidationError[] }> {
  const tagsFile = isPlainObject<MarkdocUserConfig>(raw) ? raw.extend?.tagsFile : undefined;
  if (!tagsFile) return { errors: [] };

  const resolvedPath = path.resolve(configDir, tagsFile);
  const errors: ValidationError[] = [];

  let content: string;
  try {
    content = await fs.readFile(resolvedPath, 'utf8');
  } catch (error) {
    errors.push({
      path: '/markdoc/extend/tagsFile',
      message: `markdoc.extend.tagsFile: could not read "${resolvedPath}": ${error instanceof Error ? error.message : String(error)}`,
    });
    return { errors };
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(content);
  } catch (error) {
    errors.push({
      path: '/markdoc/extend/tagsFile',
      message: `markdoc.extend.tagsFile: could not parse "${resolvedPath}" as YAML: ${error instanceof Error ? error.message : String(error)}`,
    });
    return { errors };
  }

  if (!isPlainObject(parsed)) {
    errors.push({
      path: '/markdoc/extend/tagsFile',
      message: `markdoc.extend.tagsFile: "${resolvedPath}" must be a YAML map of tag name to tag schema, got ${
        parsed === null ? 'null' : Array.isArray(parsed) ? 'an array' : typeof parsed
      }`,
    });
    return { errors };
  }

  const fileTags: Record<string, MarkdocTagSchema> = {};
  for (const [tagName, tagValue] of Object.entries(parsed)) {
    if (!validateMarkdocTagShape(tagValue)) {
      const detail = ajv.errorsText(validateMarkdocTagShape.errors, { separator: '; ' });
      errors.push({
        path: `/markdoc/extend/tagsFile/${tagName}`,
        message: `markdoc.extend.tagsFile: "${resolvedPath}" tag "${tagName}" is invalid: ${detail}`,
      });
      continue;
    }
    fileTags[tagName] = tagValue as MarkdocTagSchema;
  }

  // Any per-tag shape failure invalidates the whole file's contribution --
  // partially trusting a file that failed its own shape check would silently
  // merge an unvalidated tag into the resolved schema.
  if (errors.length > 0) return { errors };
  return { fileTags, errors: [] };
}

/**
 * Stale-pattern warning: a `pattern` assertion token that starts
 * with the literal characters `^#` almost always indicates a config
 * written for the pre-AST line-based scope extractor, where segment
 * content still included the raw `#` heading marker. After the AST
 * migration, non-`raw`/non-`all` scopes (e.g. `heading`, `sentence`,
 * `paragraph`) hand `pattern` only the semantic TEXT of the segment — the
 * literal markup is already stripped — so a token anchored on `^#` can
 * never match and the rule silently does nothing. `scope: raw` (and the
 * default `scope: all`, which also sees full raw file content) are exempt:
 * both still see literal markup, so `^#` is a legitimate anchor there.
 * This exact silent-death case was found in the repo's own recheck.yaml
 * after the AST migration.
 */
function warnStalePatternPrefix(
  rule: BaseRule,
  name: string,
  warnOnce: (message: string) => void
): void {
  const patternConfig = rule.assertions?.['pattern'] as { tokens?: unknown } | undefined;
  if (!patternConfig || !Array.isArray(patternConfig.tokens)) return;

  const scopeEntries =
    rule.scope === undefined ? [] : Array.isArray(rule.scope) ? rule.scope : [rule.scope];
  // Each scope entry may itself be a `&`-joined selector clause (e.g.
  // '~blockquote & ~heading') — split and check every term, since ANY
  // non-raw/non-all term in the selector means some matched segments will
  // be semantic-text-only. Parsed via the selector module's own tokenizer
  // so this check can't drift from how compileSelector reads the entry.
  const scopeTerms = scopeEntries.flatMap((entry) =>
    typeof entry === 'string' ? tokenizeSelector(entry).map(({ term }) => term) : []
  );
  const hasRawOrAllScope =
    scopeEntries.length === 0 || scopeTerms.some((term) => term === 'raw' || term === 'all');
  if (hasRawOrAllScope) return;

  for (const token of patternConfig.tokens) {
    if (typeof token === 'string' && token.startsWith('^#')) {
      const scopeDisplay = Array.isArray(rule.scope) ? rule.scope.join(', ') : String(rule.scope);
      warnOnce(
        `recheck: Rule "${name}": pattern "${token}" starts with '^#' but scope "${scopeDisplay}" matches semantic text without markup — drop the '#' prefix or use scope: raw`
      );
    }
  }
}

/**
 * Vale parity: `metric` rules are ALWAYS summary-scoped — readability is a
 * whole-document score over the document's prose, which is exactly what the
 * `summary` scope segments carry (see scopes/extractor.ts). Any rule whose
 * assertions include `metric` gets `scope: 'summary'` forced here, so the
 * runner hands metric.ts the summary segments and the rule never re-extracts
 * scopes itself. A config that EXPLICITLY set some other scope gets a
 * warning that the scope is ignored — a warning, not an error, because the
 * rule still behaves correctly; ValidationResult has no warning channel
 * (only errors), so this uses console.warn via `warnOnce`, the
 * `warnStalePatternPrefix` precedent above. Explicitness comes from
 * `hasExplicitScope` (captured BEFORE schema validation): AJV `useDefaults`
 * injects `scope: 'all'` onto every rule that omitted it, so post-schema the
 * two cases are indistinguishable.
 */
function normalizeMetricScope(
  rule: BaseRule,
  name: string,
  hasExplicitScope: boolean,
  warnOnce: (message: string) => void
): string | string[] | undefined {
  if (!isPlainObject(rule.assertions) || !('metric' in rule.assertions)) {
    return rule.scope;
  }
  if (hasExplicitScope) {
    const entries = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
    const isSummary =
      entries.length === 1 && (entries[0] === 'summary' || entries[0] === 'default');
    if (!isSummary) {
      const scopeDisplay = Array.isArray(rule.scope) ? rule.scope.join(', ') : String(rule.scope);
      warnOnce(
        `recheck: Rule "${name}": metric is always summary-scoped; ignoring configured scope "${scopeDisplay}"`
      );
    }
  }
  return 'summary';
}

/**
 * Validates a rule's `scope` field against the full scope vocabulary and
 * selector syntax (optional `~` negation, `&`-joined terms). AJV only
 * checks the structural shape (string, or array of strings); this is the
 * term-level check that gives a helpful message naming the bad term.
 */
function validateScope(rule: BaseRule, name: string, errors: ValidationError[]): void {
  if (rule.scope === undefined) return;
  const entries = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
  for (const entry of entries) {
    if (typeof entry !== 'string') continue; // caught by schema
    for (const problem of validateScopeSelector(entry)) {
      errors.push({
        message: `Rule "${name}": invalid scope — ${problem}`,
        path: `${name}.scope`,
      });
    }
    // `all`/`raw` as a TERM inside a compound or negated selector expression
    // (`heading & all`, `~all`, `~code & ~raw`) is the within-entry variant
    // of the array-mixing mistake rejected below: the conjunction form
    // compiles to a predicate that can never match (silently reporting
    // nothing), the negated form to one that matches every segment. The
    // shared helper (scopes/selector.ts) is also what makes compileSelector
    // throw on these shapes, so validation and compilation reject exactly
    // the same inputs.
    for (const problem of wholeDocumentKeywordProblems(entry)) {
      errors.push({
        message: `Rule "${name}": invalid scope — ${problem}`,
        path: `${name}.scope`,
      });
    }
  }

  // `all`/`raw` are whole-document keywords, not segment names — the
  // extractor never emits segments with those scopes, so combining either
  // with any other array entry (e.g. `scope: [all, code]`) can only ever
  // silently match nothing for the `all`/`raw` part. A single-element array
  // (`scope: ['all']`) is fine — compileSelector normalizes it to the bare
  // string's whole-document semantics — but a mix is a config mistake that
  // must fail loudly rather than validate and then report zero findings.
  if (entries.length > 1) {
    for (const entry of entries) {
      if (typeof entry !== 'string') continue; // caught by schema
      const term = entry.trim();
      if (term === 'all' || term === 'raw') {
        errors.push({
          message:
            `Rule "${name}": scope "${term}" covers the whole document and cannot be ` +
            `combined with other scopes — use \`scope: ${term}\` alone`,
          path: `${name}.scope`,
        });
      }
    }
  }
}

/**
 * Per-assertion `%s` message-placeholder caps. `metric` passes four values
 * (formula, score, min, max); `length` passes three (size, unit, bound --
 * see rules/scope/length.ts's FALLBACK_MAX/FALLBACK_MIN); every other
 * assertion passes at most two. A rule's cap is the largest among its
 * configured assertions, so a message can never declare more slots than its
 * assertion will ever fill.
 */
const MESSAGE_PLACEHOLDER_CAPS: Record<string, number> = {
  metric: 4,
  length: 3,
};
const DEFAULT_MESSAGE_PLACEHOLDER_CAP = 2;

function messagePlaceholderCap(rule: BaseRule): number {
  const assertions = rule.assertions;
  const assertionIds = isPlainObject(assertions) ? Object.keys(assertions) : [];
  return assertionIds.reduce(
    (cap, id) => Math.max(cap, MESSAGE_PLACEHOLDER_CAPS[id] ?? DEFAULT_MESSAGE_PLACEHOLDER_CAP),
    DEFAULT_MESSAGE_PLACEHOLDER_CAP
  );
}

function validateSemantics(
  config: RecheckConfig,
  rulesWithExplicitScope: ReadonlySet<string> = new Set()
): {
  errors: ValidationError[];
  rules: NormalizedRule[];
} {
  const errors: ValidationError[] = [];
  const rules: NormalizedRule[] = [];

  // Dedupes the stale-pattern warning below to once per distinct message
  // for this whole validate() call — a config with the same stale pattern
  // shape on more than one rule only warns once per load.
  const warnedMessages = new Set<string>();
  const warnOnce = (message: string) => {
    if (warnedMessages.has(message)) return;
    warnedMessages.add(message);
    // oxlint-disable-next-line eslint/no-console -- reporter/config console output predates this relocation; Task 3 removes these entirely (see task-1-report.md), so this is a temporary suppression, not a permanent exception.
    console.warn(message);
  };

  for (const [key, rule] of Object.entries(config)) {
    try {
      // Derive name and shortName
      const name = key;
      const shortName = key.replace(/^recheck\//, '');

      // Validate message placeholder count against the rule's own
      // per-assertion cap (see MESSAGE_PLACEHOLDER_CAPS above). `rule.message`
      // is required by the JSON schema (see schema.ts `required`) so it is
      // always a string by the time a config passes AJV structural
      // validation; the `?? ''` only satisfies the now-optional
      // NormalizedRule/BaseRule type.
      const placeholderCount = ((rule.message ?? '').match(/%s/g) || []).length;
      const placeholderCap = messagePlaceholderCap(rule);
      if (placeholderCount > placeholderCap) {
        errors.push({
          message: `Rule "${name}": message can have at most ${placeholderCap} %s placeholders, found ${placeholderCount}`,
          path: `${name}.message`,
        });
      }

      // Assertions validation
      validateAssertions(rule, name, errors);

      // Removed `pattern` options (negate) must fail loudly, not no-op
      validatePatternOptions(rule, name, errors);

      validateOccurrenceOptions(rule, name, errors);
      validateRepetitionOptions(rule, name, errors);
      validateConsistencyOptions(rule, name, errors);
      validateConditionalOptions(rule, name, errors);
      validateCapitalizationOptions(rule, name, errors);
      validateMetricOptions(rule, name, errors);
      validateListLengthOptions(rule, name, errors);
      validateSpellingOptions(rule, name, errors);
      validateSwapOptions(rule, name, errors);
      validateLengthOptions(rule, name, errors);

      // Scope vocabulary/selector-syntax validation
      validateScope(rule, name, errors);

      // Stale `^#`-prefixed pattern token vs. non-raw/non-all scope
      warnStalePatternPrefix(rule, name, warnOnce);

      // Create normalized rule. `metric` rules are forced to
      // `scope: summary` (see normalizeMetricScope above).
      const normalizedRule: NormalizedRule = {
        ...rule,
        scope: normalizeMetricScope(rule, name, rulesWithExplicitScope.has(name), warnOnce),
        name,
        shortName,
      };

      rules.push(normalizedRule);
    } catch (error) {
      errors.push({
        message: `Rule "${key}": ${error instanceof Error ? error.message : String(error)}`,
        path: key,
      });
    }
  }

  return { errors, rules };
}

/**
 * Full validation pipeline. `options.configDir` (default `process.cwd()`) is
 * where a relative `markdoc.extend.tagsFile` resolves from -- the directory
 * containing the config file, so a project's `tagsFile: ./tags.yaml` behaves
 * the same regardless of the caller's own working directory.
 */
export async function validate(
  config: any,
  options?: { configDir?: string }
): Promise<{
  isValid: boolean;
  errors: ValidationError[];
  rules: NormalizedRule[];
  // Opt-in Markdoc tokenization flag plus its resolved schema, normalized by
  // `resolveMarkdocConfig` from either the boolean shorthand or the object
  // form. `enabled` is `true` only for the literal `true` or an object with a
  // `schema` (including `schema: false`, which still parses and pairs); any
  // other value, including an invalid shape that structural validation already
  // rejects, normalizes to disabled. `schema` is the resolved schema to
  // validate tags and attributes against, or `null` when there is none.
  markdoc: { enabled: boolean; schema: MarkdocSchema | null };
  /** The config's top-level `baseline` path, as written (config-relative). */
  baselinePath?: string;
}> {
  // Resolve `extends` presets before schema validation of rules: the
  // merged (preset + user) config is what gets schema/semantic-validated,
  // so patternProperties only ever sees real `<namespace>/<rule>` rule keys
  // (`recheck/*` and, since the style-guide presets were added, `google/*`,
  // `microsoft/*`, and other preset-namespaced ids -- see schema.ts).
  // `extends` itself is schema-legal at the top level (see schema.ts) but
  // is stripped here — it is not a rule and must not reach rule iteration.
  // `resolveExtends` only fails to merge the UNRESOLVABLE preset name(s) it
  // reports in `extendsErrors` — every other preset and all of the user's
  // own top-level rule keys still land in `resolvedConfig` — so structure
  // and semantic validation below still run against everything that DID
  // resolve, instead of being skipped just because one `extends` entry
  // named an unknown preset. An unknown preset used to short-circuit semantic
  // validation entirely, hiding e.g. an unknown assertion id elsewhere in the
  // same config.
  const hasExtends = isPlainObject(config) && 'extends' in config;
  const { config: resolvedConfig, errors: extendsErrors } = hasExtends
    ? resolveExtends(config)
    : { config: config as RecheckConfig, errors: [] as ValidationError[] };

  // Which rules carry an EXPLICIT `scope`, recorded before validateStructure
  // runs: AJV `useDefaults` mutates the config in place, injecting
  // `scope: 'all'` onto every rule that omitted it, so this is the only
  // point where "configured" and "defaulted" scopes are distinguishable —
  // normalizeMetricScope needs the distinction to warn only about scopes a
  // user actually wrote.
  const rulesWithExplicitScope = new Set(
    isPlainObject(resolvedConfig)
      ? Object.entries(resolvedConfig)
          .filter(
            ([key, rule]) =>
              key !== 'extends' &&
              key !== 'markdoc' &&
              key !== 'excludes' &&
              key !== 'baseline' &&
              isPlainObject(rule) &&
              'scope' in rule
          )
          .map(([key]) => key)
      : []
  );

  const structureErrors = validateStructure(resolvedConfig);
  // `markdoc`, like `extends`, is an engine-level flag rather than a rule, so
  // it is read here before being stripped from rule iteration below.
  // `resolveMarkdocConfig` is defensive about the shape it is handed, so this
  // is safe to call even when `structureErrors` is about to report the same
  // value as invalid (e.g. `{ schema: 'bogus' }`).
  const rawMarkdoc = (resolvedConfig as { markdoc?: unknown } | null | undefined)?.markdoc as
    | boolean
    | MarkdocUserConfig
    | undefined;
  let { enabled: markdocEnabled, schema: markdocSchema } = resolveMarkdocConfig(rawMarkdoc);
  // The stale-preset warning is independent of structure and semantic
  // validity, so it runs here rather than after an error-return path below
  // could short-circuit it. A bare `console.warn` is enough: unlike
  // `warnStalePatternPrefix`, which runs once per rule and needs the deduping
  // `warnOnce`, this fires at most once per `validate()` call.
  warnStaleMarkdocPreset(
    hasExtends ? (config as { extends?: unknown }).extends : undefined,
    markdocEnabled,
    // oxlint-disable-next-line eslint/no-console -- reporter/config console output predates this relocation; Task 3 removes these entirely (see task-1-report.md), so this is a temporary suppression, not a permanent exception.
    (message) => console.warn(message)
  );
  if (structureErrors.length > 0) {
    return {
      isValid: false,
      errors: [...extendsErrors, ...structureErrors],
      rules: [],
      markdoc: { enabled: markdocEnabled, schema: markdocSchema },
    };
  }

  // Only reached once structural validation passed, so `rawMarkdoc`'s shape
  // (including `extend.tagsFile`, when present) is already known-good --
  // safe to resolve and read the file now. `loadMarkdocTagsFile` itself
  // never touches the filesystem when there's no `tagsFile` to load.
  const { fileTags, errors: tagsFileErrors } = await loadMarkdocTagsFile(
    rawMarkdoc,
    options?.configDir ?? process.cwd()
  );
  if (tagsFileErrors.length > 0) {
    // Degrade exactly like any other invalid markdoc shape: a broken
    // tagsFile leaves no trustworthy schema for markdoc rules to run
    // against for this call.
    markdocEnabled = false;
    markdocSchema = null;
  } else if (fileTags) {
    const resolvedExtend: ResolvedExtend = {
      fileTags,
      tags: isPlainObject<MarkdocUserConfig>(rawMarkdoc) ? rawMarkdoc.extend?.tags : undefined,
    };
    ({ enabled: markdocEnabled, schema: markdocSchema } = resolveMarkdocConfig(
      rawMarkdoc,
      resolvedExtend
    ));
  }

  // Then validate semantics of everything that resolved successfully.
  // `markdoc` is stripped first, exactly as `extends` is stripped in
  // resolveExtends, so rule iteration in validateSemantics never sees it.
  const {
    markdoc: _markdoc,
    excludes: globalExcludes,
    baseline: baselinePath,
    ...rulesOnlyConfig
  } = resolvedConfig as RecheckConfig & {
    markdoc?: boolean | MarkdocUserConfig;
    excludes?: string[];
    baseline?: string;
  };
  const { errors: semanticErrors, rules: validatedRules } = validateSemantics(
    rulesOnlyConfig as RecheckConfig,
    rulesWithExplicitScope
  );
  // Merged ahead of each rule's own list rather than replacing it: a rule
  // that already excludes a path keeps doing so.
  const rules = globalExcludes?.length
    ? validatedRules.map((rule) => ({
        ...rule,
        excludes: [...globalExcludes, ...(rule.excludes ?? [])],
      }))
    : validatedRules;

  const peerErrors = await checkSpellingPeerDependencies(rules);

  const errors = [...extendsErrors, ...semanticErrors, ...peerErrors, ...tagsFileErrors];
  return {
    isValid: errors.length === 0,
    errors,
    rules,
    markdoc: { enabled: markdocEnabled, schema: markdocSchema },
    baselinePath,
  };
}
