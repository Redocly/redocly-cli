import { Arguments } from 'yargs';

export function getCommandNameFromArgs(argv: Arguments | undefined): string | number {
  if (!argv || !argv._ || !argv._.length) {
    return '';
  }

  return argv._[0];
}
