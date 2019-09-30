import program from 'commander';
import { validateFromFile } from './validate';
import { messageLevels } from './error/default';

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

      const totalErrors = result.filter((msg) => msg.severity === messageLevels.ERROR);
      const totalWarnings = result.filter((msg) => msg.severity === messageLevels.INFO);

      process.stdout.write('\n\n');

      result.forEach((entry) => process.stdout.write(entry.prettyPrint()));

      process.stdout.write(`Errors: ${totalErrors}, warnings: ${totalWarnings}\n`);

      process.exit(totalErrors ? -1 : 0);
    });

  if (process.argv.length === 2) process.argv.push('-h');

  program.parse(process.argv);
}

export default cli;
