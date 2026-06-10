#!/usr/bin/env node

const shouldSkip =
  process.env.CI ||
  process.env.REDOCLY_CLI_SKIP_POSTINSTALL ||
  ['silent', 'error'].includes(process.env.npm_config_loglevel || '');

if (!shouldSkip) {
  console.error(
    'Redocly CLI tip: enable shell autocompletion with `redocly completion`.\n' +
      'Learn more: https://redocly.com/docs/cli/commands/completion/'
  );
}
