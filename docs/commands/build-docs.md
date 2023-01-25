# `build-docs`

## Introduction

The `build-docs` command builds Redoc into a zero-dependency HTML file.

## Usage

```bash
redocly build-docs <api>
redocly build-docs <api> --output=custom.html
redocly build-docs <api> --theme.openapi.disableSearch
redocly build-docs <api> --template custom.hbs
redocly build-docs <api> -t custom.hbs --templateOptions.metaDescription "Page meta description"
```


## Options

Option | Type | Description
-- | -- | --
api | string | Path to the API definition filename or alias that you want to generate the build for. Refer to the [API examples](#api-examples) for more information.
--output, -o | string | Sets the path and name of the output file. The default value is `redoc-static.html`.
--title | string | Sets the page title.
--disableGoogleFont | boolean | Disables Google fonts. The default value is `false`.
--cdn | boolean | Uses the CDN pointing to the latest version of Redoc. If not enabled, the Redoc version is selected from Redocly CLI's associated dependency (and to update Redoc requires updating the CLI and building the docs again). The default value is `false`.
--template, -t | string | Uses custom [Handlebars](https://handlebarsjs.com/) templates to render your OpenAPI definition.
--templateOptions | string | Adds template options you want to pass to your custom Handlebars template. To add options, use dot notation.
--theme.openapi | string | Customizes your output using [Redoc functionality options](https://redocly.com/docs/api-reference-docs/configuration/functionality) or [Redoc theming options](https://redocly.com/docs/api-reference-docs/configuration/theming).
--config | string | Specifies path to the [configuration file](#custom-configuration-file).
--help | boolean | Shows help.
--version | boolean | Shows version number.

## Examples

### API examples

The command accepts an API positional argument as either a file (no configuration file is required) or an alias (requires a [configuration file](#custom-configuration-file)).

#### API path to file example

```bash
redocly build-docs openapi.yaml
```

In this case, the `build-docs` command builds the API at the path provided.
The configuration file is ignored.

#### API alias example

Instead of a full path, you can use an API name from the `apis` object of your Redocly configuration file.

```bash Command
redocly build-docs games@v1
```

```yaml Configuration file
apis:
  games@v1:
    root: ./openapi/definition.json
```

The `build-docs` command uses any additional configurations provided in the file.

### Custom configuration file

By default, the CLI tool looks for the [Redocly configuration file](/docs/cli/configuration/index.mdx) in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly build-docs --config=./another/directory/config.yaml
```

### `theme.openapi` example

Build docs with hidden search box:

```bash
redocly build-docs openapi.yaml --theme.openapi.disableSearch
```

### `templateOptions` example

Build docs using a custom Handlebars template and add custom `templateOptions`:

```bash
redocly build-docs ./openapi/api.yaml -t custom.hbs --templateOptions.metaDescription "Page meta description"
```

Sample Handlebars template:

```handlebars
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf8" />
        <title>{{title}}</title>
        <!-- needed for adaptive design -->
        <meta description="{{{templateOptions.metaDescription}}}">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
            padding: 0;
            margin: 0;
            }
        </style>
        {{{redocHead}}}
        {{#unless disableGoogleFont}}<link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">{{/unless}}
    </head>
    <body>
      {{{redocHTML}}}
    </body>
</html>
```
