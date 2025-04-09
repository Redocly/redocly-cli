const fs = require('fs');

const generatedLogsCli = fs.readFileSync('./packages/cli/CHANGELOG.md').toString();
const [, logCli] = generatedLogsCli.split('\n## ', 2);

const mainChangelog = fs.readFileSync('./docs/@v1/changelog.md').toString();
const [date] = new Date().toISOString().split('T');
const logWithDate = logCli.replace('\n', ` (${date})\n`);
const modifiedChangelog = mainChangelog.replace(
  '<!-- do-not-remove -->\n',
  '<!-- do-not-remove -->\n\n## ' + logWithDate
);

fs.writeFileSync('./docs/@v1/changelog.md', modifiedChangelog);
