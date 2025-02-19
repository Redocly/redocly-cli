---
slug:
  - /docs/cli/commands/generate-arazzo
  - /docs/respect/commands/generate-arazzo
rbac:
  authenticated: read
---
# `generate-arazzo`

Auto-generate an Arazzo file based on an OpenAPI description file.

If `examples` are provided in the OpenAPI description, they are used as input data for test requests.
If `schema` is provided, the config generates fake data based on the description schema.
By default, data for requests comes from the description at run-time.
To materialize tests with the data, use the `--extended` option.

The `--extended` option also demonstrates how `respect` gets data from an OpenAPI description.


{% admonition type="warning" %}

Given the nature of OpenAPI, the generated Arazzo file is not a complete test file and may not function. Dependencies between endpoints are not resolved.

It acts as a starting point for a test file and needs to be extended to be functional.
{% /admonition %}

## Usage

```sh
npx @redocly/cli generate-arazzo <your-OAS-description-file> [-o | --output-file] [--extended]
```

## Options

{% table %}
* Option {% width="20%" %}
* Type {% width="15%" %}
* Description
---
* -o, --output-file
* string
* Path to the OAS description file. If the file name is not provided, the default name is used - `auto-generate.yaml`. Example: `npx @redocly/cli generate-arazzo OAS-file.yaml -o=example.yaml`
---
* --extended
* boolean
* By default, data for requests comes from the description at runtime. This option generates a test config file with data populated from the description. Example: `npx @redocly/cli generate-arazzo OAS-file.yaml -o=example.yaml --extended`.
---
* --with-expectations
* boolean
* By default, data for requests comes from the description at runtime. This option generates a test config file with data populated from the description with additional expectations. Example: `npx @redocly/cli generate-arazzo OAS-file.yaml -o=example.yaml --with-expectations`.
{% /table %}

<!-- TODO
## Examples

## Resources -->
