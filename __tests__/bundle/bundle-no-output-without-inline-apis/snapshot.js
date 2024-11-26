// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`E2E bundle bundle should NOT be invoked IF no positional apis provided AND --output specified 1`] = `

index.ts bundle [apis...]

Bundle a multi-file API description to a single file.

Positionals:
  apis                                                     [array] [default: []]

Options:
      --version                   Show version number.                 [boolean]
      --help                      Show help.                           [boolean]
  -o, --output                    Output file or folder for inline APIs.[string]
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

At least one inline API must be specified when using --output.

`;
