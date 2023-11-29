// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle lint format bundle lint: no format parameter or empty value should be formatted as codeframe 1`] = `

index.ts bundle [apis...]

Bundle definition.

Positionals:
  apis                                                     [array] [default: []]

Options:
      --version                   Show version number.                 [boolean]
      --help                      Show help.                           [boolean]
  -o, --output                                                          [string]
      --ext                       Bundle file extension.
                                                [choices: "json", "yaml", "yml"]
      --skip-preprocessor         Ignore certain preprocessors.          [array]
      --skip-decorator            Ignore certain decorators.             [array]
  -d, --dereferenced              Produce a fully dereferenced bundle. [boolean]
  -f, --force                     Produce bundle output even when errors occur.
                                                                       [boolean]
      --config                    Path to the config file.              [string]
      --metafile                  Produce metadata about the bundle     [string]
      --remove-unused-components  Remove unused components.
                                                      [boolean] [default: false]
  -k, --keep-url-references       Keep absolute url references.        [boolean]
      --lint-config               Severity level for config file linting.
                             [choices: "warn", "error", "off"] [default: "warn"]

Invalid values:
  Argument: format, Given: true, Choices: "stylish", "codeframe", "json", "checkstyle"

`;
