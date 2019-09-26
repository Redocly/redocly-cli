import program from 'commander';
import { validateFromFile } from './validate';

function cli() {
  program
    .arguments('<path>')
    .option('-f, --frame', 'Print no codeframes with errors.')
    .option('-c, --custom-ruleset <path>', 'Path to additional custom ruleset')
    .action((path) => {
      process.stdout.write(`Will validate the ${path}\n`);
      const options = {};

      if (program.frame) options.enableCodeframe = program.frame;
      if (program.customRuleset) options.enbaleCustomRuleset = program.customRuleset;

      const result = validateFromFile(path, options);
      process.stdout.write('Following results received:\n');
      if (result.length > 0) {
        process.stdout.write('\n\n');
        result.forEach((entry) => process.stdout.write(entry.prettyPrint()));
      } else {
        process.stdout.write('No errors found. Congrats!');
      }
    });

  if (process.argv.length === 2) process.argv.push('-h');

  program.parse(process.argv);
}

export default cli;
