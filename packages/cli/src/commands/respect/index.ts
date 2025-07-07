import { handleRun, maskSecrets, type JsonLogs } from '@redocly/respect-core';
import { HandledError, logger } from '@redocly/openapi-core';
import { type CommandArgs } from '../../wrapper';
import { writeFileSync } from 'node:fs';
import { blue, green } from 'colorette';
import { composeJsonLogsFiles } from './json-logs.js';
import { displayFilesSummaryTable } from './display-files-summary-table.js';

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
  try {
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
      harOutput: argv['har-output'],
      jsonOutput: argv['json-output'],
      clientCert: argv['client-cert'],
      clientKey: argv['client-key'],
      caCert: argv['ca-cert'],
      maxSteps: argv['max-steps'],
      maxFetchTimeout: argv['max-fetch-timeout'],
      executionTimeout: argv['execution-timeout'],
    };

    if (options.skip && options.workflow) {
      throw new Error(`Cannot use both --skip and --workflow flags at the same time.`);
    }

    if (options.harOutput && !options.harOutput.endsWith('.har')) {
      throw new Error('File for HAR logs should be in .har format');
    }

    if (options.jsonOutput && !options.jsonOutput.endsWith('.json')) {
      throw new Error('File for JSON logs should be in .json format');
    }

    if (options.files.length > 1 && options.harOutput) {
      // TODO: implement multiple run files HAR output
      throw new Error(
        'Currently only a single file can be run with --har-output. Please run a single file at a time.'
      );
    }

    const startedAt = performance.now();
    // TODO: continue refactoring
    const runAllFilesResult = await handleRun(options);

    logger.printNewLine();
    displayFilesSummaryTable(runAllFilesResult);
    logger.printNewLine();

    const hasProblems = runAllFilesResult.some((result) => result.hasProblems);
    const hasWarnings = runAllFilesResult.some((result) => result.hasWarnings);

    if (options.jsonOutput) {
      const jsonOutputData = {
        files: composeJsonLogsFiles(runAllFilesResult),
        status: hasProblems ? 'error' : hasWarnings ? 'warn' : 'success',
        totalTime: performance.now() - startedAt,
      } as JsonLogs;

      writeFileSync(options.jsonOutput, JSON.stringify(jsonOutputData, null, 2), 'utf-8');

      logger.output(blue(logger.indent(`JSON logs saved in ${green(options.jsonOutput)}`, 2)));
      logger.printNewLine();
      logger.printNewLine();
    }

    if (options.harOutput) {
      // TODO: implement multiple run files HAR output
      for (const result of runAllFilesResult) {
        const parsedHarLogs = maskSecrets(result.harLogs, result.ctx.secretFields || new Set());
        writeFileSync(options.harOutput, JSON.stringify(parsedHarLogs, null, 2), 'utf-8');
        logger.output(blue(`Har logs saved in ${green(options.harOutput)}`));
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
