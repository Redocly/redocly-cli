import * as os from 'node:os';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { isAbsoluteUrl } from '@redocly/openapi-core';
import { version } from './package.js';
import { getReuniteUrl } from '../reunite/api/index.js';

import type { ExitCode } from './miscellaneous.js';
import type { ArazzoDefinition } from '@redocly/openapi-core';
import type { ExtendedSecurity } from 'respect-core/src/types.js';
import type { Arguments } from 'yargs';
import type { CommandOptions } from '../types.js';

export type Analytics = {
  event: string;
  event_time: string;
  logged_in: 'yes' | 'no';
  command: string;
  arguments: string;
  node_version: string;
  npm_version: string;
  os_platform: string;
  version: string;
  exit_code: ExitCode;
  environment?: string;
  metadata?: string;
  environment_ci?: string;
  raw_input: string;
  has_config?: 'yes' | 'no';
  spec_version?: string;
  spec_keyword?: string;
  spec_full_version?: string;
  respect_x_security_auth_types?: string;
};

export async function sendTelemetry({
  argv,
  exit_code,
  has_config,
  spec_version,
  spec_keyword,
  spec_full_version,
  respect_x_security_auth_types,
}: {
  argv: Arguments | undefined;
  exit_code: ExitCode;
  has_config: boolean | undefined;
  spec_version: string | undefined;
  spec_keyword: string | undefined;
  spec_full_version: string | undefined;
  respect_x_security_auth_types: string[] | undefined;
}): Promise<void> {
  try {
    if (!argv) {
      return;
    }
    const {
      _: [command],
      $0: _,
      ...args
    } = argv;
    const event_time = new Date().toISOString();
    const { RedoclyOAuthClient } = await import('../auth/oauth-client.js');
    const oauthClient = new RedoclyOAuthClient('redocly-cli', version);
    const reuniteUrl = getReuniteUrl(argv.residency as string | undefined);
    const logged_in = await oauthClient.isAuthorized(reuniteUrl);
    const data: Analytics = {
      event: 'cli_command',
      event_time,
      logged_in: logged_in ? 'yes' : 'no',
      command: `${command}`,
      ...cleanArgs(args, process.argv.slice(2)),
      node_version: process.version,
      npm_version: execSync('npm -v').toString().replace('\n', ''),
      os_platform: os.platform(),
      version,
      exit_code,
      environment: process.env.REDOCLY_ENVIRONMENT,
      metadata: process.env.REDOCLY_CLI_TELEMETRY_METADATA,
      environment_ci: process.env.CI,
      has_config: has_config ? 'yes' : 'no',
      spec_version,
      spec_keyword,
      spec_full_version,
      respect_x_security_auth_types:
        spec_version === 'arazzo1' && respect_x_security_auth_types?.length
          ? JSON.stringify(respect_x_security_auth_types)
          : undefined,
    };

    const { otelTelemetry } = await import('../otel.js');
    otelTelemetry.init();
    otelTelemetry.send(data.command, data);
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

export function cleanArgs(parsedArgs: CommandOptions, rawArgv: string[]) {
  const KEYS_TO_CLEAN = ['organization', 'o', 'input', 'i', 'client-cert', 'client-key', 'ca-cert'];
  let commandInput = rawArgv.join(' ');
  const commandArguments: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(parsedArgs)) {
    if (KEYS_TO_CLEAN.includes(key)) {
      commandArguments[key] = '***';
      commandInput = replaceArgs(commandInput, value, '***');
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
    } else {
      commandArguments[key] = value;
    }
  }

  return { arguments: JSON.stringify(commandArguments), raw_input: commandInput };
}
