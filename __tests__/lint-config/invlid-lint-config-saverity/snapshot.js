// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E lint-config test with option: { dirName: 'invlid-lint-config-saverity', option: 'something' } 1`] = `

index.ts lint [entrypoints...]

Lint definition.

Positionals:
  entrypoints                                              [array] [default: []]

Options:
  --version               Show version number.                         [boolean]
  --help                  Show help.                                   [boolean]
  --format                Use a specific output format.
          [choices: "stylish", "codeframe", "json", "checkstyle", "codeclimate"]
                                                          [default: "codeframe"]
  --max-problems          Reduce output to max N problems.
                                                         [number] [default: 100]
  --generate-ignore-file  Generate ignore file.                        [boolean]
  --skip-rule             Ignore certain rules.                          [array]
  --skip-preprocessor     Ignore certain preprocessors.                  [array]
  --lint-config           Apply severity for linting config file.
                             [choices: "warn", "error", "off"] [default: "warn"]
  --config                Specify path to the config file.              [string]
  --extends               Override extends configurations (defaults or config
                          file settings).                                [array]

Invalid values:
  Argument: lint-config, Given: "something", Choices: "warn", "error", "off"

`;
