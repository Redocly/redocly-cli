import { existsSync } from 'node:fs';
import * as path from 'node:path';

import type { MarkdocSchema, MarkdocUserConfig } from '../parser/markdoc/schema.js';
import type { BaseRule, NormalizedRule, RuleSeverity, ValidationError } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { validate } from './validate.js';

type RecheckRulesInput = Record<string, RuleSeverity | Partial<BaseRule>>;

// The `recheck` block of redocly.yaml, before the engine validates it.
export interface RecheckBlock {
  rules?: RecheckRulesInput;
  excludes?: string[];
  markdoc?: boolean | MarkdocUserConfig;
  apiDescriptions?: { rules?: RecheckRulesInput };
}

export interface ResolvedRecheckConfig {
  rules: NormalizedRule[];
  configDir: string;
  markdoc: boolean;
  markdocSchema: MarkdocSchema | null;
  baselinePath?: string;
  // The effective rules with the `apiDescriptions.rules` overrides applied.
  descriptionRules: NormalizedRule[];
}

export interface RecheckBlockInput {
  // The `recheck/*` entries from `extends` of redocly.yaml, in order.
  extends?: string[];
  // The `recheck` block of redocly.yaml, as parsed.
  block?: unknown;
  configDir: string;
  warn?: (message: string) => void;
}

export type ResolveResult =
  | { success: true; config: ResolvedRecheckConfig; errors: [] }
  | { success: false; errors: ValidationError[] };

export const DEFAULT_BASELINE_FILE = '.redocly.recheck-baseline.yaml';

const SEVERITIES = new Set(['off', 'info', 'warn', 'error']);
const ENGINE_SETTINGS = new Set(['excludes', 'markdoc']);

// The block nests rules under `rules`; the engine's own config shape keeps
// rule entries at the top level beside `excludes` and `markdoc`.
function toEngineConfig(
  block: Record<string, unknown>,
  extendsList: string[] | undefined
): Record<string, unknown> {
  const { rules, apiDescriptions: _apiDescriptions, ...rest } = block;
  const engineConfig: Record<string, unknown> = { ...rest };
  if (extendsList && extendsList.length > 0) engineConfig.extends = extendsList;
  if (isPlainObject(rules)) {
    for (const [name, entry] of Object.entries(rules)) {
      engineConfig[name] =
        typeof entry === 'string' && SEVERITIES.has(entry) ? { severity: entry } : entry;
    }
  }
  return engineConfig;
}

const OVERRIDE_KEYS = new Set([
  'severity',
  'message',
  'tags',
  'description',
  'link',
  'scope',
  'appliesTo',
  'excludes',
  'exceptions',
  'fix',
  'assertions',
]);

// Applies `apiDescriptions.rules` on top of the effective rules. A severity
// string sets the severity; an object merges its fields. Every key must name
// a rule that is in effect.
function applyDescriptionOverrides(
  rules: NormalizedRule[],
  overrides: unknown
): { rules: NormalizedRule[]; errors: ValidationError[] } {
  if (!isPlainObject(overrides)) return { rules, errors: [] };
  const errors: ValidationError[] = [];
  const byName = new Map(rules.map((rule) => [rule.name, rule]));
  for (const [name, value] of Object.entries(overrides)) {
    const path = `recheck.apiDescriptions.rules.${name}`;
    const rule = byName.get(name);
    if (rule === undefined) {
      errors.push({ message: `"${name}" is not a rule in effect, so it has no override`, path });
      continue;
    }
    if (typeof value === 'string') {
      if (!SEVERITIES.has(value)) {
        errors.push({ message: `"${name}" has an unknown severity "${value}"`, path });
        continue;
      }
      byName.set(name, { ...rule, severity: value as NormalizedRule['severity'] });
      continue;
    }
    if (!isPlainObject(value)) {
      errors.push({ message: `"${name}" must be a severity string or a rule object`, path });
      continue;
    }
    const unknown = Object.keys(value).filter((key) => !OVERRIDE_KEYS.has(key));
    if (unknown.length > 0) {
      errors.push({ message: `"${name}" has unknown keys: ${unknown.join(', ')}`, path });
      continue;
    }
    if (
      'severity' in value &&
      !(typeof value.severity === 'string' && SEVERITIES.has(value.severity))
    ) {
      errors.push({
        message: `"${name}" has an unknown severity "${String(value.severity)}"`,
        path,
      });
      continue;
    }
    byName.set(name, { ...rule, ...(value as Partial<NormalizedRule>) });
  }
  return { rules: [...byName.values()], errors };
}

// The engine validates the flat shape (rule keys at the top level). The block
// nests them under `rules`, so the reported path must say where the user wrote it.
function toBlockPath(enginePath: string | undefined): string {
  if (!enginePath || enginePath === '/') return 'recheck';
  // Schema errors give a JSON pointer.
  // The engine's own checks give `<rule key>.<option>` or `extends`.
  const segments = enginePath.startsWith('/')
    ? enginePath
        .split('/')
        .slice(1)
        .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    : [enginePath];
  if (segments[0] === 'extends') return segments.join('.');
  return ENGINE_SETTINGS.has(segments[0])
    ? `recheck.${segments.join('.')}`
    : `recheck.rules.${segments.join('.')}`;
}

export async function resolveRecheckConfig(input: RecheckBlockInput): Promise<ResolveResult> {
  if (input.block !== undefined && input.block !== null && !isPlainObject(input.block)) {
    return {
      success: false,
      errors: [{ message: '`recheck` must be an object', path: 'recheck' }],
    };
  }
  const block = isPlainObject(input.block) ? input.block : {};
  if ('extends' in block) {
    return {
      success: false,
      errors: [
        {
          message:
            'The `recheck` block does not accept `extends`. Name Recheck presets in the root `extends` of redocly.yaml, for example `extends: [recommended, recheck/markdown]`.',
          path: 'recheck.extends',
        },
      ],
    };
  }
  if ('baseline' in block) {
    return {
      success: false,
      errors: [
        {
          message:
            '`recheck.baseline` is not supported; the command reads `.redocly.recheck-baseline.yaml` next to `redocly.yaml`.',
          path: 'recheck.baseline',
        },
      ],
    };
  }
  if ('rules' in block && !isPlainObject(block.rules)) {
    return {
      success: false,
      errors: [{ message: '`recheck.rules` must be an object', path: 'recheck.rules' }],
    };
  }
  if ('apiDescriptions' in block) {
    const { apiDescriptions } = block;
    const errors: ValidationError[] = [];
    if (!isPlainObject(apiDescriptions)) {
      errors.push({
        message: '`recheck.apiDescriptions` must be an object',
        path: 'recheck.apiDescriptions',
      });
    } else {
      const unknownKeys = Object.keys(apiDescriptions).filter((key) => key !== 'rules');
      if (unknownKeys.length > 0) {
        errors.push({
          message: `\`recheck.apiDescriptions\` has unknown keys: ${unknownKeys.join(', ')}`,
          path: 'recheck.apiDescriptions',
        });
      }
      if ('rules' in apiDescriptions && !isPlainObject(apiDescriptions.rules)) {
        errors.push({
          message: '`recheck.apiDescriptions.rules` must be an object',
          path: 'recheck.apiDescriptions.rules',
        });
      }
    }
    if (errors.length > 0) return { success: false, errors };
  }
  // Validation fills schema defaults in place; the clone keeps the caller's
  // block untouched.
  const validation = await validate(toEngineConfig(structuredClone(block), input.extends), {
    configDir: input.configDir,
    warn: input.warn,
  });
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors.map((error) => ({ ...error, path: toBlockPath(error.path) })),
    };
  }
  const apiDescriptions = isPlainObject(block.apiDescriptions) ? block.apiDescriptions : undefined;
  const overrides = applyDescriptionOverrides(validation.rules, apiDescriptions?.rules);
  if (overrides.errors.length > 0) {
    return { success: false, errors: overrides.errors };
  }
  return {
    success: true,
    errors: [],
    config: {
      rules: validation.rules,
      configDir: input.configDir,
      markdoc: validation.markdoc.enabled,
      markdocSchema: validation.markdoc.schema,
      baselinePath: resolveBaselinePath(input.configDir),
      descriptionRules: overrides.rules,
    },
  };
}

// A `.redocly.recheck-baseline.yaml` next to redocly.yaml is picked up by
// presence.
function resolveBaselinePath(configDir: string): string | undefined {
  const defaultPath = path.resolve(configDir, DEFAULT_BASELINE_FILE);
  return existsSync(defaultPath) ? defaultPath : undefined;
}
