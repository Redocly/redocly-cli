---
tocMaxDepth: 2
---
# Redocly OpenAPI CLI commands

Redocly OpenAPI CLI currently supports the following commands:

- [bundle](#bundle)
- [join](#join)
- [lint](#lint)
- [login](#login)
- [logout](#logout)
- [preview-docs](#preview-docs)
- [push](#push)
- [split](#split)
- [stats](#stats)


The following configuration files define the behavior of the CLI tool:

- `.redocly.yaml` - used to define the location of your root files, linting rules, and reference docs configuration information.
- `.redocly.lint-ignore.yaml` - used to ignore specific lint messages.


The CLI tool looks for configuration files in the current working directory. If it detects them, it will use the options set in those configuration files for the commands. Learn more about the [configuration file structure and options](https://redoc.ly/docs/cli/configuration/).

When executing any of the commands, you can override the default configuration file by providing a path to another configuration file with the `--config` option.


## bundle

API definitions can grow and become difficult to manage, especially if several teams are collaborating on them. It's a good practice to maintain the reusable parts as separate files, and include them in the main (root) API definition by referencing them with `$ref`. However, most OpenAPI tools do not support that multi-file approach, and require a single-file API definition.

Redocly OpenAPI CLI can help you combine separate API definition files into one. The `bundle` command pulls the relevant parts of an API definition into a single file output in JSON or YAML format.

The `bundle` command first executes preprocessors, then rules, then decorators.


```mermaid
graph LR
    preprocessors[Preprocessors]
    rules[Rules]
    decorators[Decorators]
    preprocessors --> rules --> decorators
```


### `bundle` usage


```
Positionals:
  entrypoints                                              [array] [default: []]
Options:
  --version            Show version number.                            [boolean]
  --help               Show help.                                      [boolean]
  --lint               Lint definitions               [boolean] [default: false]
  --output, -o                                                          [string]
  --format             Use a specific output format.
                        [choices: "stylish", "codeframe"] [default: "codeframe"]
  --max-problems       Reduce output to max N problems.  [number] [default: 100]
  --ext                Bundle file extension.   [choices: "json", "yaml", "yml"]
  --skip-rule          Ignore certain rules.                             [array]
  --skip-preprocessor  Ignore certain preprocessors.                     [array]
  --skip-decorator     Ignore certain decorators.                        [array]
  --dereferenced, -d   Produce fully dereferenced bundle.              [boolean]
  --force, -f          Produce bundle output even when errors occur.   [boolean]
  --config             Specify path to the config file.                 [string]
```


The command:


```bash
openapi bundle --output <outputName> --ext <ext> [entrypoints...]
```


- `[entrypoints...]` corresponds to the name(s) of your root document(s).
- Instead of full paths, you can use aliases assigned in your `apiDefinitions` within your `.redocly.yaml` configuration file as entrypoints.
- The `<outputName>` is your desired output filename or folder. If the folder doesn't exist, it's automatically created.
- Use `--ext <ext>` to specify the type and extension of the output file: `.json`, `.yml` or `.yaml`.


<div class="warning">
If the file specified as the bundler's output already exists, it will be overwritten.
</div>


### How to bundle a single API definition

This command produces a bundled file in JSON format at the path `dist/openapi.json` starting from the root API definition file `openapi/openapi.yaml`.


```
openapi bundle --output dist/openapi.json openapi/openapi.yaml
```


### How to bundle multiple API definitions

This command creates one bundled file for each of the specified entrypoints in the folder `dist/`. Bundled files are in JSON format.


```
openapi bundle --output dist --ext json openapi/openapi.yaml openapi/petstore.yaml
```


The output will be:


```
dist/openapi.json
dist/petstore.json
```


### How to make a fully dereferenced bundle

<div class="warning">
JSON output only works when there are no circular references.
</div>


```
openapi bundle --dereferenced --output dist --ext json openapi/openapi.yaml openapi/petstore.yaml
```


### Options

#### Skip preprocessor

You may want to skip specific preprocessors upon running the command.


```
openapi bundle --skip-preprocessor=discriminator-mapping-to-one-of,another-example
```


Learn more about [preprocessors]().


#### Skip rule

You may want to skip specific rules upon running the command.


```
openapi bundle --skip-rule=no-sibling-refs,no-parent-tags
```


Learn more about [rules](./customer-rules.md).


#### Skip decorator

You may want to skip specific decorators upon running the command.


```
openapi bundle --skip-decorator=generate-code-samples,remove-internal-operations
```


Learn more about [decorators](./custom-rules.md).


## join


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


## lint

Redocly OpenAPI CLI can identify and report on problems found in OpenAPI definitions, with the goal of avoiding bugs and making APIs more consistent. The `lint` command reports on problems and executes preprocessors and rules. Unlike the `bundle` command, `lint` doesn't execute decorators.

Use custom rules, plugins, preprocessors, and the built-in rules to define your API design standards. Every rule is a plugin that can be added at runtime.


```mermaid
graph LR
    preprocessors[Preprocessors]
    rules[Rules]
    preprocessors --> rules
```


### `lint` usage


```shell
Positionals:
  entrypoints                                              [array] [default: []]

Options:
  --version               Show version number.                         [boolean]
  --help                  Show help.                                   [boolean]
  --format                Use a specific output format.
                        [choices: "stylish", "codeframe"] [default: "codeframe"]
  --max-problems          Reduce output to max N problems.
                                                         [number] [default: 100]
  --generate-ignore-file  Generate ignore file.                        [boolean]
  --skip-rule             Ignore certain rules.                          [array]
  --skip-preprocessor     Ignore certain preprocessors.                  [array]
  --config                Specify path to the config file.              [string]
  --extends               Override extends configurations (defaults or config
                          file settings).                                [array]
```


The command:


```bash
openapi lint openapi/openapi.yaml
```


This validates the specified entrypoint(s). If none are specified, `lint` validates all entrypoints listed in the `apiDefinitions` section of the `.redocly.yaml` file.

The `entrypoints` argument can also use any glob format supported by your file system (e.g. `openapi lint ./root-documents/*.yaml`).


### Options


#### Format

The `lint` command supports two output formats: `stylish` and `codeframe`. Choose which format to use with the optional `--format` argument.

The default format is `codeframe`.


**Codeframe format**


```bash
openapi lint --format=codeframe
## equivalent to: openapi lint
```


Example output:


```shell
[1] resources/petstore-with-errors.yaml:16:3 at #/paths/~1pets?id

Don't put query string items in the path, they belong in parameters with `in: query`.

14 |   - name: pets
15 | paths:
16 |   /pets?id:
   |   ^^^^^^^^
17 |     get:
18 |       summary: List all pets

Error was generated by the path-not-include-query rule.
```


Notice the output shows the `file:line:column` of code. Depending on the terminal emulator you use, it may be possible to directly click this indicator to edit the file in place.


**Stylish format**


```bash
openapi lint --format=stylish
```


Example output:


```shell
openapi/core.yaml:
  183:5  error  spec  Property `nam` is not expected here.
```


It still shows the file name, line number and column. However, the output is compressed and omits other context and suggestions.


#### Max problems

With the `--max-problems` option, you can limit the amount of problems displayed in the command output.


```bash
openapi lint --max-problems 200
```


If the amount of detected problems exceeds the threshold you set, the remaining problems are hidden in the output, but a feedback message lets you know how many were hidden.


```shell
< ... 2 more problems hidden > increase with `--max-problems N`
```


#### Generate ignore file

Generate an ignore file to suppress error and warning severity problems in the output. When ignored, there will still be some visual feedback to let you know how many problems were ignored.

This option is useful when you have an API design standard, but have some exceptions to the rule (for example, a legacy API operation). It allows for highly granular control.


```shell
openapi lint --generate-ignore-file
```


This command generates a file named `.redocly.lint-ignore.yaml`.


<div class="warning">
This command will overwrite an existing ignore file.
</div>


Example of an ignore file:


```yaml
# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.
# See https://redoc.ly/docs/cli/ for more information.
openapi/core.yaml:
  spec:
    - '#/tags/23'
    - '#/tags/55'
```


The rule in the example is named `spec`, which indicates compliance with the OpenAPI spec. You can manually add problems that should be ignored to specific rules.


#### Skip preprocessor

You may want to skip specific preprocessors upon running the command.


```shell
openapi lint --skip-preprocessor=discriminator-mapping-to-one-of,another-example
```


Learn more about [preprocessors]().


#### Skip rule

You may want to skip specific rules upon running the command.


```shell
openapi lint --skip-rule=no-sibling-refs,no-parent-tags
```


Learn more about [rules]().


#### Specify config file

By default, the CLI tool looks for a `.redocly.yaml` configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.


```bash
openapi lint --config=./another/directory/file.yaml
```


## login

Use the `login` command to authenticate to the API registry. You must [generate a personal API key](../workflows/personal-api-keys.md) first.

When you log in, the `preview-docs` command will start a preview server using Redocly API reference docs with all of the premium features.

Also, you will be able to access your members-only (private) API definitions in the Redocly registry, and use the `push` command.

If you're having issues with the `login` command, use the `--verbose` option to display a detailed error trace (if any):

```bash
openapi login --verbose
```


## logout

The `logout` command clears the API key from your device.


## preview-docs

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


## push

Redocly Workflows integrates with [popular version control services](https://redoc.ly/docs/workflows/sources/) and uses them as the source of your API definitions to help you automatically validate, build, and deploy API reference docs and developer portals. This approach requires you to give Redocly Workflows access to your repositories.

As an alternative, you can use the OpenAPI CLI `push` command and set up your own CI pipeline for updating API definitions without granting Redocly Workflows access to your repositories. This way, you can control the frequency of API definition updates and still have the benefit of using Redocly Workflows to preview documentation and portal builds, and manage versions in the API registry.

Apart from uploading your API definition file, the `push` command can automatically upload other files if they are detected or referenced in the API definition. More specifically, the command can upload:

- the `.redocly.yaml` configuration file
- the HTML template and the full contents of the folder specified as the `referenceDocs > htmlTemplate` parameter in `.redocly.yaml`.


If a `package.json` file exists in the folder from which you're executing the `push` command, it will be uploaded as well. Redocly Workflows will use the `@redocly/openapi-cli` version specified in `package.json`.


<div class="warning">
If a plugin is referenced in the `.redocly.yaml` file, the `push` command will recursively scan the folder containing the plugin and upload all .js, .json, .mjs and .ts files. Make sure that each plugin has all the required files in its folder, because otherwise they will not be uploaded.
</div>


### `push` usage


```bash
openapi push [-u] [--run-id id] <path/to/definition.yaml> <@organization-id/api-name@api-version> [branchName]
```


Example output:

```shell
Bundling definition
Created a bundle for test.yaml
Uploading 2 files:
Uploading bundle for /Users/test/redocly/openapi-cli/nodejs/test.yaml...✓ (1/2)
Uploading /Users/test/redocly/openapi-cli/nodejs/.redocly.lint-ignore.yaml...✓ (2/2)

Definition: test.yaml is successfully pushed to Redocly API Registry
```


**Video tutorial: Using the OpenAPI CLI push command**


<iframe width="560" height="315" src="https://www.youtube.com/embed/key2NGkcR5g" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>


The prerequisite for using the `push` command is an active user account in a Redocly Workflows organization.

To find your organization ID required for the command, log into Workflows and access the **API registry** page. In your browser's address bar, find the URL of this page. The segment after `app.redoc.ly/org/` is your organization ID. For example, if the URL is `app.redoc.ly/org/test_docs`, the organization ID is `test_docs`. When using the `push` command, you would provide this ID as `@test_docs`. Note that the organization ID can differ from the organization name. Owners can change the organization name at any time in the Workflows **Org settings** page, but the organization ID cannot be changed.

To authenticate to the API registry, you can use the `REDOCLY_AUTHORIZATION` environment variable. It can be set to either your [personal API key](../workflows/personal-api-keys.md) or to an organization-wide API key (configurable by organization owners in **Redocly Workflows > Org settings > API keys**).

Treat the API keys as secrets and work with them accordingly. Consult the documentation for your CI system to learn more about handling secrets:

- [Travis CI documentation](https://docs.travis-ci.com/user/environment-variables/)
- [CircleCI documentation](https://circleci.com/docs/2.0/env-vars/)
- [GitHub Actions documentation](https://docs.github.com/en/free-pro-team@latest/actions/reference/encrypted-secrets)
- [Jenkins documentation](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-credentials)


By default, the `push` command only updates an existing API definition version. If an API with the provided name and version doesn't exist in your organization, it will not be created automatically, and the command will exit with an error exit code.

Note that only API definitions with a CI source can be updated with the `push` command. Attempting to update API definitions created from other sources will fail with an error.

To create a new API and a new API definition version with the `push` command, use the `-u` option:


```bash
openapi push -u test-api-v1.yaml @redocly/test-api@v1 main
```


The name and version of your API definition should contain only supported characters (`a-z`, `A-Z`, `0-9`, `-`, `.`). Using a restricted character will result in an error, and your API definition will not be created.

If the `branchName` option is omitted, the command will use the default branch.

The `--run-id` option can be used by Redocly Workflows to associate multiple pushes with a single CI job. It is auto-populated for the following CI systems so you don't have to pass it separately:

- Travis CI
- CircleCI
- GitHub Actions


### Set up CI from Redocly Workflows

The Redocly Workflows interface can help you get started with the `push` command.

1. In **API Registry**, select **Add API**.

2. In the **Definition name** step, provide a name for your new API definition.

3. In the **Choose source** step, select **Upload from CI/CD**. This will generate syntax for the `push` command that you can copy and use to upload a new API definition file. Alternatively, use the `openapi push -u` command directly from the command-line interface.


## split

The `split` command takes an API definition file and creates a multi-file structure out of it by extracting referenced parts into standalone, separate files. Essentially, the `split` command does the opposite of the `bundle` command.


<div class="warning">
The `split` command doesn't support OpenAPI 2.0 definitions.
</div>


### `split` usage


```shell
Positionals:
entrypoint                                                            [string]

Options:
--version  Show version number.                                      [boolean]
--help     Show help.                                                [boolean]
--outDir   Output directory where files will be saved      [string] [required]
```


The command:


```bash
openapi split openapi/petstore.yaml --outDir test
```


If the specified output directory doesn't exist, it's automatically created. In that directory, the `split` command "unbundles" the specified API definition. Code samples, components, and paths are split from the root definition into separate files and folders. The structure of the unbundled directory corresponds to the structure created by our [Create OpenAPI repo](https://github.com/Redocly/create-openapi-repo) tool.


## stats

The `stats` command provides statistics about the structure of one or more API definition files. Statistics are calculated using the counting logic from the `StatsVisitor` module. The `stats` command can generate statistics for the following:


```shell
Metrics:
    References,
    External Documents,
    Schemas,
    Parameters,
    Links,
    Path Items,
    Operations,
    Tags
```


### `stats` usage


```shell
Positionals:
  entrypoint                                                 [string] [required]
Options:
  --version            Show version number.                            [boolean]
  --help               Show help.                                      [boolean]
  --format             Use a specific output format.
                               [choices: "stylish", "json"] [default: "stylish"]
  --config             Specify path to the config file.                 [string]
```


The command:


```bash
openapi stats openapi/petstore.yaml
```


The output will be:


```shell
🚗 References: 12
📦 External Documents: 3
📈 Schemas: 10
👉 Parameters: 9
🔗 Links: 0
➡️ Path Items: 16
👷 Operations: 22
🔖 Tags: 5
```


### Options

#### Format

The `stats` command supports two output formats: `stylish` and `json`. Choose which format to use with the optional `--format` argument.

The default format is `stylish`, with colored text and an icon at the beginning of each line.


**Example JSON output**


```bash
openapi stats test.yaml --format=json
```


```json
Document: test.yaml stats:

  {
    "refs": {
        "metric": "🚗 References",
        "total": 1
    },
    "externalDocs": {
        "metric": "📦 External Documents",
        "total": 0
    },
    "schemas": {
        "metric": "📈 Schemas",
        "total": 1
    },
    "parameters": {
        "metric": "👉 Parameters",
        "total": 2
    },
    "links": {
        "metric": "🔗 Links",
        "total": 0
    },
    "pathItems": {
        "metric": "➡️ Path Items",
        "total": 3
    },
    "operations": {
        "metric": "👷 Operations",
        "total": 3
    },
    "tags": {
        "metric": "🔖 Tags",
        "total": 2
    }
  }
```



#### Specify config file

By default, the CLI tool looks for a `.redocly.yaml` configuration file in the current working directory. Use the optional `--config` argument to provide an alternative path to a configuration file.


```bash
openapi stats openapi/petstore.yaml --config openapi/.redocly.yaml
```
