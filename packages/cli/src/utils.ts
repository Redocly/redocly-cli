import { performance } from "perf_hooks";
import * as colors from 'colorette';
import { Config, NormalizedProblem } from '@redocly/core';
import { dirname, resolve } from 'path';
import * as glob from 'glob-promise';
import { Totals } from './types';

export async function getFallbackEntryPointsOrExit(argsEntrypoints: string[] | undefined, config: Config) {
  const { apiDefinitions } = config;
  const shouldFallbackToAllDefinitions = !isNotEmptyArray(argsEntrypoints) && apiDefinitions && Object.keys(apiDefinitions).length > 0;
  const res = shouldFallbackToAllDefinitions
    ? Object.values(apiDefinitions).map((fileName) => resolve(getConfigDirectory(config), fileName))
    : await expandGlobsInEntrypoints(argsEntrypoints!, config);

  if (!isNotEmptyArray(res)) {
    process.stderr.write('error: missing required argument `entrypoints`.\n');
    process.exit(1);
  }
  return res;
}

function getConfigDirectory(config: Config) {
  return config.configFile ? dirname(config.configFile) : process.cwd();
}

function isNotEmptyArray(args?: string[]): boolean {
  return Array.isArray(args) && !!args.length;
}
function getAliasOrPath(config: Config, aliasOrPath: string) {
  return config.apiDefinitions[aliasOrPath] || aliasOrPath;
}

async function expandGlobsInEntrypoints(args: string[], config: Config) {
  return (await Promise.all((args as string[]).map(async aliasOrPath => {
    return glob.hasMagic(aliasOrPath)
      ? (await glob(aliasOrPath)).map((g: string) => getAliasOrPath(config, g))
      : getAliasOrPath(config, aliasOrPath);
  }))).flat();
}

export function getTotals(problems: (NormalizedProblem & { ignored?: boolean })[]): Totals {
  let errors = 0;
  let warnings = 0;
  let ignored = 0;

  for (const m of problems) {
    if (m.ignored) {
      ignored++;
      continue;
    }
    if (m.severity === 'error') errors++;
    if (m.severity === 'warn') warnings++;
  }

  return {
    errors,
    warnings,
    ignored,
  };
}

export function getExecutionTime(startedAt: number) {
  return process.env.NODE_ENV === 'test'
    ? '<test>ms'
    : `${Math.ceil(performance.now() - startedAt)}ms`;
}

export function printExecutionTime(commandName: string, startedAt: number, entrypoint: string) {
  const elapsed = getExecutionTime(startedAt);
  process.stderr.write(colors.gray(`\n${entrypoint}: ${commandName} processed in ${elapsed}\n\n`));
}
