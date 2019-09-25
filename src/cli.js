import program from 'commander';
import { validateFromFile } from './validate';

function cli() {
  program
    .command('validate <path>', { isDefault: true })
    .action((path) => {
      const result = validateFromFile(path);
      result.forEach((entry) => process.stdout.write(entry.prettyPrint()));
    });

  if (process.argv.length === 2) process.argv.push('validate');

  program.parse(process.argv);
}

export default cli;
