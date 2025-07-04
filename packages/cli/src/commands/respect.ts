import { handleRun } from '@redocly/respect-core';
import { type CommandArgs } from '../wrapper';
import { HandledError } from '@redocly/openapi-core';

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
    const harOutputFile = argv['har-output'];
    const jsonOutputFile = argv['json-output'];
    const { skip, workflow } = argv;

    if (skip && workflow) {
      throw new Error(`Cannot use both --skip and --workflow flags at the same time.`);
    }

    if (harOutputFile && !harOutputFile.endsWith('.har')) {
      throw new Error('File for HAR logs should be in .har format');
    }

    if (jsonOutputFile && !jsonOutputFile.endsWith('.json')) {
      throw new Error('File for JSON logs should be in .json format');
    }

    const options = {
      jsonOutputFile,
      harOutputFile,
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

    // TODO: continue refactoring
    await handleRun(options);
  } catch (error) {
    throw new HandledError((error as Error)?.message ?? error);
  }
}
