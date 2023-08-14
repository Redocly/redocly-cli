const fs = require('fs');
const slackifyMarkdown = require('slackify-markdown');

const generatedLogsCli = fs.readFileSync('./packages/cli/CHANGELOG.md').toString();
const [, logCli] = generatedLogsCli.split('\n## ', 2);
const generatedLogsCore = fs.readFileSync('./packages/core/CHANGELOG.md').toString();
const [, logCore] = generatedLogsCore.split('\n## ', 2);

fs.writeFileSync(
  './output/release-message.txt',
  slackifyMarkdown(
    `:bookmark: New @redocly/cli release ${logCli}\n\n:bookmark: New @redocly/openapi-core release ${logCore}\n\n`
  )
);

const mainChangelog = fs.readFileSync('./docs/changelog.md').toString();
const [date] = new Date().toISOString().split('T');
const logWithDate = logCli.replace('\n', ` (${date})\n`);
const modifiedChangelog = mainChangelog.replace(
  '<!-- do-not-remove -->\n',
  '<!-- do-not-remove -->\n\n## ' + logWithDate
);

fs.writeFileSync('./docs/changelog.md', modifiedChangelog);
