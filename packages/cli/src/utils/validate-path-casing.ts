import { checkPathCasing, HandledError, isString } from '@redocly/openapi-core';
import type { Arguments } from 'yargs';

// The options that take a path to read, by command.
// An option that also takes an API alias or a glob, such as `apis`, is checked where it is expanded.
const pathOptionsByCommand: Record<string, string[]> = {
  bundle: ['overlay'],
  split: ['api'],
  push: ['files'],
  respect: ['files'],
  'generate-arazzo': ['descriptionPath'],
  'generate-spec': ['traffic'],
  drift: ['traffic', 'api'],
  proxy: ['api'],
  project: ['body-file'],
};

// Fails for a path that opens on macOS and Windows but not on Linux, where file names are case-sensitive.
export function validatePathCasing(filePath: string): string {
  const casingError = checkPathCasing(filePath, process.cwd());
  if (casingError !== undefined) {
    throw new HandledError(casingError);
  }
  return filePath;
}

export function validatePathOptions(argv: Arguments): void {
  for (const option of pathOptionsByCommand[argv._[0]] ?? []) {
    [argv[option]].flat().filter(isString).forEach(validatePathCasing);
  }
}
