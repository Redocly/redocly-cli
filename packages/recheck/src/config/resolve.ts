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
  // `recheck/*` entries from the root `extends` of redocly.yaml, in order.
  extends?: string[];
  // The `recheck` block of redocly.yaml, as parsed.
  block?: unknown;
  configDir: string;
  warn?: (message: string) => void;
}

export type ResolveResult =
  | { success: true; config: ResolvedRecheckConfig; errors: [] }
  | { success: false; errors: ValidationError[] };

const SEVERITIES = new Set(['off', 'info', 'warn', 'error']);

// The block nests rules under `rules`; the engine's own config shape keeps
// rule entries at the top level beside `excludes`, `baseline`, and `markdoc`.
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

export async function resolveRecheckConfig(input: RecheckBlockInput): Promise<ResolveResult> {
  const block = isPlainObject(input.block) ? input.block : {};
  if ('extends' in block) {
    return {
      success: false,
      errors: [
        {
          message:
            'The recheck block has no `extends`. Name Recheck presets in the root `extends` of redocly.yaml, for example `extends: [recommended, recheck/markdown]`.',
          path: 'recheck.extends',
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
  const validation = await validate(toEngineConfig(block, input.extends), {
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
      baselinePath:
        validation.baselinePath === undefined
          ? undefined
          : path.resolve(input.configDir, validation.baselinePath),
      apiDescriptionRules: isPlainObject(apiDescriptions?.rules)
        ? apiDescriptions?.rules
        : undefined,
    },
  };
}
