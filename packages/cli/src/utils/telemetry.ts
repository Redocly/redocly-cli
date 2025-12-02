import * as os from 'node:os';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { isAbsoluteUrl, isPlainObject } from '@redocly/openapi-core';
import { version } from './package.js';
import { getReuniteUrl } from '../reunite/api/index.js';
import { respondWithinMs } from './network-check.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { ANONYMOUS_ID_CACHE_FILE } from './constants.js';
import { ulid } from 'ulid';

import type { ExitCode } from './miscellaneous.js';
import type { ArazzoDefinition, Config, Exact } from '@redocly/openapi-core';
import type { ExtendedSecurity } from 'respect-core/src/types.js';
import type { Arguments } from 'yargs';
import type { CommandArgv } from '../types.js';
import type { CloudEvents, EventPayload, EventType } from '@redocly/cli-otel';

const SECRET_REPLACEMENT = '***';

export async function sendTelemetry({
  config,
  argv,
  exit_code,
  execution_time,
  spec_version,
  spec_keyword,
  spec_full_version,
  respect_x_security_auth_types,
}: {
  config: Config | undefined;
  argv: Arguments<CommandArgv> | undefined;
  exit_code: ExitCode;
  execution_time: number;
  spec_version: string | undefined;
  spec_keyword: string | undefined;
  spec_full_version: string | undefined;
  respect_x_security_auth_types: string[] | undefined;
}): Promise<void> {
  try {
    if (!argv) {
      return;
    }

    const hasInternet = await respondWithinMs(1000);
    if (!hasInternet) {
      return;
    }

    const {
      _: [command],
      $0: _,
      ...args
    } = argv as Exact<Arguments<CommandArgv>>;
    const { RedoclyOAuthClient } = await import('../auth/oauth-client.js');
    const oauthClient = new RedoclyOAuthClient();
    const reuniteUrl = getReuniteUrl(config, args.residency);
    const logged_in = await oauthClient.isAuthorized(reuniteUrl);
    let anonymous_id = getCachedAnonymousId();
    if (!anonymous_id) {
      anonymous_id = `ann_${ulid()}`;
      cacheAnonymousId(anonymous_id);
    }

    const eventData: EventPayload<EventType> = {
      id: 'cli-command-run',
      object: 'command',
      logged_in: logged_in ? 'yes' : 'no',
      command: `${command}`,
      ...cleanArgs(args, process.argv.slice(2)),
      node_version: process.version,
      npm_version: execSync('npm -v').toString().replace('\n', ''),
      version,
      exit_code,
      execution_time,
      metadata: process.env.REDOCLY_CLI_TELEMETRY_METADATA,
      environment_ci: process.env.CI,
      has_config: typeof config?.document?.parsed === 'undefined' ? 'no' : 'yes',
      spec_version,
      spec_keyword,
      spec_full_version,
      respect_x_security_auth_types:
        spec_version === 'arazzo1' && respect_x_security_auth_types?.length
          ? JSON.stringify(respect_x_security_auth_types)
          : undefined,
    };

    const cloudEvent: CloudEvents.CommandRanMessage = {
      id: `evt_${ulid()}`,
      time: new Date().toISOString(),
      type: 'command.ran',
      object: 'event',
      specversion: '1.0',
      datacontenttype: 'application/json',
      source: 'com.redocly.cli',
      origin: 'ui',
      productType: 'redocly-cli',
      os_platform: os.platform(),
      subjects: [
        {
          id: ulid(),
          object: 'command.ran',
          uri: '',
        },
      ],
      environment: process.env.REDOCLY_ENVIRONMENT,
      sourceDetails: {
        id: anonymous_id,
        object: 'user',
        uri: '',
      },
      data: eventData,
    };

    const { otelTelemetry } = await import('./otel.js');
    otelTelemetry.send(cloudEvent);
  } catch (err) {
    // Do nothing.
  }
}

export function collectXSecurityAuthTypes(
  document: Partial<ArazzoDefinition>,
  respectXSecurityAuthTypesAndSchemeName: string[]
) {
  for (const workflow of document.workflows ?? []) {
    // Collect auth types from workflow-level x-security
    for (const security of workflow['x-security'] ?? []) {
      const scheme = (security as ExtendedSecurity).scheme;
      if (scheme?.type) {
        const authType = scheme.type === 'http' ? scheme.scheme : scheme.type;
        if (authType && !respectXSecurityAuthTypesAndSchemeName.includes(authType)) {
          respectXSecurityAuthTypesAndSchemeName.push(authType);
        }
      }
    }

    // Collect auth types from step-level x-security
    for (const step of workflow.steps ?? []) {
      for (const security of step['x-security'] ?? []) {
        // Handle scheme case
        const scheme = (security as ExtendedSecurity).scheme;
        if (scheme?.type) {
          const authType = scheme.type === 'http' ? scheme.scheme : scheme.type;
          if (authType && !respectXSecurityAuthTypesAndSchemeName.includes(authType)) {
            respectXSecurityAuthTypesAndSchemeName.push(authType);
          }
        }

        // Handle schemeName case
        const schemeName = (security as ExtendedSecurity).schemeName;
        if (schemeName && !respectXSecurityAuthTypesAndSchemeName.includes(schemeName)) {
          respectXSecurityAuthTypesAndSchemeName.push(schemeName);
        }
      }
    }
  }
}

function isFile(value: string) {
  return fs.existsSync(value) && fs.statSync(value).isFile();
}

function isDirectory(value: string) {
  return fs.existsSync(value) && fs.statSync(value).isDirectory();
}

function cleanString(value: string): string {
  if (!value) {
    return value;
  }
  if (isAbsoluteUrl(value)) {
    return value.split('://')[0] + '://url';
  }
  if (isFile(value)) {
    return value.replace(/.+\.([^.]+)$/, (_, ext) => 'file-' + ext);
  }
  if (isDirectory(value)) {
    return 'folder';
  }

  return value;
}

function replaceArgs(
  commandInput: string,
  targets: string | string[],
  replacement: string
): string {
  const targetValues = Array.isArray(targets) ? targets : [targets];
  for (const target of targetValues) {
    commandInput = commandInput.replaceAll(target, replacement);
  }
  return commandInput;
}

function cleanObject<T extends string | string[] | object>(obj: T, keysToClean: string[]): T {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (keysToClean.includes(key)) {
      cleaned[key] = SECRET_REPLACEMENT;
    } else if (isPlainObject(value)) {
      cleaned[key] = cleanObject(value, keysToClean);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as T;
}

function collectSensitiveValues(
  obj: unknown,
  keysToClean: string[],
  values: string[] = []
): string[] {
  if (typeof obj !== 'object' || obj === null) {
    return values;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item) => collectSensitiveValues(item, keysToClean, values));
    return values;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (keysToClean.includes(key) && typeof value === 'string') {
      values.push(value);
    } else if (typeof value === 'object' && value !== null) {
      collectSensitiveValues(value, keysToClean, values);
    }
  }
  return values;
}

export function cleanArgs(parsedArgs: CommandArgv, rawArgv: string[]) {
  const KEYS_TO_CLEAN = ['organization', 'o', 'input', 'i', 'clientCert', 'clientKey', 'caCert'];
  let commandInput = rawArgv.join(' ');
  const commandArguments: Record<string, string | string[] | object> = {};

  for (const [key, value] of Object.entries(parsedArgs)) {
    if (KEYS_TO_CLEAN.includes(key)) {
      commandArguments[key] = SECRET_REPLACEMENT;
      commandInput = replaceArgs(commandInput, value, SECRET_REPLACEMENT);
    } else if (typeof value === 'string') {
      const cleanedValue = cleanString(value);
      commandArguments[key] = cleanedValue;
      commandInput = replaceArgs(commandInput, value, cleanedValue);
    } else if (Array.isArray(value)) {
      commandArguments[key] = value.map(cleanString);
      for (const replacedValue of value) {
        const newValue = cleanString(replacedValue);
        if (commandInput.includes(replacedValue)) {
          commandInput = commandInput.replaceAll(replacedValue, newValue);
        }
      }
    } else if (isPlainObject(value)) {
      const sensitiveValues = collectSensitiveValues(value, KEYS_TO_CLEAN);
      for (const sensitiveValue of sensitiveValues) {
        commandInput = replaceArgs(commandInput, sensitiveValue, SECRET_REPLACEMENT);
      }
      commandArguments[key] = cleanObject(value, KEYS_TO_CLEAN);
    } else {
      commandArguments[key] = value;
    }
  }

  return { arguments: JSON.stringify(commandArguments), raw_input: commandInput };
}

export const cacheAnonymousId = (anonymousId: string): void => {
  const isCI = !!process.env.CI;
  if (isCI || !anonymousId) {
    return;
  }

  try {
    const anonymousIdFile = join(tmpdir(), ANONYMOUS_ID_CACHE_FILE);
    writeFileSync(anonymousIdFile, anonymousId);
  } catch (e) {
    // Do nothing
  }
};

export const getCachedAnonymousId = (): string | undefined => {
  const isCI = !!process.env.CI;
  if (isCI) {
    return;
  }

  try {
    const anonymousIdFile = join(tmpdir(), ANONYMOUS_ID_CACHE_FILE);

    if (!existsSync(anonymousIdFile)) {
      return;
    }

    return readFileSync(anonymousIdFile).toString().trim();
  } catch (e) {
    return;
  }
};
