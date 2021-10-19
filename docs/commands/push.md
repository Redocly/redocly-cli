# `push`

## Introduction

:::attention
Redocly Workflows integrates with [popular version control services](https://redoc.ly/docs/workflows/sources/) and uses them as the source of your API definitions to help you automatically validate, build, and deploy API reference docs and developer portals. This approach requires you to give Redocly Workflows access to your repositories.
:::

To work with the API registry without granting Redocly Workflows access to your repositories, you can use the OpenAPI CLI `push` command and set up your own CI pipeline to update API definitions without granting Redocly Workflows access to your repositories. This way, you can:

- Control the frequency of API definition updates.
- Benefit from using Redocly Workflows to preview documentation and portal builds.
- Manage versions in the API registry.

Apart from uploading your API definition file, the `push` command can automatically upload other files if they are detected or referenced in the API definition:

- the `.redocly.yaml` configuration file
- the `package.json` file (if it exists) from the folder where you're executing the `push` command. Redocly Workflows will use the `@redocly/openapi-cli` version specified in `package.json`.
- the HTML template and the full contents of the folder specified as the `referenceDocs > htmlTemplate` parameter in `.redocly.yaml`.

:::warning
If a plugin is referenced in the `.redocly.yaml` file, the `push` command will recursively scan the folder containing the plugin and upload all `.js`, `.json`, `.mjs` and `.ts` files.

Make sure that each plugin has all the required files in its folder, otherwise they will not be uploaded.
:::

By default, the `push` command only updates an existing API definition version. If an API with the provided name and version doesn't exist in your organization, it will not be created automatically.

:::warning
Note that only API definitions with a CI source can be updated with the `push` command. Attempting to update API definitions created from other sources will fail with an error.
:::

## Prerequisites

Before proceeding with the `push` command, ensure the following prerequisites are met:

1. Active user account in a Redocly Workflows organization.
1. Active [personal API key or organization API key](../../workflows/personal-api-keys.md).

## Authentication

To authenticate to the API registry, use the `REDOCLY_AUTHORIZATION` environment variable. It can be set to either your [personal API key](../../workflows/personal-api-keys.md) or to an organization-wide API key (configurable by organization owners in **Redocly Workflows > Settings > API keys**).

Treat the API keys as secrets and work with them accordingly. Consult the documentation for your CI system to learn more about handling secrets:

- [Travis CI documentation](https://docs.travis-ci.com/user/environment-variables/)
- [CircleCI documentation](https://circleci.com/docs/2.0/env-vars/)
- [GitHub Actions documentation](https://docs.github.com/en/free-pro-team@latest/actions/reference/encrypted-secrets)
- [Jenkins documentation](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-credentials)

## Usage

```bash
openapi push <entrypoint> <destination> [branchName]
openapi push [--upsert] <entrypoint> <destination> [branchName]
openapi push 
openapi push [-u] [--run-id id] <path/to/definition.yaml> <@organization-id/api-name@api-version> [branchName]
```

## Options

Option           | Type      | Required?    | Default     | Description
-----------------|:---------:|:------------:|:-----------:|------------
`entrypoint`     | `string`  | yes          | -           | Path to the API definition filename that you want to push to the Redocly API registry. See [the Entrypoints section](#entrypoints) for more options.
`destination`    | `string`  | yes          | -           | Organization id, API name and API version that define the location in the Redocly API registry where to push your API definition.<br />**Format:** `@organization-id/api-name@api-version`. See [the Destination section](#destination) for more information.
`branchName`     | `string`  | no           | `main`      | Set the default branch where API definitions will be pushed
`--help`         | `boolean` | no           | -           | Show help
`--run-id`       | `string`  | no           | -           | Specify the ID of the CI job that the current push will be associated with. See [the Run ID section](#run-id) for more information.
`--upsert`, `-u` | `boolean` | no           | -           | Create a new API and a new API definition version. See [the Create a new API with push section](#create-a-new-api-with-push) for more information.
`--version`      | `boolean` | no           | -           | Show version number

## Examples

### Entrypoint

The command behaves differently depending on how you pass an entrypoint to it and whether the [configuration file](#custom-configuration-file) exists. There are the following options:

#### Pass entrypoint directly

```bash
openapi push openapi/petstore.yaml @openapi-org/petstore-api@v1
```

In this case, `push` will upload only the definition that was passed to the command. The configuration file is ignored.

#### Pass entrypoint via configuration file

Instead of a full path, you can use an alias assigned in the `apiDefinitions` section within your `.redocly.yaml` configuration file as the entrypoint. For example, `petstore`:

```bash request
openapi push petstore @openapi-org/petstore-api@v1
```

```yaml .redocly.yaml
apiDefinitions:
  petstore: ./openapi/petstore.yaml
```

In this case, after resolving the path behind the `petstore` alias (example in the `.redocly.yaml` tab), `push` will upload both the `petstore.yaml` definition file and the `.redocly.yaml` configuration file to the Redocly API registry. For this approach, the `redocly.yaml` configuration file is mandatory.

### Destination

To properly push your API definition to the Redocly API registry, you need the following information:

- [Organization ID](#organization-id)
- [API name](#api-name)
- [API version](#api-version)

The format to pass this information is the following: `@organization-id/api-name@api-version`.

#### Organization ID

To find your organization ID required for the command:

1. Log into Workflows.
1. Access the **API registry** page.
1. In your browser's address bar, find the URL of this page.
1. Inspect the segment after `app.redoc.ly/org/`. This part is your organization ID.

For example, if the URL is `app.redoc.ly/org/test_docs`, the organization ID is `test_docs`. When using the `push` command, you would provide this ID as `@test_docs`.

:::warning Note
The organization ID can differ from the organization name. Owners can change the organization name at any time in the Workflows **Settings** page, but the organization ID cannot be changed.
:::

#### API name

To find your API name required for the command:

1. Log into Workflows.
1. Access the **API registry** page.
1. Check the list of APIs displayed on this page.
1. Inspect the title of each list item to the left of the **New version** and **Edit API** action buttons. This title is an API name.

:::attention
When using the `push` command, you would provide the API name after the [Organization ID](#organization-id) separated with the forward slash (`/`).

For example, `@test_docs/petstore-api`.
:::

:::info
The name of your API definition should contain only supported characters (`a-z`, `A-Z`, `0-9`, `-`, `.`). Using a restricted character will result in an error, and your API definition will not be created.
:::

#### API version

To find your API version required for the command:

1. Log into Workflows.
1. Access the **API registry** page.
1. Check the list of APIs displayed on this page.
1. Inspect the subtitle of each list item to the bottom of the [API name](#api-name). This subtitle is an API version.

:::attention
When using the `push` command, you would provide the API version after the [API name](#api-name) separated with the "at" symbol (`@`).

For example, `@test_docs/petstore-api@v1`.
:::

:::info
The version of your API definition should contain only supported characters (`a-z`, `A-Z`, `0-9`, `-`, `.`). Using a restricted character will result in an error, and your API definition will not be created.
:::

### Run ID

The `--run-id` option can be used by Redocly Workflows to associate multiple pushes with a single CI job. It is auto-populated for the following CI systems so you don't have to pass it separately:

- Travis CI
- CircleCI
- GitHub Actions

Below are possible use cases for the `--run-id` option:

- CI/CD systems: mostly for internal reference
- External systems: a parameter that can be used in reports, metrics, analytics to refer to a specific application service state.

### Create a new API with push

To create a new API and a new API definition version with the `push` command, use the `--upsert` or `-u` option:

```bash
openapi push -u test-api-v1.yaml @redocly/test-api@v1 main
```

:::warning
Before executing the `push` command with the `--upsert` option, ensure that the corresponding organization (that you are supposed to push API definitions to) exists in your Redocly API Registry.
:::

### Set up CI from Redocly Workflows

The Redocly Workflows interface can help you get started with the `push` command.

1. In **API Registry**, select **Add API**.
1. In the **Definition name** step, provide a name for your new API definition.
1. In the **Choose source** step, select **Upload from CI/CD**. This will generate syntax for the `push` command that you can copy and use to upload a new API definition file. Alternatively, use the `openapi push -u` command directly from the command-line interface.

## Learn more

- Video tutorial: Using the OpenAPI CLI push command:

    <iframe width="560" height="315" src="https://www.youtube.com/embed/key2NGkcR5g" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>