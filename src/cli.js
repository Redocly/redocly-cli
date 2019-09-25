import program from 'commander';
import fs from 'fs';
import { validateFromFile } from './validate';

function cli() {
  // program.version(JSON.parse(fs.readFileSync('package.json')).version);
  program
    .command('validate <path>', { isDefault: true })
    .action((path) => {
      console.log('Will validate');
      const result = validateFromFile(path);
      result.forEach((entry) => console.log(entry.prettyPrint()));
    });

  if (process.argv.length === 2) process.argv.push('validate');

  program.parse(process.argv);
}

export default cli;
