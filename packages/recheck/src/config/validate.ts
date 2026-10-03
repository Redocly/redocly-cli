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
import type { RecheckRules, NormalizedRule, ValidationError, BaseRule } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { RECHECK_CONFIG_SCHEMA, MARKDOC_TAG_SCHEMA } from './schema.js';

const ajv = new (Ajv as any)({
  // mismatching AJV typing due to fork
  useDefaults: true,
  allErrors: true,
});
(addFormats as any)(ajv); // mismatching AJV typing due to fork
ajv.addSchema(RECHECK_CONFIG_SCHEMA, 'recheck-config');
// Compiled once, to check the tags read from `markdoc.extend.tagsFile`.
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
      // AJV does not name the unknown key in its message, so add it.
      const extra =
        error.keyword === 'additionalProperties' && error.params?.additionalProperty
          ? ` (unknown property "${error.params.additionalProperty}")`
          : '';
      return {
        message: `${error.message}${extra}`,
        path: error.instancePath,
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
      message: 'Assertions must be an object',
      path: `${name}.assertions`,
    });
    return;
  }

  for (const assertionType of Object.keys(rule.assertions)) {
    let resolved;
    try {
      // Same lookup the runner uses, so every registered rule is known here.
      resolved = resolveAssertion(assertionType);
    } catch {
      errors.push({
        message: `Unknown assertion type "${assertionType}"`,
        path: `${name}.assertions.${assertionType}`,
      });
      continue;
    }

    // Scope assertions have their own validators below. Token rules are checked here.
    if (resolved.kind === 'token') {
      validateTokenRuleOptions(rule, name, assertionType, resolved.rule, errors);
    }
  }
}

// A misspelled option on a token rule would otherwise be silently ignored.
// The rule's `defaults` list every option it accepts.
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
        message: `Unknown option "${key}" for assertion "${id}" (accepted: ${[...allowed].sort().join(', ')})`,
        path: `${name}.assertions.${id}.${key}`,
      });
    }
  }
}

/**
 * Returns the assertion's options if they are a plain object, or `undefined` if it is not set.
 * Reports an error for any other value, which the JSON schema cannot catch.
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
      message: `The ${assertionId} assertion options must be an object`,
      path: `${name}.assertions.${assertionId}`,
    });
    return undefined;
  }
  return config;
}

// `negate` is listed so it gets its own error message below.
const PATTERN_OPTION_KEYS = new Set(['tokens', 'ignoreCase', 'nonword', 'includeCode', 'negate']);

/** Validates the `pattern` options. `negate` is rejected because it never worked. */
function validatePatternOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const patternConfig = requireOptionsObject(rule, name, 'pattern', errors);
  if (!patternConfig) return;

  for (const key of Object.keys(patternConfig)) {
    if (!PATTERN_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Unknown pattern option "${key}"`,
        path: `${name}.assertions.pattern.${key}`,
      });
    }
  }

  if ('negate' in patternConfig) {
    errors.push({
      message:
        `Pattern option "negate" was removed — it never worked ` +
        `(it never reported anything); remove it from the config`,
      path: `${name}.assertions.pattern.negate`,
    });
  }

  // An empty `tokens` array can never report anything, so it is an error too.
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
      message: 'Pattern requires "tokens" to be a non-empty array of strings',
      path: `${name}.assertions.pattern.tokens`,
    });
  }

  if (ignoreCase !== undefined && typeof ignoreCase !== 'boolean') {
    errors.push({
      message: 'Pattern option "ignoreCase" must be a boolean',
      path: `${name}.assertions.pattern.ignoreCase`,
    });
  }

  if (nonword !== undefined && typeof nonword !== 'boolean') {
    errors.push({
      message: 'Pattern option "nonword" must be a boolean',
      path: `${name}.assertions.pattern.nonword`,
    });
  }

  const includeCode = patternConfig.includeCode;
  if (includeCode !== undefined && typeof includeCode !== 'boolean') {
    errors.push({
      message: 'Pattern option "includeCode" must be a boolean',
      path: `${name}.assertions.pattern.includeCode`,
    });
  }
}

/** Validates the `occurrence` options. Needs `min` or `max`, and `min` must not exceed `max`. */
const OCCURRENCE_OPTION_KEYS = new Set(['pattern', 'min', 'max', 'ignoreCase']);

function validateOccurrenceOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const occurrenceConfig = requireOptionsObject(rule, name, 'occurrence', errors);
  if (!occurrenceConfig) return;

  for (const key of Object.keys(occurrenceConfig)) {
    if (!OCCURRENCE_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Unknown occurrence option "${key}"`,
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
      message: 'Occurrence requires at least one of "min" or "max"',
      path: `${name}.assertions.occurrence`,
    });
  }

  if (min !== undefined && typeof min !== 'number') {
    errors.push({
      message: 'Occurrence option "min" must be a number',
      path: `${name}.assertions.occurrence.min`,
    });
  }

  if (max !== undefined && typeof max !== 'number') {
    errors.push({
      message: 'Occurrence option "max" must be a number',
      path: `${name}.assertions.occurrence.max`,
    });
  }

  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push({
      message: `Occurrence "min" (${min}) must not exceed "max" (${max})`,
      path: `${name}.assertions.occurrence`,
    });
  }

  // An empty pattern would match everywhere.
  if (typeof pattern !== 'string' || pattern.length === 0) {
    errors.push({
      message: 'Occurrence requires a non-empty string "pattern"',
      path: `${name}.assertions.occurrence.pattern`,
    });
  }
}

/** Validates the `repetition` options. All are optional. */
const REPETITION_OPTION_KEYS = new Set(['pattern', 'ignoreCase', 'includeCode']);

function validateRepetitionOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const repetitionConfig = requireOptionsObject(rule, name, 'repetition', errors);
  if (!repetitionConfig) return;

  for (const key of Object.keys(repetitionConfig)) {
    if (!REPETITION_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Unknown repetition option "${key}"`,
        path: `${name}.assertions.repetition.${key}`,
      });
    }
  }

  const { pattern, ignoreCase, includeCode } = repetitionConfig as {
    pattern?: unknown;
    ignoreCase?: unknown;
    includeCode?: unknown;
  };

  if (pattern !== undefined && (typeof pattern !== 'string' || pattern.length === 0)) {
    errors.push({
      message: 'Repetition option "pattern" must be a non-empty string',
      path: `${name}.assertions.repetition.pattern`,
    });
  }

  if (ignoreCase !== undefined && typeof ignoreCase !== 'boolean') {
    errors.push({
      message: 'Repetition option "ignoreCase" must be a boolean',
      path: `${name}.assertions.repetition.ignoreCase`,
    });
  }

  if (includeCode !== undefined && typeof includeCode !== 'boolean') {
    errors.push({
      message: 'Repetition option "includeCode" must be a boolean',
      path: `${name}.assertions.repetition.includeCode`,
    });
  }
}

/** Validates the `consistency` options. `either` needs at least one pair of variants. */
const CONSISTENCY_OPTION_KEYS = new Set(['either', 'ignoreCase', 'includeCode']);

function validateConsistencyOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const consistencyConfig = requireOptionsObject(rule, name, 'consistency', errors);
  if (!consistencyConfig) return;

  for (const key of Object.keys(consistencyConfig)) {
    if (!CONSISTENCY_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Unknown consistency option "${key}"`,
        path: `${name}.assertions.consistency.${key}`,
      });
    }
  }

  const { either, ignoreCase, includeCode } = consistencyConfig as {
    either?: unknown;
    ignoreCase?: unknown;
    includeCode?: unknown;
  };

  if (!isPlainObject(either)) {
    errors.push({
      message:
        'Consistency requires "either" to be an object mapping one variant to another (e.g. behavior: behaviour)',
      path: `${name}.assertions.consistency.either`,
    });
  } else {
    const entries = Object.entries(either);
    if (entries.length === 0) {
      errors.push({
        message: 'Consistency "either" must declare at least one variant pair',
        path: `${name}.assertions.consistency.either`,
      });
    }
    for (const [variant, alternative] of entries) {
      if (variant.length === 0) {
        errors.push({
          message: 'Consistency "either" entry keys must be non-empty strings',
          path: `${name}.assertions.consistency.either`,
        });
      }
      if (typeof alternative !== 'string' || alternative.length === 0) {
        errors.push({
          message: `Consistency "either" entry "${variant}" must map to a non-empty string variant`,
          path: `${name}.assertions.consistency.either.${variant}`,
        });
      }
    }
  }

  if (ignoreCase !== undefined && typeof ignoreCase !== 'boolean') {
    errors.push({
      message: 'Consistency option "ignoreCase" must be a boolean',
      path: `${name}.assertions.consistency.ignoreCase`,
    });
  }

  if (includeCode !== undefined && typeof includeCode !== 'boolean') {
    errors.push({
      message: 'Consistency option "includeCode" must be a boolean',
      path: `${name}.assertions.consistency.includeCode`,
    });
  }
}

/** Validates the `conditional` options. `first` and `second` are required strings. */
const CONDITIONAL_OPTION_KEYS = new Set(['first', 'second', 'ignoreCase']);

function validateConditionalOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const conditionalConfig = requireOptionsObject(rule, name, 'conditional', errors);
  if (!conditionalConfig) return;

  for (const key of Object.keys(conditionalConfig)) {
    if (!CONDITIONAL_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Unknown conditional option "${key}"`,
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
      message: 'Conditional requires a non-empty string "first"',
      path: `${name}.assertions.conditional.first`,
    });
  }

  if (typeof second !== 'string' || second.length === 0) {
    errors.push({
      message: 'Conditional requires a non-empty string "second"',
      path: `${name}.assertions.conditional.second`,
    });
  }

  if (ignoreCase !== undefined && typeof ignoreCase !== 'boolean') {
    errors.push({
      message: 'Conditional option "ignoreCase" must be a boolean',
      path: `${name}.assertions.conditional.ignoreCase`,
    });
  }
}

/** Validates the `capitalization` options. `match` is required. */
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
        message: `Unknown capitalization option "${key}"`,
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
      message: 'Capitalization option "builtinVocabulary" must be a boolean',
      path: `${name}.assertions.capitalization.builtinVocabulary`,
    });
  }

  if (typeof match !== 'string' || match.length === 0) {
    errors.push({
      message:
        `Capitalization requires a non-empty string "match" ` +
        `($title, $sentence, $lower, $upper, or a regex pattern)`,
      path: `${name}.assertions.capitalization.match`,
    });
  }

  if (style !== undefined && style !== 'ap' && style !== 'chicago') {
    errors.push({
      message: 'Capitalization option "style" must be "ap" or "chicago"',
      path: `${name}.assertions.capitalization.style`,
    });
  }

  if (exceptions !== undefined) {
    const isValidExceptions =
      Array.isArray(exceptions) &&
      exceptions.every((entry) => typeof entry === 'string' && entry.length > 0);
    if (!isValidExceptions) {
      errors.push({
        message: 'Capitalization option "exceptions" must be an array of non-empty strings',
        path: `${name}.assertions.capitalization.exceptions`,
      });
    }
  }
}

/** Validates the `metric` options. `formula` is required, and `min` or `max` is needed. */
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
        message: `Unknown metric option "${key}"`,
        path: `${name}.assertions.metric.${key}`,
      });
    }
  }

  const { formula, min, max } = metricConfig as { formula?: unknown; min?: unknown; max?: unknown };

  if (typeof formula !== 'string' || !METRIC_FORMULAS.has(formula)) {
    errors.push({
      message: `Metric requires "formula" to be one of ${[...METRIC_FORMULAS].join(', ')}`,
      path: `${name}.assertions.metric.formula`,
    });
  }

  if (min === undefined && max === undefined) {
    errors.push({
      message: 'Metric requires at least one of "min" or "max"',
      path: `${name}.assertions.metric`,
    });
  }

  if (min !== undefined && typeof min !== 'number') {
    errors.push({
      message: 'Metric option "min" must be a number',
      path: `${name}.assertions.metric.min`,
    });
  }

  if (max !== undefined && typeof max !== 'number') {
    errors.push({
      message: 'Metric option "max" must be a number',
      path: `${name}.assertions.metric.max`,
    });
  }

  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push({
      message: `Metric "min" (${min}) must not exceed "max" (${max})`,
      path: `${name}.assertions.metric`,
    });
  }
}

/**
 * Checks `min` and `max` for `length` and `list-length`. Counts cannot be negative, so `min` must
 * be a positive integer and `max` a non-negative integer. Wrong types are reported by the caller.
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
        `The ${assertionId} option "min" must be a positive integer ` +
        `(${min} could never be violated by a real count)`,
      path: `${name}.assertions.${assertionId}.min`,
    });
  }

  if (typeof max === 'number' && (!Number.isInteger(max) || max < 0)) {
    errors.push({
      message:
        `The ${assertionId} option "max" must be a non-negative integer ` +
        `(${max} would be violated by every real count)`,
      path: `${name}.assertions.${assertionId}.max`,
    });
  }
}

/**
 * Validates the `list-length` options. `min` and `max` are optional, because the rule has a
 * default `min` of 2.
 */
function validateListLengthOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const listLengthConfig = requireOptionsObject(rule, name, 'list-length', errors);
  if (!listLengthConfig) return;

  const { min, max } = listLengthConfig as { min?: unknown; max?: unknown };

  if (min !== undefined && typeof min !== 'number') {
    errors.push({
      message: 'List-length option "min" must be a number',
      path: `${name}.assertions.list-length.min`,
    });
  }

  if (max !== undefined && typeof max !== 'number') {
    errors.push({
      message: 'List-length option "max" must be a number',
      path: `${name}.assertions.list-length.max`,
    });
  }

  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push({
      message: `List-length "min" (${min}) must not exceed "max" (${max})`,
      path: `${name}.assertions.list-length`,
    });
  }

  validateCountBounds(name, 'list-length', min, max, errors);
}

/** Validates the `spelling` options. All are optional. */
const SPELLING_OPTION_KEYS = new Set(['dictionary', 'vocab', 'ignore', 'builtinVocabulary']);

function validateSpellingOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const spellingConfig = requireOptionsObject(rule, name, 'spelling', errors);
  if (!spellingConfig) return;

  for (const key of Object.keys(spellingConfig)) {
    if (!SPELLING_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Unknown spelling option "${key}"`,
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
      message: 'Spelling option "builtinVocabulary" must be a boolean',
      path: `${name}.assertions.spelling.builtinVocabulary`,
    });
  }

  if (dictionary !== undefined && (typeof dictionary !== 'string' || dictionary.length === 0)) {
    errors.push({
      message: 'Spelling option "dictionary" must be a non-empty string',
      path: `${name}.assertions.spelling.dictionary`,
    });
  }

  if (vocab !== undefined) {
    const isValidVocab =
      Array.isArray(vocab) && vocab.every((word) => typeof word === 'string' && word.length > 0);
    if (!isValidVocab) {
      errors.push({
        message: 'Spelling option "vocab" must be an array of non-empty strings',
        path: `${name}.assertions.spelling.vocab`,
      });
    }
  }

  if (ignore !== undefined) {
    const isValidIgnore =
      Array.isArray(ignore) && ignore.every((word) => typeof word === 'string' && word.length > 0);
    if (!isValidIgnore) {
      errors.push({
        message: 'Spelling option "ignore" must be an array of non-empty strings',
        path: `${name}.assertions.spelling.ignore`,
      });
    }
  }
}

/** Validates the `length` options. `unit` is required, and `min` or `max` is needed. */
const LENGTH_OPTION_KEYS = new Set(['unit', 'min', 'max']);
const LENGTH_UNITS = new Set(['characters', 'words', 'sentences']);

function validateLengthOptions(rule: BaseRule, name: string, errors: ValidationError[]): void {
  const lengthConfig = requireOptionsObject(rule, name, 'length', errors);
  if (!lengthConfig) return;

  for (const key of Object.keys(lengthConfig)) {
    if (!LENGTH_OPTION_KEYS.has(key)) {
      errors.push({
        message: `Unknown length option "${key}"`,
        path: `${name}.assertions.length.${key}`,
      });
    }
  }

  const { unit, min, max } = lengthConfig as { unit?: unknown; min?: unknown; max?: unknown };

  if (typeof unit !== 'string' || !LENGTH_UNITS.has(unit)) {
    errors.push({
      message: `Length requires "unit" to be one of ${[...LENGTH_UNITS].join(', ')}`,
      path: `${name}.assertions.length.unit`,
    });
  }

  if (min === undefined && max === undefined) {
    errors.push({
      message: 'Length requires at least one of "min" or "max"',
      path: `${name}.assertions.length`,
    });
  }

  if (min !== undefined && typeof min !== 'number') {
    errors.push({
      message: 'Length option "min" must be a number',
      path: `${name}.assertions.length.min`,
    });
  }

  if (max !== undefined && typeof max !== 'number') {
    errors.push({
      message: 'Length option "max" must be a number',
      path: `${name}.assertions.length.max`,
    });
  }

  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push({
      message: `Length "min" (${min}) must not exceed "max" (${max})`,
      path: `${name}.assertions.length`,
    });
  }

  validateCountBounds(name, 'length', min, max, errors);
}

/** Validates the entries of `swap.pairs`. A replacement may be empty, which deletes the match. */
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
        message: 'Swap "pairs" entry keys must be non-empty strings',
        path: entryPath,
      });
    }
    if (typeof value !== 'string') {
      errors.push({
        message: `Swap "pairs" entry "${key}" must map to a string replacement`,
        path: entryPath,
      });
    }
  }
}

/**
 * Validates the `swap` options. Find and replace entries must be under `pairs`.
 * Entries at the top level are rejected because they would be ignored.
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
          `Unknown swap option "${key}" -- swap does not accept ` +
          `find -> replace entries at the top level; move find -> replace entries under "pairs:"`,
        path: `${name}.assertions.swap.${key}`,
      });
    }
  }

  for (const key of SWAP_BOOLEAN_OPTION_KEYS) {
    const value = swapConfig[key];
    if (value !== undefined && typeof value !== 'boolean') {
      errors.push({
        message: `Swap option "${key}" must be a boolean`,
        path: `${name}.assertions.swap.${key}`,
      });
    }
  }

  if (!('pairs' in swapConfig)) {
    errors.push({
      message: 'Swap requires a "pairs" object mapping find -> replace strings',
      path: `${name}.assertions.swap.pairs`,
    });
    return;
  }

  const pairs = swapConfig.pairs;
  if (!isPlainObject(pairs) || Object.keys(pairs).length === 0) {
    errors.push({
      message: 'Swap option "pairs" must be a non-empty object mapping find -> replace strings',
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
 * Checks that the optional `nspell` and `dictionary-en` packages are installed when `spelling`
 * is used, and that a custom `dictionary` points to readable `.aff` and `.dic` files.
 */
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

    // A custom dictionary does not use `dictionary-en`.
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
      // Report each message once, at the first rule that needs it.
      if (!reportedMessages.has(message)) {
        reportedMessages.add(message);
        errors.push({ message, path: `${rule.name}.assertions.spelling` });
      }
    }

    // Even with `nspell` installed, a custom dictionary may point to missing files.
    // Report each path once.
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
            `Spelling dictionary file${unreadable.length > 1 ? 's' : ''} ` +
            `not found or not readable: ${unreadable.join(', ')}`,
          path: `${rule.name}.assertions.spelling.dictionary`,
        });
      }
    }
  }

  return errors;
}

/**
 * Warns when a rule that needs Markdoc parsing is on while `markdoc` is off, because
 * such a rule cannot report then. Goes to `warn`, so `isValid` stays `true`.
 */
function warnMarkdocRulesWithoutParsing(
  config: unknown,
  markdocEnabled: boolean,
  warnOnce: (message: string) => void
): void {
  if (markdocEnabled || !isPlainObject(config)) return;
  const names = Object.entries(config)
    .filter(
      ([, rule]) =>
        isPlainObject(rule) &&
        rule.severity !== 'off' &&
        isPlainObject(rule.assertions) &&
        Object.keys(rule.assertions).some((id) => id.startsWith('markdoc-'))
    )
    .map(([name]) => name);
  if (names.length === 0) return;
  warnOnce(
    `recheck: ${names.join(', ')} need Markdoc parsing, but "markdoc" parsing is off, so they ` +
      'can never fire; set "markdoc: true" (or an object form) to enable them.'
  );
}

/**
 * Reads and checks `markdoc.extend.tagsFile`, relative to `configDir`. Returns the tags and any
 * errors. Does not touch the file system when there is no `tagsFile`.
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
      message: `could not read "${resolvedPath}": ${error instanceof Error ? error.message : String(error)}`,
    });
    return { errors };
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(content);
  } catch (error) {
    errors.push({
      path: '/markdoc/extend/tagsFile',
      message: `could not parse "${resolvedPath}" as YAML: ${error instanceof Error ? error.message : String(error)}`,
    });
    return { errors };
  }

  if (!isPlainObject(parsed)) {
    errors.push({
      path: '/markdoc/extend/tagsFile',
      message: `"${resolvedPath}" must be a YAML map of tag name to tag schema, got ${
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
        message: `"${resolvedPath}" tag "${tagName}" is invalid: ${detail}`,
      });
      continue;
    }
    fileTags[tagName] = tagValue as MarkdocTagSchema;
  }

  // One bad tag invalidates the whole file.
  if (errors.length > 0) return { errors };
  return { fileTags, errors: [] };
}

/**
 * Warns about a `pattern` token that starts with `^#` in a scope other than `raw` or `all`.
 * Those scopes pass only the text without markup, so the token can never match.
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
  // A scope entry can join terms with `&`, so check every term.
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
 * Forces `scope: summary` on rules with a `metric` assertion, because readability is scored over
 * the whole document's prose. Warns if the user set another scope.
 * `hasExplicitScope` is needed because AJV adds `scope: all` to rules without one.
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

/** Checks each term of a rule's `scope` against the scope vocabulary and selector syntax. */
function validateScope(rule: BaseRule, name: string, errors: ValidationError[]): void {
  if (rule.scope === undefined) return;
  const entries = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
  for (const entry of entries) {
    if (typeof entry !== 'string') continue; // caught by schema
    for (const problem of validateScopeSelector(entry)) {
      errors.push({
        message: `Invalid scope — ${problem}`,
        path: `${name}.scope`,
      });
    }
    // `all` or `raw` inside a compound or negated selector never matches or matches everything.
    for (const problem of wholeDocumentKeywordProblems(entry)) {
      errors.push({
        message: `Invalid scope — ${problem}`,
        path: `${name}.scope`,
      });
    }
  }

  // `all` and `raw` cover the whole document, so they cannot be mixed with other scopes.
  if (entries.length > 1) {
    for (const entry of entries) {
      if (typeof entry !== 'string') continue; // caught by schema
      const term = entry.trim();
      if (term === 'all' || term === 'raw') {
        errors.push({
          message:
            `Scope "${term}" covers the whole document and cannot be ` +
            `combined with other scopes — use \`scope: ${term}\` alone`,
          path: `${name}.scope`,
        });
      }
    }
  }
}

/**
 * The most `%s` placeholders a message may have. `metric` fills four and `length` three. Other
 * assertions fill two. A rule gets the highest cap of its assertions.
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
  config: RecheckRules,
  warn: (message: string) => void,
  rulesWithExplicitScope: ReadonlySet<string> = new Set()
): {
  errors: ValidationError[];
  rules: NormalizedRule[];
} {
  const errors: ValidationError[] = [];
  const rules: NormalizedRule[] = [];

  // Each distinct warning is shown once.
  const warnedMessages = new Set<string>();
  const warnOnce = (message: string) => {
    if (warnedMessages.has(message)) return;
    warnedMessages.add(message);
    warn(message);
  };

  for (const [key, rule] of Object.entries(config)) {
    try {
      const name = key;
      const shortName = key.replace(/^recheck\//, '');

      // `message` is required by the schema, so `?? ''` only satisfies the type.
      const placeholderCount = ((rule.message ?? '').match(/%s/g) || []).length;
      const placeholderCap = messagePlaceholderCap(rule);
      if (placeholderCount > placeholderCap) {
        errors.push({
          message: `Message can have at most ${placeholderCap} %s placeholders, found ${placeholderCount}`,
          path: `${name}.message`,
        });
      }

      validateAssertions(rule, name, errors);

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

      validateScope(rule, name, errors);

      warnStalePatternPrefix(rule, name, warnOnce);

      const normalizedRule: NormalizedRule = {
        ...rule,
        scope: normalizeMetricScope(rule, name, rulesWithExplicitScope.has(name), warnOnce),
        name,
        shortName,
      };

      rules.push(normalizedRule);
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : String(error),
        path: key,
      });
    }
  }

  return { errors, rules };
}

// A token rule's message comes from its defaults; a scope rule must name one.
function fillDefaultMessages(
  rules: Record<string, Partial<BaseRule>>
): Record<string, Partial<BaseRule>> {
  const filled = { ...rules };
  for (const [key, entry] of Object.entries(rules)) {
    if (!isPlainObject(entry) || entry.message !== undefined) continue;
    if (!isPlainObject(entry.assertions)) continue;
    const message = Object.keys(entry.assertions)
      .map(tokenDefaultMessage)
      .find((candidate) => candidate !== undefined);
    if (message !== undefined) filled[key] = { ...entry, message };
  }
  return filled;
}

function tokenDefaultMessage(assertionId: string): string | undefined {
  try {
    const resolved = resolveAssertion(assertionId);
    const message = resolved.kind === 'token' ? resolved.rule.defaults.message : undefined;
    return typeof message === 'string' ? message : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Validates a config. `options.configDir` (default `process.cwd()`) is where a relative
 * `markdoc.extend.tagsFile` resolves from.
 */
export async function validate(
  config: any,
  options?: { configDir?: string; warn?: (message: string) => void }
): Promise<{
  isValid: boolean;
  errors: ValidationError[];
  rules: NormalizedRule[];
  // `enabled` is true for `markdoc: true` or an object with a `schema` (including `schema: false`).
  // `schema` is null when there is none.
  markdoc: { enabled: boolean; schema: MarkdocSchema | null };
}> {
  const warn = options?.warn ?? (() => {});

  // Validation writes defaults into the rules, and core passes preset rules through by
  // reference, so work on a copy.
  const resolvedConfig = isPlainObject(config)
    ? fillDefaultMessages(structuredClone(config) as Record<string, Partial<BaseRule>>)
    : config;

  // Remember which rules set `scope` themselves, because AJV fills in `scope: 'all'` on the rest.
  const rulesWithExplicitScope = new Set(
    isPlainObject(resolvedConfig)
      ? Object.entries(resolvedConfig)
          .filter(
            ([key, rule]) =>
              key !== 'markdoc' && key !== 'excludes' && isPlainObject(rule) && 'scope' in rule
          )
          .map(([key]) => key)
      : []
  );

  const structureErrors = validateStructure(resolvedConfig);
  // `markdoc` is a setting, not a rule. Read it here and remove it before the rules are checked.
  const rawMarkdoc = (resolvedConfig as { markdoc?: unknown } | null | undefined)?.markdoc as
    | boolean
    | MarkdocUserConfig
    | undefined;
  let { enabled: markdocEnabled, schema: markdocSchema } = resolveMarkdocConfig(rawMarkdoc);
  // Runs before the early return below, so the warning is not skipped.
  warnMarkdocRulesWithoutParsing(resolvedConfig, markdocEnabled, warn);
  if (structureErrors.length > 0) {
    return {
      isValid: false,
      errors: structureErrors,
      rules: [],
      markdoc: { enabled: markdocEnabled, schema: markdocSchema },
    };
  }

  // The shape is valid by now, so it is safe to read `tagsFile`.
  const { fileTags, errors: tagsFileErrors } = await loadMarkdocTagsFile(
    rawMarkdoc,
    options?.configDir ?? process.cwd()
  );
  if (tagsFileErrors.length > 0) {
    // A broken tags file leaves no schema to check tags against, so turn markdoc off.
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

  // Then check the rules. `markdoc` is removed first because it is not a rule.
  const {
    markdoc: _markdoc,
    excludes: globalExcludes,
    ...rulesOnlyConfig
  } = resolvedConfig as RecheckRules & {
    markdoc?: boolean | MarkdocUserConfig;
    excludes?: string[];
  };
  const { errors: semanticErrors, rules: validatedRules } = validateSemantics(
    rulesOnlyConfig as RecheckRules,
    warn,
    rulesWithExplicitScope
  );
  // Added before each rule's own list, so a rule keeps the paths it already excludes.
  const rules = globalExcludes?.length
    ? validatedRules.map((rule) => ({
        ...rule,
        excludes: [...globalExcludes, ...(rule.excludes ?? [])],
      }))
    : validatedRules;

  const peerErrors = await checkSpellingPeerDependencies(rules);

  const errors = [...semanticErrors, ...peerErrors, ...tagsFileErrors];
  return {
    isValid: errors.length === 0,
    errors,
    rules,
    markdoc: { enabled: markdocEnabled, schema: markdocSchema },
  };
}
