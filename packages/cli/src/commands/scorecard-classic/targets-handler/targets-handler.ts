import { type ScorecardConfig } from '@redocly/config';
import {
  type Config,
  type RawUniversalConfig,
  type Document,
  createConfig,
  logger,
  mergeExtends,
} from '@redocly/openapi-core';

export async function resolveLevelsConfig(
  levelsConfig: NonNullable<ScorecardConfig['levels']>,
  targets: ScorecardConfig['targets'] = [],
  plugins: string[] = [],
  configPath: string
) {
  const configs: Record<string, Config> = {};
  for (const level of levelsConfig) {
    configs[level.name] = await createConfig(
      {
        ...level,
        plugins,
      } as RawUniversalConfig,
      {
        configPath,
      }
    );

    // console.log(
    //   `Resolved config for level "${level.name}":`,
    //   JSON.stringify(configs[level.name], null, 2)
    // ); // Debug log for resolved config of each level

    // configs[level.name] = mergeExtends([configs[level.name], { plugins }]);
  }
  return configs;
}

export async function resolveTargetsConfig(
  metadata: Record<string, unknown>,
  targets: ScorecardConfig['targets'],
  levelsConfig: NonNullable<ScorecardConfig['levels']>,
  plugins: string[] = [],
  configPath: string
) {
  if (!targets) {
    return [];
  }

  return Promise.all(
    targets
      ?.filter((target) => !!target.rules)
      .map(async (target) => {
        const overriddenLevels = levelsConfig;

        return {
          ...target,
          configs: await resolveLevelsConfig(
            overriddenLevels as NonNullable<ScorecardConfig['levels']>,
            targets,
            plugins,
            configPath
          ),
        };
      }) || []
  );
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
