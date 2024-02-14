# `join`

## Introduction

{% admonition type="warning" name="Important" %}
The `join` command is considered an experimental feature. This means it's still a work in progress and may go through major changes.

The `join` command supports OpenAPI 3.x descriptions only.
{% /admonition %}

Maintainers of multiple API descriptions can benefit from storing each endpoint as a standalone API description file. However, this approach is not supported by the majority of OpenAPI tools, as they require a single API description file.

With Redocly CLI, you can solve this problem by using the `join` command that can combine two or more API description files into a single one.

To easily distinguish the origin of OpenAPI objects and properties, you can optionally instruct the `join` command to append custom prefixes to them.

The `join` command accepts both YAML and JSON files, which you can mix in the resulting `openapi.yaml` or `openapi.json` file. Setting a custom name and extension for this file can be achieved by providing it through the `--output` argument. Any existing file is overwritten. If the `--output` option is not provided, the command uses the extension of the first entry point file.

Apart from providing individual API description files as the input, you can also specify the path to a folder that contains multiple API description files and match them with a wildcard (for example, `myproject/openapi/*.(yaml/json)`). The `join` command collects all matching files and combines them into one file.

### Usage

```bash
redocly join <api> <api>...
redocly join <api> <api>... -o <outputName>
redocly join <path-to-folder>/<wildcard-pattern> [--lint]
redocly join [--help] [--prefix-components-with-info-prop] [--prefix-tags-with-info-prop] [--prefix-tags-with-filename]

redocly join first-api.yaml second-api.yaml
redocly join first-api.yaml second-api.json
redocly join first-api.yaml second-api.json -o openapi-custom.yaml
redocly join ./*.yaml
redocly join --version
```

## Options

{% admonition type="warning" name="Important" %}
The `--lint` option is deprecated and is marked for removal in future releases.
Use the [lint command](./lint.md) separately to lint your APIs before joining.
{% /admonition %}

| Option                             | Type     | Description                                                                                                                                                                                                |
| ---------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| apis                               | [string] | **REQUIRED.** 1. Array of paths to API description files that you want to join. At least two input files are required.<br />2. A wildcard pattern to match API description files within a specific folder. |
| --config                           | string   | Specify path to the [config file](../configuration/index.md).                                                                                                                                              |
| --decorate                         | boolean  | Run decorators.                                                                                                                                                                                            |
| --help                             | boolean  | Show help.                                                                                                                                                                                                 |
| --lint (**Deprecated**)            | boolean  | Lint API description files.                                                                                                                                                                                |
| --lint-config                      | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                         |
| --output, -o                       | string   | Name for the joined output file. Defaults to `openapi.yaml` or `openapi.json` (Depends on the extension of the first input file). **If the file already exists, it's overwritten.**                        |
| --prefix-components-with-info-prop | string   | Prefix components with property value from info object. See the [prefix-components-with-info-prop section](#prefix-components-with-info-prop) below.                                                       |
| --prefix-tags-with-filename        | string   | Prefix tags with property value from file name. See the [prefix-tags-with-filename section](#prefix-tags-with-filename) below.                                                                             |
| --prefix-tags-with-info-prop       | boolean  | Prefix tags with property value from info object. See the [prefix-tags-with-info-prop](#prefix-tags-with-info-prop) section.                                                                               |
| --preprocess                       | boolean  | Run preprocessors.                                                                                                                                                                                         |
| --version                          | boolean  | Show version number.                                                                                                                                                                                       |
| --without-x-tag-groups             | boolean  | Skip automated `x-tagGroups` creation. See the [without-x-tag-groups](#without-x-tag-groups) section.                                                                                                      |

## Examples

### Array of paths

{% tabs %}
{% tab label="Command" %}

```bash
redocly join first-api.yaml second-api.json
```

{% /tab %}
{% tab label="Output" %}

```bash
redocly join first-api.yaml second-api.json

openapi.yaml: join processed in 56ms
```

{% /tab %}
{% /tabs %}
The command creates the output `openapi.yaml` file in the working directory.

The order of input files affects how their content is processed. The first provided file is always treated as the "main" file, and its content has precedence over other input files when combining them. Specifically, the following properties of the API description are always taken only from the first input file:

```yaml
info:
  version
  title
  termsOfService
  contact
  license
externalDocs
```

By default, the `info.description` property is taken only from the first file, even if it exists in other input files.

However, if any of the input files contain the `tags` object, the `join` command automatically creates the `x-tagGroups` object in the output file.

```yaml
x-tagGroups:
  - name: first-api
    tags:
      - expanded
      - other
  - name: second-api
    tags:
      - partner
```

{% admonition type="info" %}
If some operations in an input file don't have a tag assigned to them, the `join` command automatically adds the `other` tag to those operations in the output file. The `other` tag is also included in the `x-tagGroups` object.

If any of the input files contain the `x-tagGroups` object, the content of this object is ignored by the `join` command and not included in the output file.

The `info.title` field is used as a name in x-tagGroups instead of a file name for the `join` command, so you can join files with the same names. If you need to adjust the `info.title` field, you can also use the [info-override decorator](https://redocly.com/docs/cli/decorators/info-override/).

{% /admonition %}

The `servers` object combines the content from all input files, starting with the content from the first file. Commented lines are not included in the output file.

Path names and component names must be unique in all input files, but their content doesn't have to be unique for the `join` command to produce the output file. For each path item object, only the operation ID must be unique.

If the `join` command detects any conflicting content while trying to combine the input files, it displays informative messages about the conflicts and exits without creating an output file. To prevent this, use optional parameters to add prefixes to tags and components.

```bash
Conflict on tags => all : tickets in files: museum.yaml,exhibition.yaml

1 conflict(s) on tags.
Suggestion: please use prefix-tags-with-filename, prefix-tags-with-info-prop or without-x-tag-groups to prevent naming conflicts.

Conflict on paths => /tickets : get in files: museum.yaml,exhibition.yaml
Conflict on paths => /tickets : post in files: museum.yaml,exhibition.yaml
Conflict on paths => operationIds : listEvents in files: museum.yaml,exhibition.yaml
Conflict on paths => operationIds : createEvent in files: museum.yaml,exhibition.yaml
Conflict on paths => operationIds : getEvent in files: museum.yaml,exhibition.yaml
Conflict on paths => /tickets/{Id} : get in files: museum.yaml,exhibition.yaml

Please fix conflicts before running join.
```

Use the [`--without-x-tag-groups`](#without-x-tag-groups) option to skip the creation and population of `x-tagGroups` in the output file.

{% admonition type="warning" %}
These options are mutually exclusive: `without-x-tag-groups`, `prefix-tags-with-filename`, and `prefix-tags-with-info-prop`.
{% /admonition %}

### prefix-tags-with-info-prop

If any of the input files contain the `tags` object, tags in the output file are prefixed by the selected property from the `info` object of the corresponding input file.

The output file preserves the original tag names as the value of the `x-displayName` property for each tag.

#### Usage

{% tabs %}
{% tab label="Command" %}

```bash
redocly join first-api.yaml second-api.json --prefix-tags-with-info-prop title
```

{% /tab  %}
{% tab label="Output file example" %}

```yaml
- name: First Document title_endpoints
  description: endpoints tag description
  x-displayName: endpoints

- name: Second document title_events
  description: events tag description
  x-displayName: events
```

{% /tab  %}
{% /tabs  %}

### prefix-tags-with-filename

If any of the input files contain the `tags` object, tags in the output file are prefixed by the filename of the corresponding input file.

The output file preserves the original tag names as the value of the `x-displayName` property for each tag.

#### Usage

{% tabs %}
{% tab label="Command" %}

```bash
redocly join first-api.yaml second-api.json --prefix-tags-with-filename true
```

{% /tab  %}
{% tab label="Output file example" %}

```yaml
- name: first-api_endpoints
  description: endpoints tag description
  x-displayName: endpoints

- name: second-api_events
  description: events tag description
  x-displayName: events
```

{% /tab  %}
{% /tabs  %}

### without-x-tag-groups

If you have the same tags in multiple API descriptions, you can allow tag duplication by using the `without-x-tag-groups` option. In this case, the `x-tagGroups` property is not created in the joined file.

#### Usage

```bash Command
redocly join first-api.yaml second-api.json --without-x-tag-groups
```

The tag description is taken from the first file that contains the tag. You may see a warning about conflicts in the command output:

```bash
warning: 1 conflict(s) on tags description.

openapi.yaml: join processed in 69ms
```

### prefix-components-with-info-prop

If any of the input files have conflicting component names, this option can be used to resolve that issue and generate the output file. All component names in the output file are prefixed by the selected property from the `info` object of the corresponding input file(s).

#### Usage

```bash
redocly join museum_v1.yaml museum_v2.json --prefix-components-with-info-prop version
```

{% /tab  %}
{% tab label="Output file example" %}

```yaml
components:
  schemas:
    1.0.0_BuyMuseumTicketsRequest:
      description: Request payload used for purchasing museum tickets.
      type: object
      properties:
        ticketType:
          $ref: '#/components/schemas/1.0.0_TicketType'
        eventId:
          description: >-
            Unique identifier for a special event. Required if purchasing
            tickets for the museum's special events.
          $ref: '#/components/schemas/1.0.0_1.0.0_EventId'
        ticketDate:
          description: Date that the ticket is valid for.
          $ref: '#/components/schemas/1.0.0_1.0.0_Date'
        email:
          $ref: '#/components/schemas/1.0.0_Email'
        phone:
          $ref: '#/components/schemas/1.0.0_Phone'
      required:
        - ticketType
        - ticketDate
        - email
    1.2.0_BuyMuseumTicketsRequest:
      description: Request payload used for purchasing museum tickets.
      type: object
      properties:
        ticketType:
          $ref: '#/components/schemas/1.2.0_TicketType'
        eventId:
          description: >-
            Unique identifier for a special event. Required if purchasing
            tickets for the museum's special events.
          $ref: '#/components/schemas/1.2.0_1.2.0_EventId'
        ticketDate:
          description: Date that the ticket is valid for.
          $ref: '#/components/schemas/1.2.0_1.2.0_Date'
        email:
          $ref: '#/components/schemas/1.2.0_Email'
        phone:
          $ref: '#/components/schemas/1.2.0_Phone'
      required:
        - ticketType
        - ticketDate
        - email

```

{% /tab  %}
{% /tabs  %}

### Custom output file

By default, the CLI tool writes the joined file as `openapi.yaml` or `openapi.json` in the current working directory. Use the optional `--output` argument to provide an alternative output file path.

```bash Command
redocly join --output=openapi-custom.yaml
```
