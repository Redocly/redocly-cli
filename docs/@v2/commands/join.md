# `join`

## Introduction

{% admonition type="warning" name="Important" %}
The `join` command is considered an experimental feature.
This means it's still a work in progress and may go through major changes.

The `join` command supports OpenAPI 3.x descriptions only.
{% /admonition %}

Maintainers of multiple API descriptions can benefit from storing each endpoint as a standalone API description file.
However, this approach is not supported by the majority of OpenAPI tools, as they require a single API description file.
With Redocly CLI, you can solve this problem by using the `join` command to combine two or more API description files into a single one.

The `join` command differs from the [`bundle`](./bundle.md) command.
The `bundle` command takes a root OpenAPI file as input and follows the `$ref` mentions to include all the referenced components into a single output file.
The `join` command can combine multiple OpenAPI files into a single unified API description file.
Unlike the `bundle` command, `join` does not execute preprocessors or decorators and combines the API description files as-is without modifying the original source files.

To easily distinguish the origin of OpenAPI objects and properties, you can optionally instruct the `join` command to prepend custom prefixes to them.

The `join` command accepts both YAML and JSON files, which you can mix in the resulting `openapi.yaml` or `openapi.json` file.
Setting a custom name and extension for this file can be achieved by providing it through the `--output` argument.
Any existing file is overwritten.
If the `--output` option is not provided, the command uses the extension of the first entry point file.

Apart from providing individual API description files as the input, you can also specify the path to a folder that contains multiple API description files and match them with a wildcard (for example, `myproject/openapi/*.(yaml/json)`).
The `join` command collects all matching files and combines them into one file.

We recommend running [`lint`](./lint.md) before joining API descriptions to ensure that they are valid and meet the expected standards.
If you need to apply any filtering or transformation using [decorators](./../decorators.md), use the [`bundle`](./bundle.md) command on your API descriptions before or after joining them.

## Usage

```bash
redocly join <api> <api>...
redocly join <api> <api>... -o <outputName>
redocly join [--help] [--prefix-components-with-info-prop] [--prefix-tags-with-info-prop] [--prefix-tags-with-filename]

redocly join first-api.yaml second-api.yaml
redocly join first-api.yaml second-api.json
redocly join first-api.yaml second-api.json -o openapi-custom.yaml
redocly join ./*.yaml
redocly join --version
```

## Options

| Option                             | Type     | Description                                                                                                                                                                                                                                      |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| apis                               | [string] | **REQUIRED.** 1. Array of paths to API description files that you want to join. At least two input files are required.<br />2. A wildcard pattern to match API description files within a specific folder.                                       |
| --config                           | string   | Specify path to the [configuration file](../configuration/index.md).                                                                                                                                                                             |
| --help                             | boolean  | Show help.                                                                                                                                                                                                                                       |
| --lint-config                      | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                               |
| --output, -o                       | string   | Name for the joined output file. Defaults to `openapi.yaml` or `openapi.json` (depends on the extension of the first input file). **If the file already exists, it's overwritten.** See the [specify output file](#specify-output-file) section. |
| --prefix-components-with-info-prop | string   | Prefix components with property value from info object. See the [resolve conflicting component names](#resolve-conflicting-component-names) section.                                                                                             |
| --prefix-tags-with-filename        | boolean  | Prefix tags with property value from file name. See the [prefix tags with filename](#prefix-tags-with-filename) section.                                                                                                                         |
| --prefix-tags-with-info-prop       | string   | Prefix tags with property value from info object. See the [prefix tags with specified info property](#prefix-tags-with-specified-info-property) section.                                                                                         |
| --version                          | boolean  | Show version number.                                                                                                                                                                                                                             |
| --without-x-tag-groups             | boolean  | Skip automated `x-tagGroups` creation. See the [avoid tag duplication](#avoid-tag-duplication) section.                                                                                                                                          |

{% admonition type="warning" %}
These options are mutually exclusive: `without-x-tag-groups`, `prefix-tags-with-filename`, and `prefix-tags-with-info-prop`.
{% /admonition %}

## Examples

### Specify an array of paths

This command combines the API description files that are passed in:

```bash
redocly join first-api.yaml second-api.json
```

The output file `openapi.yaml` is created in the working directory:

The order of input files affects how their content is processed.
The first provided file is always treated as the "main" file, and its content has precedence over other input files when combining them.
Specifically, the following properties of the API description are always taken only from the first input file:

<pre>
info:
  version
  title
  termsOfService
  contact
  license
externalDocs
</pre>

By default, the `info.description` property is taken only from the first file, even if it exists in other input files.

However, if any of the input files contain the `tags` object, the `join` command automatically creates the `x-tagGroups` object in the output file.

<pre>
x-tagGroups:
  - name: first-api
    tags:
      - expanded
      - other
  - name: second-api
    tags:
      - partner
</pre>

Use the [`--without-x-tag-groups`](#avoid-tag-duplication) option to skip the creation and population of `x-tagGroups` in the output file.

{% admonition type="info" %}
If some operations in an input file don't have a tag assigned to them, the `join` command automatically adds the `other` tag to those operations in the output file.
The `other` tag is also included in the `x-tagGroups` object.

If any of the input files contain the `x-tagGroups` object, the content of this object is ignored by the `join` command and not included in the output file.

The `info.title` field is used as a name in `x-tagGroups` instead of a file name for the `join` command, so you can join files with the same names.
If you need to adjust the `info.title` field, apply the [info-override decorator](https://redocly.com/docs/cli/decorators/info-override/) using the [`bundle`](./bundle.md) command before joining the files.

{% /admonition %}

The root `servers` object combines only the common content from all input files.
If the servers are different for each input file, the `join` command puts the content inside the `servers` object under the corresponding `paths`.

Commented lines are not included in the output file.

Path names and component names must be unique in all input files, but their content doesn't have to be unique for the `join` command to produce the output file.
For each path item object, only the operation ID must be unique.

If the `join` command detects any conflicting content while trying to combine the input files, it displays informative messages about the conflicts and exits without creating an output file.
To prevent this, use optional parameters to add prefixes to tags and components.

<pre>
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
</pre>

### Prefix tags with specified `info` property

If any of the input files contain the `tags` object, tags in the output file are prefixed by the selected property from the `info` object of the corresponding input file.

The output file preserves the original tag names as the value of the `x-displayName` property for each tag.

This command uses the `title` property as the prefix:

```bash
redocly join first-api.yaml second-api.json --prefix-tags-with-info-prop title
```

The following is the example output:

<pre>
- name: First Document title_endpoints
  description: endpoints tag description
  x-displayName: endpoints

- name: Second document title_events
  description: events tag description
  x-displayName: events
</pre>

### Prefix tags with filename

If any of the input files contain the `tags` object, tags in the output file are prefixed by the filename of the corresponding input file.

The output file preserves the original tag names as the value of the `x-displayName` property for each tag.

This command sets the `--prefix-tags-with-filename` option:

```bash
redocly join first-api.yaml second-api.json --prefix-tags-with-filename true
```

The following is the example output:

<pre>
- name: first-api_endpoints
  description: endpoints tag description
  x-displayName: endpoints

- name: second-api_events
  description: events tag description
  x-displayName: events
</pre>

### Avoid tag duplication

If you have the same tags in multiple API descriptions, you can avoid tag duplication by using the `without-x-tag-groups` option.
In this case, the `x-tagGroups` property is not created in the joined file.

This command sets the `--without-x-tag-groups` option:

```bash Command
redocly join first-api.yaml second-api.json --without-x-tag-groups
```

The tag description is taken from the first file that contains the tag.
You may see a warning about conflicts in the command output:

<pre>
warning: 1 conflict(s) on tags description.

openapi.yaml: join processed in 69ms
</pre>

### Resolve conflicting component names

If any of the input files have conflicting component names, this option can be used to resolve that issue and generate the output file.
All component names in the output file are prefixed by the selected property from the `info` object of the corresponding input file(s).

This command uses the `version` property as the prefix:

```bash
redocly join museum_v1.yaml museum_v2.json --prefix-components-with-info-prop version
```

The following is the example output:

<pre>
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

</pre>

### Specify output file

By default, the CLI tool writes the joined file as `openapi.yaml` or `openapi.json` in the current working directory.
Use the optional `--output` argument to provide an alternative output file path.

```bash Command
redocly join --output=openapi-custom.yaml
```
