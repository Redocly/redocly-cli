---
tocMaxDepth: 3
---
# `join`

## Introduction

:::warning Important

The `join` command is considered an experimental feature. This means it's still a work in progress and may go through major changes.

The `join` command supports OpenAPI 3.x definitions only.

:::

Maintainers of multiple API definitions can benefit from storing each endpoint as a standalone API definition file. However, this approach is not supported by the majority of OpenAPI tools, as they require a single API definition file.

With Redocly CLI, you can solve this problem by using the `join` command that can combine two or more API definition files into a single one.

To easily distinguish the origin of OpenAPI objects and properties, you can optionally instruct the `join` command to append custom prefixes to them.

The `join` command accepts both YAML and JSON files, which you can mix in the resulting `openapi.yaml` file. Setting a custom name for this file can be achieved by providing it through the `--output` argument. Any existing file will be overwritten.

Apart from providing individual API definition files as the input, you can also specify the path to a folder that contains multiple API definition files and match them with a wildcard (for example, `myproject/openapi/*.yaml`). The `join` command will collect all matching files and combine them into one file.

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

Option | Type | Description
-- | -- | --
apis | array | **REQUIRED.**  1. Array of paths to API definition files that you want to join. At least two input files are required.<br />2. A wildcard pattern to match API definition files within a specific folder.
--help | boolean | Show help.
--lint | boolean | Lint definition files.
--prefix-tags-with-filename | string | Prefix tags with property value from file name. See the [prefix-tags-with-filename section](#prefix-tags-with-filename) below.
--prefix-components-with-info-prop | string | Prefix components with property value from info object. See the [prefix-components-with-info-prop section](#prefix-components-with-info-prop) below.
--prefix-tags-with-info-prop | boolean | Prefix tags with property value from info object. See the [prefix-tags-with-info-prop](#prefix-tags-with-info-prop) section.
--without-x-tag-groups | boolean | Skip automated `x-tagGroups` creation. See the [without-x-tag-groups](#without-x-tag-groups) section.
--version | boolean | Show version number.
--output, -o | string | Name for the joined output file. Defaults to `openapi.yaml`. **If the file already exists, it's overwritten.**

## Examples

### Array of paths

```bash Command
redocly join first-api.yaml second-api.json
```

```bash Output
redocly join first-api.yaml second-api.json

openapi.yaml: join processed in 56ms
```

The command creates the output `openapi.yaml` file in the working directory.

The order of input files affects how their content is processed. The first provided file is always treated as the "main" file, and its content has precedence over other input files when combining them. Specifically, the following properties of the API definition are always taken only from the first input file:

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

However, if any of the input files contain the `tags` object, the `join` command automatically creates the `x-tagGroups` object in the output file. This object contains the `info.description` property from each of the input files.

```yaml
x-tagGroups:
  - name: first-api
    tags:
      - expanded
      - other
    description: "Text from info: description of the first input file"
  - name: second-api
    tags:
      - pets
    description: "Text from info: description of the second input file"
```

:::info

If some operations in an input file don't have a tag assigned to them, the `join` command automatically adds the `other` tag to those operations in the output file. The `other` tag is also included in the `x-tagGroups` object.

If any of the input files contain the `x-tagGroups` object, the content of this object is ignored by the `join` command and not included in the output file.

:::

The `servers` object combines the content from all input files, starting with the content from the first file. Commented lines are not included in the output file.

Path names and component names must be unique in all input files, but their content doesn't have to be unique for the `join` command to produce the output file. For each path item object, only the operation ID must be unique.

If the `join` command detects any conflicting content while trying to combine the input files, it displays informative messages about the conflicts and exits without creating an output file. To prevent this, use optional parameters to add prefixes to tags and components.

```bash
Conflict on tags => all : pets in files: petstore.yaml,test.yaml

1 conflict(s) on tags.
Suggestion: please use prefix-tags-with-filename, prefix-tags-with-info-prop or without-x-tag-groups to prevent naming conflicts.

Conflict on paths => /pets : get in files: petstore.yaml,test.yaml
Conflict on paths => /pets : post in files: petstore.yaml,test.yaml
Conflict on paths => operationIds : listPets in files: petstore.yaml,test.yaml
Conflict on paths => operationIds : createPets in files: petstore.yaml,test.yaml
Conflict on paths => operationIds : showPetById in files: petstore.yaml,test.yaml
Conflict on paths => /pets/{petId} : get in files: petstore.yaml,test.yaml

Please fix conflicts before running join.
```

Use the [`--without-x-tag-groups`](#without-x-tag-groups) option to skip the creation and population of `x-tagGroups` in the output file.

:::warning

These options are mutually exclusive: `without-x-tag-groups`, `prefix-tags-with-filename`, and `prefix-tags-with-info-prop`.

:::

### prefix-tags-with-info-prop

If any of the input files contain the `tags` object, tags in the output file will be prefixed by the selected property from the `info` object of the corresponding input file.

The output file preserves the original tag names as the value of the `x-displayName` property for each tag.

#### Usage

```bash Command
redocly join first-api.yaml second-api.json --prefix-tags-with-info-prop title
```

```yaml Output file example
- name: First Document title_endpoints
  description: endpoints tag description
  x-displayName: endpoints

- name: Second document title_pets
  description: pets tag description
  x-displayName: pets
```


### prefix-tags-with-filename

If any of the input files contain the `tags` object, tags in the output file will be prefixed by the filename of the corresponding input file.

The output file preserves the original tag names as the value of the `x-displayName` property for each tag.

#### Usage

```bash Command
redocly join first-api.yaml second-api.json --prefix-tags-with-filename true
```

```yaml Output file example
- name: first-api_endpoints
  description: endpoints tag description
  x-displayName: endpoints

- name: second-api_pets
  description: pets tag description
  x-displayName: pets
```

### without-x-tag-groups

If you have the same tags in multiple API definitions, you can allow tag duplication by using the `without-x-tag-groups` option. In this case, the `x-tagGroups` property will not be created in the joined file.

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

If any of the input files have conflicting component names, this option can be used to resolve that issue and generate the output file. All component names in the output file will be prefixed by the selected property from the `info` object of the corresponding input file(s).

#### Usage

```bash Command
redocly join first-api.yaml second-api.json --prefix-components-with-info-prop version
```

```yaml Output file example
components:
  schemas:
    1.0.1_Pet:
      allOf:
        - $ref: '#/components/schemas/NewPet'
        - type: object
          required:
            - id
          properties:
            id:
              type: integer
              format: int64
    1.0.1_NewPet:
      type: object
      required:
        - name
      properties:
        name:
          type: string
        tag:
          type: string
    1.2.0_Pet:
      allOf:
        - $ref: '#/components/schemas/NewPet'
        - type: object
          required:
            - id
          properties:
            id:
              type: integer
              format: int64
```

### Custom output file

By default, the CLI tool writes the joined file as `openapi.yaml` in the current working directory. Use the optional `--output` argument to provide an alternative output file path.

```bash Command
redocly join --output=openapi-custom.yaml
```
