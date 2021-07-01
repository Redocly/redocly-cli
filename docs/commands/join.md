# `join`

<div class="warning"><b>Important</b>

The `join` command is considered an experimental feature. This means it's still a work in progress and may go through major changes.
</div>


Maintainers of multiple API definitions can benefit from storing each endpoint as a standalone API definition file. However, this approach is not supported by the majority of OpenAPI tools, as they require a single API definition file.

Redocly OpenAPI CLI can combine two or more API definition files into one. The resulting file optionally helps distinguish the origin of OpenAPI objects and properties by appending custom prefixes to them.

The `join` command accepts YAML and JSON files, and you can mix those two file types when running the command. The resulting file is always called `openapi.yaml`, as setting a custom name is not supported. If a file called `openapi.yaml` exists in the working directory, it will be overwritten.

Apart from providing individual API definition files as the input, you can specify the path to a folder that contains multiple API definition files and match them with a wildcard (for example, `myproject/openapi/*.yaml`). The `join` command collects all matching files and combines them into one file.

Only OpenAPI 3.x definitions are supported by this command.


### `join` usage


```
Positionals:
entrypoints                                              [array] [default: []]

Options:
--version                           Show version number.             [boolean]
--help                              Show help.                       [boolean]
--lint                              Lint definitions[boolean] [default: false]
--prefix-tags-with-info-prop        Prefix tags with property value from info
object                            [string]
--prefix-tags-with-filename         Prefix tags with property value from file
name            [boolean] [default: false]
--prefix-components-with-info-prop  Prefix components with property value from
info object                       [string]
```


The command:


```bash
openapi join first-api.yaml second-api.json
```


The command creates the output file `openapi.yaml` in the working directory.

At least two input files are required.

The order of input files affects how their content is processed. The first provided file is always treated as the "main" file, and its content has precedence over other input files when combining them.

More specifically, the following properties of the API definition are always taken only from the first input file:

```
info:
  version
  title
  termsOfService
  contact
  license
externalDocs
```


By default, the `info: description` property is taken only from the first file, even if it exists in other input files.

However, if any of the input files contains the `tags` object, the `join` command automatically creates the `x-tagGroups` object in the output file. This object contains the `info: description` property from each of the input files.


```
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


If some operations in an input file don't have a tag assigned to them, the `join` command automatically adds the `other` tag to those operations in the output file. The `other` tag is also included in the `x-tagGroups` object.

If any of the input files contains the `x-tagGroups` object, the content of this object is ignored by the `join` command, and not included in the output file.

The `servers` object combines the content from all input files, starting with the content from the first file. Commented lines are not included in the output file.

Path names and component names must be unique in all input files, but their content doesn't have to be unique for the `join` command to produce the output file. For each path item object, only the operation ID must be unique.

If the `join` command detects any conflicting content while trying to combine the input files, it displays informative messages about the conflicts and exits without creating an output file. To prevent this, use optional parameters to add prefixes to tags and components.


### Options

The following optional parameters are supported by the `join` command.


**prefix-tags-with-info-prop**

If any of the input files contains the `tags` object, tags in the output file will be prefixed by the selected property from the `info` object of the corresponding input file.

The output file preserves the original tag names as the value of the `x-displayName` property for each tag.


Usage:


```bash
openapi join first-api.yaml second-api.json --prefix-tags-with-info-prop title
```


Example from the output file:


```
  - name: First Document Title_endpoints
    description: endpoints tag description
    x-displayName: endpoints

  - name: Second document title_pets
    description: pets tag description
    x-displayName: pets
```


**prefix-tags-with-filename**

If any of the input files contains the `tags` object, tags in the output file will be prefixed by the filename of the corresponding input file.

The output file preserves the original tag names as the value of the `x-displayName` property for each tag.


Usage:


```bash
openapi join first-api.yaml second-api.json --prefix-tags-with-filename true
```


Example from the output file:


```
  - name: first-api_endpoints
    description: endpoints tag description
    x-displayName: endpoints

  - name: second-api_pets
    description: pets tag description
    x-displayName: pets
```


**prefix-components-with-info-prop**

If any of the input files have conflicting component names, this option can be used to resolve that issue and generate the output file. All component names in the output file will be prefixed by the selected property from the `info` object of the corresponding input file(s).


Usage:


```bash
openapi join first-api.yaml second-api.json --prefix-components-with-info-prop version
```


Example from the output file:


```yaml
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
