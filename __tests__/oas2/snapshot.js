// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E oas2 1`] = `

Something went wrong when processing ./openapi.yaml:

  - OAS2 is not supported yet

cli.ts lint [entrypoints...]

Lint definition

Positionals:
  entrypoints                                              [array] [default: []]

Options:
  --help                 Show help                                     [boolean]
  --version              Show version number                           [boolean]
  --format               Reduce output to required minimum.
                        [choices: "stylish", "codeframe"] [default: "codeframe"]
  --max-messages         Reduce output to max N messages.[number] [default: 100]
  --generate-exceptions  Generate exceptions file                      [boolean]
  --skip-rule            ignore certain rules                            [array]
  --skip-transformer     ignore certain transformers                     [array]
  --config               Specify custom config file                     [string]

Error: OAS2 is not supported yet
    at /Users/oles/redocly/openapi-cli/src/validate.ts:47:13
    at Generator.next (<anonymous>)
    at /Users/oles/redocly/openapi-cli/src/validate.ts:8:71
    at new Promise (<anonymous>)
    at __awaiter (/Users/oles/redocly/openapi-cli/src/validate.ts:4:12)
    at validateDocument (/Users/oles/redocly/openapi-cli/src/validate.ts:38:12)
    at Object.<anonymous> (/Users/oles/redocly/openapi-cli/src/validate.ts:32:10)
    at Generator.next (<anonymous>)
    at fulfilled (/Users/oles/redocly/openapi-cli/src/validate.ts:5:58)

`;

exports[`E2E swagger-two 1`] = `

Something went wrong when processing ./openapi.yaml:

  - OAS2 is not supported yet

cli.ts lint [entrypoints...]

Lint definition

Positionals:
  entrypoints                                              [array] [default: []]

Options:
  --help                 Show help                                     [boolean]
  --version              Show version number                           [boolean]
  --format               Reduce output to required minimum.
                        [choices: "stylish", "codeframe"] [default: "codeframe"]
  --max-messages         Reduce output to max N messages.[number] [default: 100]
  --generate-exceptions  Generate exceptions file                      [boolean]
  --skip-rule            ignore certain rules                            [array]
  --skip-transformer     ignore certain transformers                     [array]
  --config               Specify custom config file                     [string]

Error: OAS2 is not supported yet
    at /Users/oles/redocly/openapi-cli/src/validate.ts:47:13
    at Generator.next (<anonymous>)
    at /Users/oles/redocly/openapi-cli/src/validate.ts:8:71
    at new Promise (<anonymous>)
    at __awaiter (/Users/oles/redocly/openapi-cli/src/validate.ts:4:12)
    at validateDocument (/Users/oles/redocly/openapi-cli/src/validate.ts:38:12)
    at Object.<anonymous> (/Users/oles/redocly/openapi-cli/src/validate.ts:32:10)
    at Generator.next (<anonymous>)
    at fulfilled (/Users/oles/redocly/openapi-cli/src/validate.ts:5:58)

`;
