import { existsSync } from 'node:fs';
import * as path from 'node:path';

import type { MarkdocSchema } from '../parser/markdoc/schema.js';
import type { NormalizedRule, ValidationError } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { validate } from './validate.js';

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
  // The `recheck` block of redocly.yaml with its presets merged in, as parsed.
  block?: unknown;
  configDir: string;
  warn?: (message: string) => void;
}

export type ResolveResult =
  | { success: true; config: ResolvedRecheckConfig; errors: [] }
  | { success: false; errors: ValidationError[] };

export const DEFAULT_BASELINE_FILE = '.redocly.recheck-baseline.yaml';

const SEVERITIES = new Set(['off', 'info', 'warn', 'error']);

// The block nests rules under `rules`; the engine's own config shape keeps
// rule entries at the top level beside `excludes` and `markdoc`.
function toEngineConfig(block: Record<string, unknown>): Record<string, unknown> {
  const { rules, apiDescriptions: _apiDescriptions, ...rest } = block;
  const engineConfig: Record<string, unknown> = { ...rest };
  if (isPlainObject(rules)) {
    for (const [name, entry] of Object.entries(rules)) {
      engineConfig[name] =
        typeof entry === 'string' && SEVERITIES.has(entry) ? { severity: entry } : entry;
    }
  }
  return engineConfig;
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
  // Validation fills schema defaults in place; the clone keeps the shared
  // preset entries untouched.
  const validation = await validate(toEngineConfig(structuredClone(block)), {
    configDir: input.configDir,
    warn: input.warn,
  });
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
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
