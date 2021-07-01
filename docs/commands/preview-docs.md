# `preview-docs`

Preview the API reference docs on your local machine.

If you have a license key, you will have a preview of the premium Redocly API reference docs. The [`login`](#login) command also generates a preview of the premium Redocly API reference docs.

Otherwise, you'll get a preview of Redoc community edition.


### `preview-docs` usage


```shell
Positionals:
  entrypoint                                                 [string] [required]

Options:
  --version                Show version number.                        [boolean]
  --help                   Show help.                                  [boolean]
  --port, -p               Preview port.                [number] [default: 8080]
  --skip-preprocessor      Ignore certain preprocessors.                 [array]
  --skip-decorator         Ignore certain decorators.                    [array]
  --use-community-edition  Force using Redoc CE for docs preview.      [boolean]
  --force, -f              Produce bundle output even when errors occur.
                                                                       [boolean]
  --config                 Specify path to the config file.             [string]
```


### How to preview the docs on a custom port

By default, without providing a port, the preview starts on port 8080, and can be accessed at http://localhost:8080.

This command starts a preview on port 8888, and you can access the docs at http://localhost:8888 after running it.


```shell
openapi preview-docs -p 8888 openapi/openapi.yaml
```
