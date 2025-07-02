import { handleRun, type RespectOptions } from '@redocly/respect-core';
import { type CommandArgs } from '../wrapper';
import { HandledError } from '@redocly/openapi-core';

export async function handleRespect({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<RespectOptions>) {
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

    // const options = {
    //   jsonOutputFile,
    //   harOutputFile,
    // };

    // console.log('options', options);
    // console.log('argv', argv);

    // TODO: continue refactoring
    await handleRun({ argv, config, version, collectSpecData });
  } catch (error) {
    throw new HandledError((error as Error)?.message ?? error);
  }
}
