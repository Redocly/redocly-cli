# `push`

## Introduction

Redocly Workflows integrates with [popular version control services](https://redocly.com/docs/workflows/sources/) and uses them as the source of your API descriptions to help you automatically validate, build, and deploy API reference docs and developer portals. This approach requires you to give Redocly Workflows access to your repositories.

The Redocly CLI `push` command helps you automate API description updates without granting Redocly Workflows access to your repositories. This is useful when you can't or don't want to grant Redocly Workflows permissions to your repositories, or when your API descriptions are generated automatically from code annotations in a CI/CD pipeline

This allows you to:

- Benefit from using Redocly Workflows to preview documentation and portal builds.
- Manage versions in the API registry.

Apart from uploading your API description file, the `push` command can automatically upload other files if they are detected or referenced in the API description:

- the [Redocly configuration file](../configuration/index.md) and any configuration files referenced in the `extends` list.
- the `package.json` file (if it exists) from the folder where you're executing the `push` command. Redocly Workflows uses the `@redocly/cli` version specified in `package.json`.
- the HTML template and the full contents of the folder specified as the `theme.openapi.htmlTemplate` parameter in the Redocly configuration file.

{% admonition type="attention" %}
If a plugin is referenced in the Redocly configuration file, the `push` command recursively scans the folder containing the plugin and uploads all `.js`, `.json`, `.mjs` and `.ts` files.

Make sure that each plugin has all the required files in its folder; otherwise, they are not uploaded.
{% /admonition %}

By default, the `push` command only updates an existing API description version. If an API with the provided name and version doesn't exist in your organization, it isn't created automatically. For details on how to create an API, check the [Upsert an API with push](#upsert-an-api-with-push) section.

{% admonition type="warning" %}
Only API descriptions with a CI source can be updated with the `push` command. Attempting to update API definitions created from other sources fails with an error.
{% /admonition %}

## Prerequisites

Before using the `push` command, ensure the following prerequisites are met:

1. Active user account in a Redocly Workflows organization.
1. Active [personal API key or organization API key](https://redocly.com/docs/settings/personal-api-keys/).

## Authentication

To authenticate to the API registry, you can use several approaches:

- use the [`login` command](login.md). In this case, the command is as follows:

  ```bash
  redocly login
  redocly push ...
  ```

  Refer to the [`login` command documentation](login.md) for more details.

- set the `REDOCLY_AUTHORIZATION` environment variable to either your [personal API key](https://redocly.com/docs/settings/personal-api-keys/) or to an organization-wide API key (configurable by organization owners in **Redocly Workflows > Settings > API keys**). In this case, the command may look as follows:

  ```bash
  REDOCLY_AUTHORIZATION=yourPersonalApiKey redocly push ...
  ```

  Treat the API keys as secrets and work with them accordingly. Consult the documentation for your CI system to learn more about handling secrets:

  - [Travis CI documentation](https://docs.travis-ci.com/user/environment-variables/)
  - [CircleCI documentation](https://circleci.com/docs/env-vars/)
  - [GitHub Actions documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
  - [Jenkins documentation](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-credentials)

## Usage

```bash
redocly push [api] [--destination] [--organization]
redocly push
redocly push [-u] [--job-id id] [--batch-size number] <path/to/api-description.yaml> [--destination] [--organization] [--branch]
```

## Options

| Option           |   Type   | Description                                                                                                                                                                                                                                              |
| ---------------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api              |  string  | The API description that you want to push to the Redocly API registry. Provide it as a path to the root API description file (or as an alias). See [Set options explicitly](#set-options-explicitly) for more information.                               |
| --batch-size     |  number  | Number of CI pushes expected within one batch. See [the Batch Size section](#batch-size) for more information.                                                                                                                                           |
| --branch, -b     |  string  | The branch where your API description is pushed or upserted. Default value is `main`.                                                                                                                                                                    |
| --destination    |  string  | The location in the API registry where you want to push or upsert your API description. Provide it in the following format: `api-name@api-version`.                                                                                                      |
| --files          | [string] | List of other folders and files to upload. See [the Files section](#files) for more information.                                                                                                                                                         |
| --help           | boolean  | Help output for the command.                                                                                                                                                                                                                             |
| --job-id         |  string  | The ID of the CI job that the current push is associated with. See [the Job ID section](#job-id) for more information.                                                                                                                                   |
| --lint-config    |  string  | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                                       |
| --organization   |  string  | ID of organization that the API description is being pushed to. Overrides the one defined in the config file.                                                                                                                                            |
| --public         | boolean  | Make API descriptions publicly accessible from the API Registry. Read more about [using the public option](#public).                                                                                                                                     |
| --region,-r      |  string  | Which region to use when logging in. Supported values: `us`, `eu`. The `eu` region is limited to enterprise customers. Default value is `us`. Alternatively, set an environment variable `REDOCLY_DOMAIN` with the value of the appropriate Redocly API. |
| --skip-decorator | [string] | Ignore one or more decorators. See the [Skip decorator section](#skip-decorator) for usage examples.                                                                                                                                                     |
| --upsert, -u     | boolean  | Create a new version of an API when pushing to the API registry if the version doesn't exist. See [the Upsert an API with push section](#upsert-an-api-with-push) for more information.                                                                  |
| --version        | boolean  | Show version number.                                                                                                                                                                                                                                     |

## Examples

The command behaves differently depending on the options you pass to it and whether the configuration file exists in your working directory.

You can choose any of the following approaches:

- [Specify all options explicitly in the command](#set-options-explicitly)
- [Set options in the Redocly configuration file](#set-options-in-the-configuration-file)

### Destination

To properly push your API description to the Redocly API registry, you need the following information:

- [Organization ID](#organization-id)
- [API name and version](#api-name-and-version)

#### Organization ID

The `push` command uses the following order of precedence: first, it takes the organization ID from command-line arguments (if provided).
If the organization ID is not provided explicitly, it takes it from the configuration file.

To find your organization ID required for the command:

1. Log into Workflows.
1. Access the **API registry** page.
1. In your browser's address bar, find the URL of this page.
1. Inspect the segment after `app.redocly.com/org/`. This part is your organization ID.

For example, if the URL is `app.redocly.com/org/test_docs`, the organization ID is `test_docs`. When using the `push` command, you would provide this ID as `--organization=test_docs`.

{% admonition type="warning" name="Note" %}
The organization ID can differ from the organization name. Owners can change the organization name at any time in the Workflows **Settings** page, but the organization ID cannot be changed.
{% /admonition %}

#### API name and version

To find your API name required for the command:

1. Log into Workflows.
1. Access the **API registry** page.
1. Check the list of APIs displayed on this page.
1. Inspect the title of each list item to the left of the **New version** and **Edit API** action buttons. This title is an API name.

{% admonition type="attention" %}
The name of your API should contain only supported characters (`a-z`, `A-Z`, `0-9`, `-`, `.`). Using a restricted character results in an error, and your API doesn't get created.
{% /admonition %}

To find your API version required for the command:

1. Log into Workflows.
1. Access the **API registry** page.
1. Check the list of APIs displayed on this page.
1. The version is displayed in the title after the `@` in format `<name> @ <version>`.

When using the `push` command, you would provide the API name and version separated with the "at" symbol (`@`). For example: `--destination=petstore-api@v1`.

{% admonition type="attention" %}
The version of your API should contain only supported characters (`a-z`, `A-Z`, `0-9`, `-`, `.`). Using a restricted character results in an error, and your API doesn't get created.
{% /admonition %}

### Set options explicitly

Provide the `api` as a path to the root API description file, and specify the organization ID, API name and version.

```bash
redocly push openapi/petstore.yaml --destination=petstore-api@v1 --organization=openapi-org
```

In this case, `push` uploads only the API description that was passed to the command. The configuration file is ignored.

To push the API description to a particular branch, specify the branch name.

```bash
redocly push openapi/petstore.yaml --destination=petstore-api@v1 --organization=openapi-org -b develop
```

### Set options in the configuration file

Depending on the contents of your Redocly configuration file, you can use simplified `push` syntax instead of providing the full path to the API description file.

**Example configuration file**

```yaml
organization: organization-id
apis:
  api-name@api-version:
    root: path/to/root/api-description.yaml
  another-api:
    root: openapi/openapi.yaml
```

With a configuration file like this, you can use any of the following commands:

1. `redocly push`

Push every API listed in the `apis` section of the configuration file.
You must specify your Workflows organization ID in the configuration file for this approach to work.
APIs without an explicitly defined version are automatically pushed to `@latest`.

2. `redocly push --destination=api-name@api-version`

Push the specified API and version from the `apis` section of the configuration file.
You must specify your organization ID in the configuration file for this approach to work.

3. `redocly push --destination=api-name@api-version --organization=organization-id`

Push the specified API and version from the `apis` section of the configuration file to the Workflows organization matching the provided organization ID.
In this case, you don't have to specify the organization ID in the configuration file.

### Upsert an API with push

To upsert an API in the registry with the `push` command, use the `--upsert` or `-u` option. The upsert creates the destination if it doesn't exist, or updates it if it does.
{% tabs %}
{% tab label="Set options explicitly" %}

```bash
redocly push -u test-api-v1.yaml --destination=test-api@v1 --organization=redocly
```

{% /tab  %}
{% tab label="Use config file" %}

```bash
redocly push -u --destination=test-api@v1
```

{% /tab  %}
{% tab label="Upsert all APIs from config file" %}

```bash
redocly push -u
```

{% /tab  %}
{% /tabs  %}
To upsert the API description to a particular branch, specify the branch name with `--branch` or `-b`.
{% tabs %}
{% tab label="Set options explicitly" %}

```bash
redocly push openapi/petstore.yaml --destination=petstore-api@v1 --organization=openapi-org -b develop
```

{% /tab  %}
{% tab label="Use config file" %}

```bash Use config file
redocly push -u test-api@v1 -b develop
```

{% /tab  %}
{% /tabs  %}

### Job ID

The `--job-id` option can be used by Redocly Workflows to associate multiple pushes with a single CI job.

Below are possible use cases for the `--job-id` option:

- CI/CD systems: group pushes from a single CI job together so that each push does not trigger separate reference docs/portals rebuild.
- External systems: a parameter that can be used in reports, metrics, analytics to refer to a specific application service state.

Must be used only in combination with the `--batch-size` option.

### Batch Size

The `--batch-size` option can be used by Redocly Workflows to understand how many pushes in total are performed within one batch to properly handle parallel pushes.

Must be used only in combination with the `--job-id` option. Must be an integer bigger than 1.

### Skip decorator

You may want to skip specific decorators upon running the command.
{% tabs %}
{% tab label="Skip a decorator" %}

```bash
redocly push openapi/petstore.yaml --destination=petstore-api@v1 --organization=openapi-org --skip-decorator=test/remove-internal-operations
```

{% /tab  %}
{% tab label="Skip multiple decorators" %}

```bash
redocly push openapi/petstore.yaml --destination=petstore-api@v1 --organization=openapi-org --skip-decorator=test/remove-internal-operations --skip-decorator=test/remove-internal-schemas
```

{% /tab  %}
{% /tabs  %}

### Public

The `--public` option allows you to upload your API description and make it publicly accessible from the API Registry. By default, API descriptions uploaded with the `push` command are not available to the public.
For more information on how to configure access to your APIs, check the [registry access](https://redocly.com/docs/api-registry/settings/manage-access/#set-up-access-to-api-registry) section.

```bash
redocly push openapi/petstore.yaml --destination=petstore-api@v1 --organization=openapi-org --public
```

### Files

The `--files` option allows you to upload other folders and files.

```bash
redocly push openapi/petstore.yaml --destination=petstore-api@v1 --organization=openapi-org --files ./path/to/folder
```

You can also add files and folders providing them in `redocly.yaml`:

```yaml
apis:
  main:
    root: ./openapi.yam;
files:
  - ./path/to/folder
  - ./path/to/another-folder/file.md
  - ./file.md
```

**`--files` has higher priority than `redocly.yaml`**

### Set up CI from Redocly Workflows

The Redocly Workflows interface can help you get started with the `push` command.

1. In **API registry**, select **Add API**.
1. In the **Definition name** step, provide a name for your new API description.
1. In the **Choose source** step, select **Upload from CI/CD**. This generates syntax for the `push` command that you can copy and use to upload a new API description file. Or use the `redocly push -u` command directly from the command-line interface.
