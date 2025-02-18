const fs = require('fs');
const slackifyMarkdown = require('slackify-markdown');

const generatedLogsCli = fs.readFileSync('./packages/cli/CHANGELOG.md').toString();
const [, logCli] = generatedLogsCli.split('\n## ', 2);
const generatedLogsCore = fs.readFileSync('./packages/core/CHANGELOG.md').toString();
const [, logCore] = generatedLogsCore.split('\n## ', 2);
const generatedLogsRespectCore = fs.readFileSync('./packages/respect-core/CHANGELOG.md').toString();
const [, logRespectCore] = generatedLogsRespectCore.split('\n## ', 2);

fs.mkdirSync('./output', { recursive: true });
fs.writeFileSync(
  './output/release-message.json',
  JSON.stringify({
    text: slackifyMarkdown(
      `:bookmark: New @redocly/cli release ${logCli}\n\n` +
        `:bookmark: New @redocly/openapi-core release ${logCore}\n\n` +
        `:bookmark: New @redocly/respect-core release ${logRespectCore}\n\n`
    ),
  })
);
