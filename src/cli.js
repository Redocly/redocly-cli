import program from 'commander';
import path from 'path';

import {
  outputLightBlue,
  outputBgRed,
  outputGrey,
  outputBgYellow,
  outputRed,
  outputBgLightBlue,
  outputYellow,
  outputUnderline,
} from './utils';
import { validateFromFile } from './validate';
import { messageLevels } from './error/default';

const colorizeMessageHeader = (msg, longestPath) => {
  const msgHeader = `${path.relative(process.cwd(), msg.file)}:${msg.location.startLine}:${msg.location.startCol}`;
  switch (msg.severity) {
    case messageLevels.ERROR:
      return outputBgRed(outputBgRed(msgHeader.padEnd(longestPath + 2 - 20)));
    case messageLevels.WARNING:
      return outputBgYellow(outputRed(msgHeader.padEnd(longestPath + 2 - 20)));
    case messageLevels.INFO:
      return outputBgLightBlue(outputRed(msgHeader.padEnd(longestPath + 2 - 20)));
    default:
      return msgHeader;
  }
};

const colorizeRuleName = (error, severity) => {
  switch (severity) {
    case messageLevels.ERROR:
      return outputRed(error);
    case messageLevels.WARNING:
      return outputYellow(error);
    case messageLevels.INFO:
      return outputBgLightBlue(error);
    default:
      return error;
  }
};


const pathImproveReadability = (msgPath) => msgPath.map((el) => (el[0] === '/' ? outputGrey('[\'') + outputLightBlue(el) + outputGrey('\']') : outputGrey(el)));
const prettifyPathStackRow = (row) => `${outputLightBlue(`${row.file}:${row.startLine}`)} ${outputGrey(`#/${pathImproveReadability(row.path).join(outputGrey('/'))}`)}`;

const renderReferencedFrom = (pathStacks) => {
  if (pathStacks.length === 0) return '';
  return `This error is referenced from:\n${pathStacks.map((rows, id) => `${id + 1}) ${prettifyPathStackRow(rows.pop())}`).join('\n')}`;
};

const prettyPrint = (i, error) => {
  const message = `[${i}] ${colorizeMessageHeader(error)} ${outputGrey(`at #/${pathImproveReadability(error.path).join(outputGrey('/'))}`)}`
  + `\n${error.message}\n`
  + `${error.possibleAlternate ? `\nDid you mean: ${outputLightBlue(error.possibleAlternate)} ?\n` : ''}`
  + `${error.enableCodeframe ? `\n${error.codeFrame}\n\n` : ''}`
  + `${renderReferencedFrom(error.pathStacks)}`
  + '\n\n';
  return message;
};

const prettyPrintShort = (i, error, longestPath, longestRuleName) => {
  const message = `${(`${error.location.startLine}:${error.location.startCol}`).padEnd(longestPath)} ${colorizeRuleName(error.fromRule.padEnd(longestRuleName + 2), error.severity)} ${error.message}\n`;
  return message;
};

const errorBelongsToGroup = (error, group) => error.message === group.message
    && error.path.join('/') === group.path.join('/')
    && error.severity === group.severity
    && error.location.startIndex === group.location.startIndex
    && error.location.endIndex === group.location.endIndex
    && error.location.possibleAlternate === group.location.possibleAlternate;

const errorAlreadyInGroup = (error, group) => group
  .pathStacks
  .filter(
    (stack) => JSON.stringify(stack) === JSON.stringify(error.pathStack),
  ).length > 0;

const groupFromError = (error) => ({
  message: error.message,
  location: error.location,
  path: error.path,
  codeFrame: error.codeFrame,
  value: error.value,
  file: error.file,
  severity: error.severity,
  enableCodeframe: error.enableCodeframe,
  target: error.target,
  possibleAlternate: error.possibleAlternate,
  fromRule: error.fromRule,
  pathStacks: error.pathStack.length !== 0 ? [error.pathStack] : [],
});

const addErrorToGroup = (error, group) => {
  if (error.pathStack.length !== 0 && !errorAlreadyInGroup(error, group)) {
    group.pathStacks.push(error.pathStack);
  }
  return true;
};


const groupErrors = (errors) => {
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
};

const groupByFiles = (result) => {
  const fileGroups = {};
  result.forEach((row) => {
    if (fileGroups[row.file]) {
      fileGroups[row.file].push(row);
    } else {
      fileGroups[row.file] = [row];
    }
  });
  return fileGroups;
};

const cli = () => {
  program
    .command('validate <filePath>')
    .description('Validate given Open API 3 definition file.')
    .option('-s, --short', 'Reduce output to required minimun')
    .option('-f, --no-frame', 'Print no codeframes with errors.')
    .option('--config <path>', 'Specify custom yaml or json config')
    .action((filePath, cmdObj) => {
      const options = {};

      options.enableCodeframe = cmdObj.frame;
      if (cmdObj.config) options.configPath = cmdObj.config;

      const result = validateFromFile(filePath, options);

      const errorsGrouped = groupErrors(result);
      const groupedByFile = groupByFiles(errorsGrouped);

      const totalErrors = errorsGrouped.filter(
        (msg) => msg.severity === messageLevels.ERROR,
      ).length;
      const totalWarnings = errorsGrouped.filter(
        (msg) => msg.severity === messageLevels.WARNING,
      ).length;

      if (cmdObj.short && errorsGrouped.length !== 0) {
        const posLength = errorsGrouped
          .map((msg) => `${msg.location.startLine}:${msg.location.startCol}`)
          .sort((e, o) => e.length > o.length)
          .pop()
          .length;

        const longestRuleName = errorsGrouped
          .map((msg) => msg.fromRule)
          .sort((e, o) => e.length > o.length)
          .pop()
          .length;

        Object.keys(groupedByFile).forEach((fileName) => {
          process.stdout.write(`${outputUnderline(`${path.relative(process.cwd(), fileName)}:\n`)}`);
          groupedByFile[fileName]
            .sort((a, b) => a.severity < b.severity)
            .forEach(
              (entry, id) => process.stdout.write(
                prettyPrintShort(id + 1, entry, posLength, longestRuleName),
              ),
            );
          process.stdout.write('\n');
        });
      } else {
        process.stdout.write('\n\n');
        errorsGrouped
          .sort((a, b) => a.severity < b.severity)
          .forEach((entry, id) => process.stdout.write(prettyPrint(id + 1, entry)));
      }

      process.stdout.write(`Total: errors: ${totalErrors}, warnings: ${totalWarnings}\n`);
      process.exit(totalErrors ? -1 : 0);
    });

  if (process.argv.length === 2) process.argv.push('-h');

  program.parse(process.argv);
};

export default cli;
