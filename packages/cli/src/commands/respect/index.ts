import { run, maskSecrets, type JsonLogs } from '@redocly/respect-core';
import { HandledError, logger } from '@redocly/openapi-core';
import { type CommandArgs } from '../../wrapper';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, basename } from 'node:path';
import { blue, green } from 'colorette';
import { composeJsonLogsFiles } from './json-logs.js';
import { displayFilesSummaryTable } from './display-files-summary-table.js';
import { readEnvVariables } from '../../utils/read-env-variables.js';
import { resolveMtlsCertificates } from './mtls/resolve-mtls-certificates.js';
import { withMtlsClientIfNeeded } from './mtls/create-mtls-client.js';
import { withHar } from './har-logs/index.js';
import { createHarLog } from './har-logs/har-logs.js';

export type RespectArgv = {
  files: string[];
  input?: string;
  server?: string;
  workflow?: string[];
  skip?: string[];
  verbose?: boolean;
  'har-output'?: string;
  'json-output'?: string;
  'client-cert'?: string;
  'client-key'?: string;
  'ca-cert'?: string;
  'max-steps': number;
  severity?: string;
  config?: string;
  'max-fetch-timeout': number;
  'execution-timeout': number;
};

export async function handleRespect({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<RespectArgv>) {
  let mtlsCerts;
  let harLogs;

  try {
    const workingDir = config.configPath ? dirname(config.configPath) : process.cwd();

    if (argv['client-cert'] || argv['client-key'] || argv['ca-cert']) {
      mtlsCerts =
        argv['client-cert'] || argv['client-key'] || argv['ca-cert']
          ? resolveMtlsCertificates(
              {
                clientCert: argv['client-cert'],
                clientKey: argv['client-key'],
                caCert: argv['ca-cert'],
              },
              workingDir
            )
          : undefined;
    }

    let customFetch = withMtlsClientIfNeeded(mtlsCerts);
    if (argv['har-output']) {
      harLogs = createHarLog({ version });
      customFetch = withHar(customFetch, { har: harLogs });
    }

    const options = {
      files: argv.files,
      input: argv.input,
      server: argv.server,
      workflow: argv.workflow,
      skip: argv.skip,
      verbose: argv.verbose,
      config,
      version,
      collectSpecData,
      severity: argv.severity,
      maxSteps: argv['max-steps'],
      maxFetchTimeout: argv['max-fetch-timeout'],
      executionTimeout: argv['execution-timeout'],
      requestFileLoader: {
        getFileBody: async (filePath: string) => {
          if (!existsSync(filePath)) {
            throw new Error(`File ${filePath} doesn't exist or isn't readable.`);
          }

          const buffer = readFileSync(filePath);
          return new File([buffer], basename(filePath));
        },
      },
      envVariables: readEnvVariables(workingDir) || {},
      logger,
      fetch: customFetch as unknown as typeof fetch,
    };

    if (options.skip && options.workflow) {
      throw new Error(`Cannot use both --skip and --workflow flags at the same time.`);
    }

    if (argv['har-output'] && !argv['har-output'].endsWith('.har')) {
      throw new Error('File for HAR logs should be in .har format');
    }

    if (argv['json-output'] && !argv['json-output'].endsWith('.json')) {
      throw new Error('File for JSON logs should be in .json format');
    }

    if (options.files.length > 1 && argv['har-output']) {
      // TODO: implement multiple run files HAR output
      throw new Error(
        'Currently only a single file can be run with --har-output. Please run a single file at a time.'
      );
    }

    const startedAt = performance.now();
    // TODO: continue refactoring
    const runAllFilesResult = await run(options);

    logger.printNewLine();
    displayFilesSummaryTable(runAllFilesResult, logger);
    logger.printNewLine();

    const hasProblems = runAllFilesResult.some((result) => result.hasProblems);
    const hasWarnings = runAllFilesResult.some((result) => result.hasWarnings);

    if (argv['json-output']) {
      const jsonOutputData = {
        files: composeJsonLogsFiles(runAllFilesResult),
        status: hasProblems ? 'error' : hasWarnings ? 'warn' : 'success',
        totalTime: performance.now() - startedAt,
      } as JsonLogs;

      writeFileSync(argv['json-output'], JSON.stringify(jsonOutputData, null, 2), 'utf-8');

      logger.output(blue(logger.indent(`JSON logs saved in ${green(argv['json-output'])}`, 2)));
      logger.printNewLine();
      logger.printNewLine();
    }

    if (argv['har-output']) {
      // TODO: implement multiple run files HAR output
      for (const result of runAllFilesResult) {
        const parsedHarLogs = maskSecrets(harLogs, result.ctx.secretFields || new Set());
        writeFileSync(argv['har-output'], JSON.stringify(parsedHarLogs, null, 2), 'utf-8');
        logger.output(blue(`Har logs saved in ${green(argv['har-output'])}`));
        logger.printNewLine();
        logger.printNewLine();
      }
    }

    if (hasProblems) {
      throw new Error(' Tests exited with error ');
    }
  } catch (error) {
    throw new HandledError((error as Error)?.message ?? error);
  }
}
