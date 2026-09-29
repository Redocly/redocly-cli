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
  // Raw `apiDescriptions.rules` from the block; the API-description path
  // applies them on top of `rules`.
  apiDescriptionRules?: Record<string, unknown>;
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
  return {
    success: true,
    errors: [],
    config: {
      rules: validation.rules,
      configDir: input.configDir,
      markdoc: validation.markdoc.enabled,
      markdocSchema: validation.markdoc.schema,
      baselinePath: resolveBaselinePath(input.configDir),
      apiDescriptionRules: isPlainObject(apiDescriptions?.rules)
        ? apiDescriptions?.rules
        : undefined,
    },
  };
}

// A `.redocly.recheck-baseline.yaml` next to redocly.yaml is picked up by
// presence.
function resolveBaselinePath(configDir: string): string | undefined {
  const defaultPath = path.resolve(configDir, DEFAULT_BASELINE_FILE);
  return existsSync(defaultPath) ? defaultPath : undefined;
}
