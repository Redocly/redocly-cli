
index.ts lint [apis...]

Lint an API or Arazzo description.

Positionals:
  apis                                                     [array] [default: []]

Options:
  --version               Show version number.                         [boolean]
  --help                  Show help.                                   [boolean]
  --format                Use a specific output format.
          [choices: "stylish", "codeframe", "json", "checkstyle", "codeclimate",
                 "summary", "markdown", "github-actions"] [default: "codeframe"]
  --max-problems          Reduce output to a maximum of N problems.
                                                         [number] [default: 100]
  --generate-ignore-file  Generate an ignore file.                     [boolean]
  --skip-rule             Ignore certain rules.                          [array]
  --skip-preprocessor     Ignore certain preprocessors.                  [array]
  --lint-config           Severity level for config file linting.
                             [choices: "warn", "error", "off"] [default: "warn"]
  --config                Path to the config file.                      [string]
  --extends               Override extends configurations (defaults or config
                          file settings).                                [array]

Invalid values:
  Argument: lint-config, Given: "something", Choices: "warn", "error", "off"
