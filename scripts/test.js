const fs = require('fs');
const slackifyMarkdown = require('slackify-markdown');

const generatedLogsCore = fs.readFileSync('./packages/core/CHANGELOG.md').toString();
const [, logCore] = generatedLogsCore.split('\n## ', 2);


fs.mkdirSync('./output', { recursive: true });
fs.writeFileSync(
  './output/release-message.txt',
  JSON.stringify(slackifyMarkdown(
    `:bookmark: New @redocly/cli release ${logCore}\n\n:bookmark: New @redocly/openapi-core release ${logCore}\n\n`

  ))
);
