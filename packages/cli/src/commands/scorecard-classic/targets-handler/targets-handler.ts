import { type ScorecardConfig } from '@redocly/config';
import {
  type Config,
  type RawUniversalConfig,
  type Plugin,
  createConfig,
  logger,
  regexFromString,
} from '@redocly/openapi-core';

export async function resolveConfigForTarget(
  apiPath: string,
  targetRules: Record<string, unknown> | undefined,
  scorecardLevels: ScorecardConfig['levels'] = [],
  plugins: Array<string | Plugin> = [],
  configPath: string
): Promise<Record<string, Config>> {
  const result: Record<string, Config> = {};

  for (const level of scorecardLevels) {
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
    const matches = Object.entries(target.where?.metadata || {}).every(
      ([key, value]: [string, string]) => isTargetMatch(key, value, metadata)
    );

    if (matches) {
      return target;
    }
  }

  return undefined;
}

function isTargetMatch(key: string, value: string, metadata: Record<string, unknown>) {
  // support for ISO 8601 date ranges
  if (value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?\/(\d{4}-\d{2}-\d{2})?$/)) {
    if (!metadata[key]) {
      return false;
    }

    const [from, to] = value.split('/');
    const date = new Date(metadata[key] as string);

    return !(date < new Date(from) || (to && date > new Date(to)));
  } else if (value.match(/^\/.*\//)) {
    if (!metadata[key]) {
      return false;
    }

    try {
      const regex = regexFromString(value) as RegExp;
      return regex.test(metadata[key] as string);
    } catch (e) {
      logger.error(`Invalid regex in scorecard target "${key}": ${value}`);
      return false;
    }
  }

  return metadata[key] === value;
}
