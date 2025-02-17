# @redocly/spot

The key benefits of `spot`:

- Easier test writing (using a declarative style) for all kinds of HTTP API endpoints (it has a test autogenerator too).
- Catch disparities between your API and OpenAPI descriptions using automated assertions based on schemas.
- Save time and resources because this is lightweight and fast enough to run from a CICD with each commit.
- Partial support of [The Arazzo Specification](https://github.com/OAI/Arazzo-Specification) was implemented with additional extensions.

You **MUST** have a working API server running in order to run the tests because it sends real HTTP requests.

## Quickstart

Please refer to the [Quickstart](../../docs/public/spot/quickstart.md) guide to get started.

## Commands

### Run tests

```sh
spot run <your-test-file> [-w | --workflow] [-v | --verbose]
```

Run API tests based on the test-file config.

**Options**

| Option         | Type            | Description                                                                                                                                                                                                                                                          |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| -w, --workflow | Array\<String\> | Workflow names to run. Example: `spot run test-file.yaml --workflow first-flow second-flow`                                                                                                                                                                          |
| -v, --verbose  | boolean         | Verbose mode. Example: `spot run test-file.yaml --verbose`                                                                                                                                                                                                           |
| --har-output   | string          | Path for the `har` file for saving logs. Example `spot run test-file.yaml --har-output='logs.har'`                                                                                                                                                                   |
| --json-output  | string          | Path for the `json` file for saving logs. Example `spot run test-file.yaml --json-output='logs.json'`                                                                                                                                                                |
| --input        | string          | Input parameters that would be mapped to the workflow inputs description. Example `spot run test-file.yaml --input '{"key": "value", "nested": {"nestedKey": "nestedValue"}}'` or `spot run test.yaml --input userEmail=name@redocly.com --input userPassword=12345` |
| --server       | string          | Server overrides for the `sourceDescriptions` object. Example `spot run test-file.yaml --server test=https://test.com`                                                                                                                                               |

Run the tests by running the following command: `spot run <your-test-file>`.

### Auto generate tests based on OpenAPI

```sh
spot generate <your-OAS-description-file> [-o | --output-file] [--extended]
```

Auto generate the test-config file based on the OpenAPI description file. If `examples` are provided in the OpenAPI description, they are used as input data for test requests. In case `schema` is provided, config generates with fake data based on the description schema. By default, data for requests come from the description in run-time. To materialize tests with the data, use the `--extended` option.

Tip: Use the `--extended` option to learn how `spot` uses data from a description. In most cases it is better to use the data from the description in run-time.

**Options**

| Option            | Type    | Description                                                                                                                                                                                                                |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| -o, --output-file | string  | Path to the OAS description file. If the file name is not provided, the default name is used - `auto-generate.yaml`. Example: `spot generate OAS-file.yaml -o=example.yaml`                                                |
| --extended        | boolean | By default, data for requests comes from the description at runtime. This option generates a test config file with data populated from the description. Example: `spot generate OAS-file.yaml -o=example.yaml --extended`. |

### Help

```sh
spot [--version] [--help]
```

Prints the version or help information.

## Configuration file

Read more about tests syntax in the [Spot Documentation](../../docs/public/spot/spot-specification.md).

#### Workflows example

This example contains the `workflows` object:

```yaml
workflows:
  - workflowId: my-testing-flow
    steps:
      - stepId: getPost
        x-operation:
          path: /posts/1
          method: get
          serverUrl: https://jsonplaceholder.typicode.com
        successCriteria:
          - condition: $statusCode == 200
          - condition: $response.body#/id == 1
```

Each workflow is isolated and consists of steps declared as an array. It **MUST** contain the `x-operation` or `operationId`|`operationPath` properties. You can also specify a name to able to reference its response in the next steps.

#### Chaining requests example

You can also create a chain of requests and reference each response (see [How to reference response](#how-to-reference-responses)):

```yaml
workflows:
  - workflowId: my-testing-flow
    steps:
      - stepId: createItem
        x-operation:
          path: /items
          method: post
        requestBody:
          payload:
            title: foo
        successCriteria:
          - condition: $statusCode == 201
        outputs:
          id: $response.body#/id
      - stepId: getItem
        x-operation:
          path: /items/{id}
          method: get
        parameters:
          - name: id
            in: path
            value: $steps.createItem.outputs.id
        successCriteria:
          - condition: $statusCode == 200
```

### Parameters object

| Property | Type   | Description                                                                       |
| -------- | ------ | --------------------------------------------------------------------------------- |
| name     | string | **REQUIRED.** Parameter name.                                                     |
| in       | string | **REQUIRED.** Parameter location. Possible values: `query, header, path, cookie`. |
| value    | any    | **REQUIRED.** Parameter value.                                                    |

### Defaults object

| Property   | Type                              | Description                                                                                                                   |
| ---------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| parameters | [[Parameter](#parameters-object)] | Default parameters to include in every request. Useing `x-default` on root level to be align with the Arazzo extention rules. |

#### Authorization example

```yaml
parameters:
  - in: header
    name: Authorization
    value: Bearer $inputs.env.TOKEN
```

The runner gets secrets from the env variables:

```bash
TOKEN=<your-token> spot run <your-test-file>
```

### [How to reference responses](#how-to-reference-responses)

Responses are scoped to their steps in relation to parent workflow. In order to extract any data (status, body, etc.) from other responses these responses must be declared prior to that request and must have a `name` field provided.
Example:
`$response.body#/id`

There might be only one reference `$NAME` per value (for example, you cannot concatenate multiple values into a single value).
If it is embedded in a string (for example, `bearer {$inputs.env.token} {$faker.number.integer({min:5,max:5})}`) it is treated as a string.

See [Context](#context) for more data available.

### Description reuse strategies

If you provided an OAS description, you can reuse it in the workflow.

#### Priority order

The runner first applies the data from the `description` (least priority) if provided, then the `workflows` (highest priority).
|

#### Examples

If you have an OAS description, provide a path to the file:

```yaml
sourceDescriptions:
  - name: cats
    type: openapi
    url: ./path/to/description.yaml
```

Then, reference it in a workflow or in the defaults section: `$descriptions.paths.items/{id}.responses.201.content.application/json.schema`.

#### [Faker Object](#faker)

| Data Type | Type                        | Usage example                                 | Output example                                            |
| --------- | --------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| string    | [FakeString](#fakestring)   | `$faker.string.fullName()`                    | Camille Mohr                                              |
| number    | [FakeNumber](#fakenumber)   | `$faker.number.integer({ min: 10, max: 20 })` | 12                                                        |
| address   | [FakeAddress](#fakeaddress) | `$faker.address.city()`                       | Lake Raoulfort                                            |
| date      | [FakeDate](#fakedate)       | `$faker.date.past()`                          | Sat Oct 20 2018 04:19:38 GMT-0700 (Pacific Daylight Time) |

Example:

```yaml
workflows:
  - workflowId: create-feedback
    steps:
      - stepId: addFeedback
        x-operation:
          path: /feedback
          method: post
        requestBody:
          payload:
            contentId: $faker.string.uuid()
            rating: '$faker.number.integer({ min: 1, max: 5 })'
            suggestion: A suggestion.
            sentiment: true
            reason: one
```

##### FakeString

| Method    | Parameters             | Usage example                             |
| --------- | ---------------------- | ----------------------------------------- |
| userName  | -                      | `$faker.string.userName()`                |
| firstName | -                      | `$faker.string.firstName()`               |
| lastName  | -                      | `$faker.string.lastName()`                |
| fullName  | -                      | `$faker.string.fullName()`                |
| email     | { provider? : string } | `$faker.string.email({provider:'gmail'})` |
| uuid      | -                      | `$faker.string.uuid()`                    |
| string    | { length?: number }    | `$faker.string.string({length:5})`        |

##### FakeNumber

| Method  | Parameters                                         | Usage example                            |
| ------- | -------------------------------------------------- | ---------------------------------------- |
| integer | { min?: number; max?: number }                     | `$faker.number.integer({max:30})`        |
| float   | { min?: number; max?: number; precision?: number } | `$faker.number.float({precision:0.001})` |

##### FakeAddress

| Method  | Parameters | Usage example              |
| ------- | ---------- | -------------------------- |
| city    | -          | `$faker.address.city()`    |
| country | -          | `$faker.address.country()` |
| zipCode | -          | `$faker.address.zipCode()` |
| street  | -          | `$faker.address.street()`  |

##### FakeDate

[Note: is there a way to format the date?]

| Method | Parameters | Usage example          |
| ------ | ---------- | ---------------------- |
| past   | -          | `$faker.date.past()`   |
| future | -          | `$faker.date.future()` |

## Releasing Spot

After making changes and testing them, follow these steps to release the products affected by these changes:

1. **Update Dependencies:** If `package.json` files have been updated, run `pnpm install` from the monorepo root to regenerate the `pnpm-lock.yaml` file.
2. **Add Changesets:** Run `pnpm changeset:common` from the monorepo root to add changesets to the `@redocly/spot` package, documenting the changes.
3. **Create a Pull Request:** Open a PR with the changesets included, following the usual release process.
4. **Merge and Publish:** After the PR is merged into the `main` branch, an automated PR will be generated to update the `@redocly/spot` package version and publish it to [NPM](https://www.npmjs.com/package/@redocly/spot?activeTab=versions).
5. **Merge and Publish:** Collect all approvals and merge the PR. The package will be published to NPM automatically.

## Releasing to Verdaccio

If you want to test your changes to `@redocly/spot` package before releasing it, you can publish the prerelease version to Verdaccio.
To publish a prerelease version to Verdaccio:

1. Configure Verdaccio with:

   ```bash
   npm adduser --registry http://3.236.95.236:8000
   ```

   You can provide any credentials.

2. Run `publish-to-verdaccio.sh` script.
   The output displays the version of the published package.

3. Modify your project's `package.json`: set `@redocly/spot` version to the one published in Verdaccio.

4. Install this test package from Verdaccio registry:
   ```bash
   npm i --registry http://0.0.0.0:4873/
   ```
   or use `bunfig.toml` file:
   ```bash
   [install]
   registry = "http://3.236.95.236:8000/"
   ```

## Updating the ABNF Parser for Runtime Expressions

The Arazzo runtime expression syntax is validated using the PEGJS parser. The syntax rules for runtime expressions are defined in `src/modules/runtime-expressions/abnf-parser.pegjs`, while the parser itself is autogenerated from this file and stored in `src/modules/runtime-expressions/abnf-parser.js`.

Parser will be regenerated each time during the build.
