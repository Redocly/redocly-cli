# `build-docs`

## Introduction

The `build-docs` command builds Redoc into an HTML file that contains your API documentation.
The standalone HTML file can be easily shared or hosted on a platform of your choice.

{% admonition type="warning" name="OpenAPI only" %}
The `build-docs` command currently supports only Swagger 2.0 and OpenAPI 3.0/3.1 descriptions.
Support for OpenAPI 3.2 is coming soon.
{% /admonition %}

## Usage

```bash
redocly build-docs <api>
redocly build-docs <api> --output=custom.html
redocly build-docs <api> --theme.openapi.disableSearch
redocly build-docs <api> --template custom.hbs
redocly build-docs <api> -t custom.hbs --templateOptions.metaDescription "Page meta description"
```

## Options

| Option              | Type    | Description                                                                                                                                                                                                                        |
| ------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api                 | string  | Path to the API description filename or alias that you want to generate the build for. Refer to [the API section](#specify-api) for more details.                                                                                  |
| --config            | string  | Path to the [configuration file](#use-an-alternative-configuration-file). Defaults to `redocly.yaml` in the local folder.                                                                                                          |
| --disableGoogleFont | boolean | Disable Google fonts. The default value is `false`.                                                                                                                                                                                |
| --help              | boolean | Show help.                                                                                                                                                                                                                         |
| --lint-config       | string  | Specify the severity level for the configuration file. Possible values: `warn`, `error`, `off`. Default value is `warn`.                                                                                                           |
| --output, -o        | string  | Set the path and name of the output file. The default value is `redoc-static.html`.                                                                                                                                                |
| --template, -t      | string  | Use custom [Handlebars](https://handlebarsjs.com/) templates to render your OpenAPI description.                                                                                                                                   |
| --templateOptions   | string  | Add template options you want to pass to your custom Handlebars template. To add options, use dot notation.                                                                                                                        |
| --theme.openapi     | string  | Customize your output with [Redoc functionality options](https://redocly.com/docs/api-reference-docs/configuration/functionality/) or [Redoc theming options](https://redocly.com/docs/api-reference-docs/configuration/theming/). |
| --title             | string  | Set the page title.                                                                                                                                                                                                                |
| --version           | boolean | Show version number.                                                                                                                                                                                                               |

## Examples

### Specify API

The `build-docs` command behaves differently depending on how you pass the API to it, and whether the [configuration file](#use-an-alternative-configuration-file) exists.

#### Pass an API directly

```bash
redocly build-docs openapi.yaml
```

In this case, the `build-docs` command builds the API description that was passed to the command.
Even if a configuration file exists, the command does not check for APIs listed in it.

#### Pass an API alias

Instead of a full path, you can use an API name from the `apis` object of your Redocly configuration file.
For example, with a `redocly.yaml` configuration file containing the following entry for `games@v1`:

```yaml Configuration file
apis:
  games@v1:
    root: ./openapi/api-description.json
```

You can generate a build by including the API name with the command, as shown in the following example:

```bash Command
redocly build-docs games@v1
```

In this case, after resolving the path behind the `games@v1` name, `build-docs` generates a build of the `api-description.json` file.
For this approach, the Redocly configuration file is mandatory.
Any additional configurations provided in the file are also used by the command.

### Use an alternative configuration file

By default, the CLI tool looks for the [Redocly configuration file](../configuration/index.md) in the current working directory.
Use the optional `--config` argument to provide an alternative path to a configuration file.

```bash
redocly build-docs --config=./another/directory/config.yaml
```

### Hide search

The following command uses the optional `--theme.openapi` argument to build docs with the search box hidden:

```bash
redocly build-docs openapi.yaml --theme.openapi.disableSearch
```

### Use a custom template

The following command builds docs using a custom Handlebars template and adds metadata to the meta tag in the head of the page using `templateOptions`:

```bash
redocly build-docs ./openapi/api.yaml -t custom.hbs --templateOptions.metaDescription "Page meta description"
```

Sample custom Handlebars template:

```handlebars
<html>
  <head>
    <meta charset='utf8' />
    <title>{{title}}</title>
    <!-- needed for adaptive design -->
    <meta description='{{{templateOptions.metaDescription}}}' />
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <style>
      body { padding: 0; margin: 0; }
    </style>
    {{{redocHead}}}
    {{#unless disableGoogleFont}}<link
        href='https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700'
        rel='stylesheet'
      />{{/unless}}
  </head>
  <body>
    {{{redocHTML}}}
  </body>
</html>
```
