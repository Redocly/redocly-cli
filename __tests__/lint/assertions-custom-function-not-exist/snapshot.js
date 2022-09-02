// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint assertions-custom-function-not-exist 1`] = `


/Users/ivanosypov.redocly/Projects/redocly-cli/packages/core/lib/config/config-resolvers.js:262
                    throw Error(\`Plugin \${logger_1.colorize.red(pluginId)} doesn't export assertions function with name \${logger_1.colorize.red(fn)}.\`);
                          ^
Error: Plugin local doesn't export assertions function with name checkLength2.
    at groupStyleguideAssertionRules (/Users/ivanosypov.redocly/Projects/redocly-cli/packages/core/lib/config/config-resolvers.js:262:27)
    at /Users/ivanosypov.redocly/Projects/redocly-cli/packages/core/lib/config/config-resolvers.js:202:118
    at Generator.next (<anonymous>)
    at fulfilled (/Users/ivanosypov.redocly/Projects/redocly-cli/packages/core/lib/config/config-resolvers.js:5:58)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)

`;
