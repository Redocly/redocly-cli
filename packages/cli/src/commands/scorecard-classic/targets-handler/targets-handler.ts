import { type ScorecardConfig } from '@redocly/config';
import {
  type Config,
  type RawUniversalConfig,
  type Plugin,
  createConfig,
  logger,
} from '@redocly/openapi-core';

export async function resolveConfigForTarget(
  apiPath: string,
  targetRules: Record<string, unknown> | undefined,
  scorecardLevels: ScorecardConfig['levels'],
  plugins: Array<string | Plugin> = [],
  configPath: string
): Promise<Record<string, Config>> {
  const result: Record<string, Config> = {};

  for (const level of scorecardLevels ?? []) {
    const apis = {
      [level.name]: {
        root: apiPath,
        rules: targetRules,
      },
    };
    const config = await createConfig({ apis, ...level, plugins } as RawUniversalConfig, {
      configPath,
    });

    result[level.name] = config.forAlias(level.name);
  }

  return result;
}

export function getTarget<T extends object>(
  targets: Array<{ where: { metadata: Record<string, string> } } & T> | undefined,
  metadata: Record<string, unknown>
) {
  if (!targets) {
    return undefined;
  }

  for (const target of targets) {
    let matches = true;
    for (const [key, value] of Object.entries(target.where?.metadata || {})) {
      // support for ISO 8601 date ranges
      if (String(value).match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?\/(\d{4}-\d{2}-\d{2})?$/)) {
        if (!metadata[key]) {
          matches = false;
          break;
        }

        const [from, to] = value.split('/');
        const date = new Date(metadata[key] as string);

        if (date < new Date(from) || (to && date > new Date(to))) {
          matches = false;
          break;
        }
      } else if (String(value).match(/^\/.*\//)) {
        if (!metadata[key]) {
          matches = false;
          break;
        }

        try {
          const regex = new RegExp(value.slice(1, -1));
          if (!regex.test(metadata[key] as string)) {
            matches = false;
            break;
          }
        } catch (e) {
          logger.error(`Invalid regex in scorecard target "${key}": ${value}`);
          matches = false;
          break;
        }
      } else if (metadata[key] !== value) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return target;
    }
  }

  return undefined;
}

export function getTargetLevel(
  scorecardConfig: ScorecardConfig,
  metadata: Record<string, unknown>
) {
  const target = getTarget(scorecardConfig?.targets, metadata);

  return target?.minimumLevel;
}
