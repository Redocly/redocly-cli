# `build-docs`

## Introduction

The `build-docs` command builds Redoc into a zero-dependency HTML file.

## Usage

```bash
redocly build-docs <api>
redocly build-docs <api> --output=custom.html
redocly build-docs <api> --features.openapi.theme.colors.primary.main=orange
redocly build-docs <api> -t custom.hbs
redocly build-docs <api> -t custom.hbs --templateOptions.metaDescription "Page meta description"
```


## Options

Option | Type | Description
-- | -- | --
api | string | Path to the API definition filename or alias that you want to generate the build for. Refer to [the api section](#api) for more options.
--output | string | Output file. Default value is `redoc-static.html`.
--title | string | Page title.
--disableGoogleFont | boolean | Disable Google font. Default value is `false`.
--cdn | boolean | Use latest Redoc version. Default value is `false`.
--template | string | Uses custom [Handlebars](https://handlebarsjs.com/) templates to render your OpenAPI definition.
--templateOptions | string | Adds template options you want to pass to your custom Handlebars template. To add options, use dot notation.
--features.openapi | string | Customizes your output using [Redoc functionality options](https://redocly.com/docs/api-reference-docs/configuration/functionality) or [Redoc theming options](https://redocly.com/docs/api-reference-docs/configuration/theming).
--config | string | Specify path to the [configuration file](#custom-configuration-file).
--help | boolean | Show help.
--version | boolean | Show version number.

## Examples

### Api

The command behaves differently depending on how you pass the api to it, and whether the [configuration file](#custom-configuration-file) exists.

#### Pass api directly

```bash
redocly build-docs openapi.yaml
```

In this case, `build-docs` will build the definition that was passed to the command. The configuration file is ignored.

#### Pass api alias

Instead of a full path, you can use an API name from the `apis` section of your Redocly configuration file.

```bash Command
redocly build-docs main
```

```yaml Configuration file
apis:
  main:
    root: ./openapi/definition.json
```

### Custom configuration file

By default, the CLI tool looks for the [Redocly configuration file](/docs/cli/configuration/index.mdx) in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly build-docs --config=./another/directory/config.yaml
```

### Build docs

Build docs with the main color changed to `orange`:

```bash
redocly build-docs openapi.yaml --features.openapi.theme.colors.primary.main=orange
```

Build docs using a custom Handlebars template and add custom `templateOptions`:

```bash
redocly build-docs http://petstore.swagger.io/v2/swagger.json -t custom.hbs --templateOptions.metaDescription "Page meta description"
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