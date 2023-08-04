const fs = require('fs');

const generatedLogs = fs.readFileSync('./packages/cli/CHANGELOG.md').toString();
const [, log] = generatedLogs.split('\n## ', 2);
const mainChangelog = fs.readFileSync('./docs/changelog.md').toString();
const [date] = new Date().toISOString().split('T');
const logWithDate = log.replace('\n', ` (${date})\n`);
const modifiedChangelog = mainChangelog.replace('<!-- do-not-remove -->\n', '<!-- do-not-remove -->\n\n## ' + logWithDate);

fs.writeFileSync('./docs/changelog.md', modifiedChangelog);