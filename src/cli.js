import program from 'commander';
import {
  outputLightBlue, outputBgRed, outputGrey, outputBgYellow, outputRed, outputBgLightBlue,
} from './utils';
import { validateFromFile } from './validate';
import { messageLevels } from './error/default';

const colorizeMessageHeader = (msg) => {
  const msgHeader = `${msg.file}:${msg.location.startLine}:${msg.location.startCol}`;
  switch (msg.severity) {
    case messageLevels.ERROR:
      return outputBgRed(msgHeader);
    case messageLevels.WARNING:
      return outputRed(outputBgYellow(msgHeader));
    case messageLevels.INFO:
      return outputBgLightBlue(msgHeader);
    default:
      return msgHeader;
  }
};

const pathImproveReadability = (path) => path.map((el) => (el[0] === '/' ? outputGrey('[\'') + outputLightBlue(el) + outputGrey('\']') : outputGrey(el)));
const prettifyPathStackRow = (row) => `${outputLightBlue(`${row.file}:${row.startLine}`)} ${outputGrey(`#/${pathImproveReadability(row.path).join(outputGrey('/'))}`)}`;

const renderReferencedFrom = (pathStacks) => {
  if (pathStacks.length === 0) return '';
  return `This error is referenced from:\n${pathStacks.map((rows, id) => `${id + 1}) ${prettifyPathStackRow(rows.pop())}`).join('\n')}`;
};

const prettyPrint = (error) => {
  const message = `${colorizeMessageHeader(error)} ${outputGrey(`at #/${pathImproveReadability(error.path).join(outputGrey('/'))}`)}`
  + `\n${error.message}\n`
  + `${error.enableCodeframe ? `\n${error.codeFrame}\n` : ''}`
  + `${renderReferencedFrom(error.pathStacks)}`
  + '\n\n';
  return message;
};

function errorBelongsToGroup(error, group) {
  return error.msg === group.msg
    && error.path.join('/') === group.path.join('/')
    && error.severity === group.severity
    && error.location.startIndex === group.location.startIndex
    && error.location.endIndex === group.location.endIndex;
}

function groupFromError(error) {
  return {
    message: error.message,
    location: error.location,
    path: error.path,
    codeFrame: error.codeFrame,
    value: error.value,
    file: error.file,
    severity: error.severity,
    enableCodeframe: error.enableCodeframe,
    target: error.target,
    pathStacks: error.pathStack.length !== 0 ? [error.pathStack] : [],
  };
}

function addErrorToGroup(error, group) {
  if (error.pathStack.length !== 0) group.pathStacks.push(error.pathStack);
  return true;
}


function groupErrors(errors) {
  const groups = [];
  for (let i = 0; i < errors.length; i += 1) {
    let assigned = false;
    for (let j = 0; j < groups.length; j += 1) {
      if (errorBelongsToGroup(errors[i], groups[j])) {
        assigned = addErrorToGroup(errors[i], groups[j]);
        break;
      }
    }
    if (!assigned) groups.push(groupFromError(errors[i]));
  }
  return groups;
}

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

      const errorsGrouped = groupErrors(result);

      const totalErrors = errorsGrouped.filter(
        (msg) => msg.severity === messageLevels.ERROR,
      ).length;
      const totalWarnings = errorsGrouped.filter(
        (msg) => msg.severity === messageLevels.WARNING,
      ).length;
      const totalInfo = errorsGrouped.filter(
        (msg) => msg.severity === messageLevels.INFO,
      ).length;

      process.stdout.write('\n\n');


      errorsGrouped.forEach((entry) => process.stdout.write(prettyPrint(entry)));

      process.stdout.write(`Errors: ${totalErrors}, warnings: ${totalWarnings}, information: ${totalInfo}\n`);
      process.exit(totalErrors ? -1 : 0);
    });

  if (process.argv.length === 2) process.argv.push('-h');

  program.parse(process.argv);
}

export default cli;
