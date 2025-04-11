# `push`

Use the push command with either the Reunite or Workflows families of products.
Pick the section that relates to the product you use.

{% tabs %}

{% tab label="Reunite" %}

This command is used to push files from another location to a Reunite project.

{% admonition type="warning" name="The content is overwritten" %}
The content of the destination folder (in other words the `--mount-path`) is overwritten every time changes are detected in comparison to the current content.
{% /admonition %}

## Before you begin

Have the following values ready to use with the `push` command:

- A user account in a [Reunite project](https://auth.cloud.redocly.com/).
- An active organization [API key](https://redocly.com/docs/realm/setup/how-to/api-keys).
- [Redocly CLI](../installation.md) installed.

Use the `REDOCLY_AUTHORIZATION` environment variable to set the API key. See the [Manage API keys](https://redocly.com/docs/realm/setup/how-to/api-keys) page in the documentation for details on how to get your API key in Reunite.

## Command usage

```bash
REDOCLY_AUTHORIZATION=<api-key> redocly push <files> --organization <organizationSlug> --project <projectSlug> --mount-path <mountPath> --branch <branch> --message <message> --author <'Author Name <author-email@example.com>'> [--commit-sha <sha>] [--commit-url <url>] [--created-at <commitCreationDate>] [--repository <repositoryId> ] [--namespace <repositoryOrg>] [--default-branch <repositoryDefaultBranch>] [--domain <domain>] [--wait-for-deployment] [--max-execution-time <timeInSeconds>] [--lint-config <warn | error | off>] [--verbose]

```

## Command options

| Option                |   Type   | Description                                                                                                                                                                            |
| --------------------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| files                 | [string] | **REQUIRED.** List of folders and/or files to upload.                                                                                                                                  |
| --organization, -o    |  string  | **REQUIRED.** Organization slug.                                                                                                                                                       |
| --project, -p         |  string  | **REQUIRED.** Project slug.                                                                                                                                                            |
| --mount-path, -mp     |  string  | **REQUIRED.** The path where the files are mounted in the project.                                                                                                                     |
| --branch, -b          |  string  | **REQUIRED.** The branch files are pushed from.                                                                                                                                        |
| --author, -a          |  string  | **REQUIRED.** The author of the push in the format: `'Author Name <author-email@example.com>'`.                                                                                        |
| --message, -m         |  string  | **REQUIRED.** The commit message for the push.                                                                                                                                         |
| --commit-sha, -sha    |  string  | Commit SHA.                                                                                                                                                                            |
| --commit-url, -url    |  string  | Commit URL.                                                                                                                                                                            |
| --repository          |  string  | Repository ID. Example: `redocly-cli`.                                                                                                                                                 |
| --namespace           |  string  | Repository owner/organization/workspace. Example: `Redocly`.                                                                                                                           |
| --created-at          |  string  | Commit creation date. Format: `yyyy-mm-ddThh:mm:ss+offset value`. Example: `2024-02-20T14:26:26+02:00`                                                                                 |
| --domain              |  string  | The domain to which the files are pushed. Default value is [https://app.cloud.redocly.com](https://app.cloud.redocly.com).                                                             |
| --default-branch      |  string  | The default branch of the repository the push originates from. Default value is `main`.                                                                                                |
| --lint-config         |  string  | Severity level for configuration file linting. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                             |
| --max-execution-time  |  number  | Maximum wait time for deployment completion in seconds (used in conjunction with the `--wait-for-deployment` option). Default value is `1200`.                                         |
| --wait-for-deployment | boolean  | Waits until the build is completed if it is in progress. Behaves the same as `push-status` command when passed. See [push-status](./push-status.md) command. Default value is `false`. |
| --verbose             | boolean  | Verbose output. Default value is `false`.                                                                                                                                              |
| --help                | boolean  | Help output for the command.                                                                                                                                                           |

## Constraints

- Maximum file size: 10 MB per file
- Maximum number of files: 100

## Example usage

### Push files to the `push-docs` project in the default organization

The following command pushes the `index.md` and `docs/push.yaml` files to the project with `push-docs` slug belonging to organization with `redocly` slug:

```bash
REDOCLY_AUTHORIZATION=<api-key> \
redocly push index.md docs/push.yaml \
          --organization redocly \
          --project 'push-docs' \
          --mount-path 'docs/push' \
          --branch "docs/push-info" \
          --author "User <user@example.com>" \
          --message "Add new docs"
```

Pushed files are added to an auto-generated preview branch with a `-docs/push-info` suffix.
The committer is `User <user@example.com>`, and the commit message is `Add new docs`.
The files are added inside the `docs/push` folder in the project (the folder is created if it doesn't exist yet, if the folder does exist then the contents are overwritten).

### Push file to the `push-docs` project in the `default` organization and wait until it is deployed

This command example does the same as the [previous example](#push-files-to-the-push-docs-project-in-the-default-organization), but waits until the preview deployment finishes due to passed `--wait-for-deployment` option:

```bash
REDOCLY_AUTHORIZATION=<api-key> \
redocly push docs/push.yaml \
          --organization default \
          --project 'push-docs' \
          --mount-path 'docs/push' \
          --branch "docs/push-info" \
          --author "User <user@example.com>" \
          --message "Add new docs" \
          --wait-for-deployment
```

The command returns when the deployment is completed.

### Push files from a GitHub action to the `push-docs` project in the `Docs` organization and wait until it is deployed

The following command pushes the `docs/museum.yaml` file to the project `push-docs` in the `Docs` organization.
It uses the variables available in the GitHub actions context to supply information to the destination.

```bash
npx @redocly/cli@latest push docs/museum.yaml \
              --organization "Docs" \
              --project "push-docs" \
              --mount-path "/docs/remotes/cicd" \
              --default-branch "${{ github.event.repository.default_branch || github.event.repository.master_branch }}" \
              --branch "${{ github.ref_name }}" \
              --author "${{ github.event.head_commit.author.name }} <${{ github.event.head_commit.author.email }}>" \
              --commit-sha "${{ github.event.head_commit.id }}" \
              --commit-url "${{ github.event.head_commit.url }}" \
              --namespace "${{ github.event.repository.owner.login }}" \
              --repository "${{ github.event.repository.name }}" \
              --created-at "${{ github.event.head_commit.timestamp }}" \
              --message "${{ github.event.head_commit.message }}" \
              --wait-for-deployment
```

The `docs/museum.yaml` file from the repository the action is running on is added to the `/docs/remotes/cicd` folder. The change is made on behalf of the latest commit author and uses the most recent commit message.

The `--commit-sha`, `--commit-url`, `--namespace`, `--repository` options are used to attach the details of the push to the deployment and are also shown on the Reunite "Deployments" page.
This information is useful in case you have multiple sources for the pushes.

Whenever a `push` is performed from the default branch (`--branch "${{ github.ref_name }}"` and equals to `--default-branch "${{ github.event.repository.default_branch || github.event.repository.master_branch }}"`) - a production deployment starts automatically after a successful preview deployment.
In this case the command waits for both deployments to finish.

## Resources

- Use the [push-status command](./push-status.md) to check on an in-progress deploy.
- For use in a CI context, check out the [GitHub Action](https://redocly.com/docs/realm/setup/reference/reunite-push-action).

{% /tab %}

{% tab label="Workflows" %}

Redocly Workflows integrates with [popular version control services](https://redocly.com/docs/workflows/sources/) and uses them as the source of your API descriptions to help you automatically validate, build, and deploy API reference docs and developer portals. This approach requires you to give Redocly Workflows access to your repositories.

The Redocly CLI `push` command helps you automate API description updates without granting Redocly Workflows access to your repositories. This approach is useful when you can't or don't want to grant Redocly Workflows permissions to your repositories, or when your API descriptions are generated automatically from code annotations in a CI/CD pipeline

This method allows you to:

- Use Redocly Workflows to preview documentation and portal builds.
- Manage versions in the API registry.

Apart from uploading your API description file, the `push` command can automatically upload other files that are detected or referenced in the API description:

- The [Redocly configuration file](../configuration/index.md) and any configuration files referenced in the `extends` list.
- The `package.json` file (if it exists) from the folder where you're executing the `push` command. Redocly Workflows uses the `@redocly/cli` version specified in `package.json`.
- The HTML template and the full contents of the folder specified as the `theme.openapi.htmlTemplate` parameter in the Redocly configuration file.

{% admonition type="info" %}
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
2. Active [personal API key or organization API key](https://redocly.com/docs/settings/personal-api-keys/).

## Authentication

To authenticate to the API registry, you can use several approaches:

- Use the `login` command. In this case, the command is as follows:

  ```bash
  redocly login
  redocly push ...
  ```

  Refer to the [`login` command documentation](login.md) for more details.

- Set the `REDOCLY_AUTHORIZATION` environment variable to either your [personal API key](https://redocly.com/docs/settings/personal-api-keys/) or an organization-wide API key (configurable by organization owners in **Redocly Workflows > Settings > API keys**). In this case, the command may look as follows:

  ```bash
  REDOCLY_AUTHORIZATION=yourPersonalApiKey redocly push ...
  ```

  Treat the API keys as secrets and work with them accordingly. Consult the documentation for your CI system to learn more about handling secrets:

  - [Travis CI documentation](https://docs.travis-ci.com/user/environment-variables/)
  - [CircleCI documentation](https://circleci.com/docs/env-vars/)
  - [GitHub Actions documentation](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
  - [Jenkins documentation](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-credentials)

## Usage

```bash
redocly push
redocly push [api] [--destination] [--organization]
redocly push [-u] [--job-id id] [--batch-size number] <path/to/api-description.yaml> [--destination] [--organization] [--branch]
```

## Options

| Option           |   Type   | Description                                                                                                                                                                                                                                                      |
| ---------------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api              |  string  | The API description that you want to push to the Redocly API registry. Provide it as a path to the root API description file (or as an alias). See [set options explicitly](#set-options-explicitly) for more information.                                       |
| --batch-size     |  number  | Number of CI pushes expected within one batch. Must be used only in combination with the `--job-id` option. Must be an integer bigger than 1. See [the pushes per batch section](#determine-how-many-pushes-are-performed-per-batch) for more information.       |
| --branch, -b     |  string  | The branch where your API description is pushed or upserted. Default value is `main`.                                                                                                                                                                            |
| --destination    |  string  | The location in the API registry where you want to push or upsert your API description. Provide it in the following format: `api-name@api-version`.                                                                                                              |
| --files          | [string] | List of other folders and files to upload. See [the files section](#upload-other-folders-and-files) for more information.                                                                                                                                        |
| --help           | boolean  | Show help.                                                                                                                                                                                                                                                       |
| --job-id         |  string  | The ID of the CI job that the current push is associated with. Must be used only in combination with the `--batch-size` option. See [the job ID section](#specify-job-id) for more information.                                                                  |
| --lint-config    |  string  | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                                                               |
| --organization   |  string  | ID of organization that the API description is being pushed to. Overrides the one defined in the configuration file.                                                                                                                                             |
| --public         | boolean  | Make API descriptions publicly accessible from the API Registry. Read more about [using the public option](#make-api-descriptions-publicly-accessible).                                                                                                          |
| --region,-r      |  string  | Specify which region to use when logging in. Supported values: `us`, `eu`. The `eu` region is limited to enterprise customers. Default value is `us`. Alternatively, set an environment variable `REDOCLY_DOMAIN` with the value of the appropriate Redocly API. |
| --skip-decorator | [string] | Ignore one or more decorators. See [the skip decorator section](#skip-decorator) for usage examples.                                                                                                                                                             |
| --upsert, -u     | boolean  | Create a new version of an API when pushing to the API registry if the version doesn't exist. See [the upsert an API with push section](#upsert-an-api-with-push) for more information.                                                                          |
| --version        | boolean  | Show version number.                                                                                                                                                                                                                                             |

## Examples

The command behaves differently depending on the options you pass to it, and whether the configuration file exists in your working directory.

You can choose any of the following approaches:

- [Specify all options explicitly in the command](#set-options-explicitly)
- [Set options in the Redocly configuration file](#set-options-in-the-configuration-file)

### Specify destination

To properly push your API description to the Redocly API registry, you need the following information:

- [Organization ID](#organization-id)
- [API name and version](#api-name-and-version)

#### Organization ID

The `push` command uses the following order of precedence:

1. First, it takes the organization ID from command-line arguments (if provided).
1. If the organization ID is not provided explicitly, it takes it from the configuration file.

To find your organization ID required for the command:

1. Log into Workflows.
1. Access the **API registry** page.
1. In your browser's address bar, find the URL of this page.
1. Inspect the segment after `app.redocly.com/org/`. This part is your organization ID.

For example, if the URL is `app.redocly.com/org/test_docs`, the organization ID is `test_docs`. When using the `push` command, you would provide this ID as `--organization=test_docs`.

Note that the organization ID can differ from the organization name. Owners can change the organization name at any time in the Workflows **Settings** page, but the organization ID cannot be changed.

#### API name and version

{% admonition type="info" %}
The name and version of your API should contain only supported characters (`a-z`, `A-Z`, `0-9`, `-`, `.`). Using a restricted character results in an error, and your API doesn't get created.
{% /admonition %}

To find your API name required for the command:

1. Log into Workflows.
1. Access the **API registry** page.
1. Check the list of APIs displayed on this page.
1. Inspect the title of each list item to the left of the **New version** and **Edit API** action buttons. This title is an API name.

To find your API version required for the command:

1. Log into Workflows.
1. Access the **API registry** page.
1. Check the list of APIs displayed on this page.
1. The version is displayed in the title after the `@` in format `<name> @ <version>`.

When using the `push` command, you would provide the API name and version in the format `api-name@api-version`. For example: `--destination=petstore-api@v1`.

### Set options explicitly

Provide the `api` as a path to the root API description file, and specify the organization ID, API name, and API version.

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

Here's an example configuration file:

```yaml
organization: organization-id
apis:
  api-name@api-version:
    root: path/to/root/api-description.yaml
  another-api:
    root: openapi/openapi.yaml
```

With a configuration file like this, you can use any of the following approaches:

- Push all configured APIs

```bash
redocly push
```

Push every API listed in the `apis` section of the configuration file. You must specify your Workflows organization ID in the configuration file for this approach to work. APIs without an explicitly defined version are automatically pushed to `@latest`.

- Push specified API and version

```bash
redocly push --destination=api-name@api-version
```

Push the specified API and version from the `apis` section of the configuration file.
You must specify your organization ID in the configuration file for this approach to work.

- Push specified API and version with organization ID

```bash
redocly push --destination=api-name@api-version --organization=organization-id
```

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

To upsert the API description to a particular branch, specify the branch name with the `--branch` or `-b` option.
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

### Specify job ID

The `--job-id` option can be used by Redocly Workflows to associate multiple pushes with a single CI job.

Below are possible use cases for the `--job-id` option:

- CI/CD systems: group pushes from a single CI job together so that each push does not trigger separate reference docs/portals rebuild.
- External systems: a parameter that can be used in reports, metrics, or analytics to refer to a specific application service state.

Must be used only in combination with the `--batch-size` option.

### Determine how many pushes are performed per batch

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

### Make API descriptions publicly accessible

The `--public` option allows you to upload your API description and make it publicly accessible from the API Registry. By default, API descriptions uploaded with the `push` command are not available to the public.
For more information on how to configure access to your APIs, check the [registry access](https://redocly.com/docs/api-registry/settings/manage-access/#set-up-access-to-api-registry) section.

```bash
redocly push openapi/petstore.yaml --destination=petstore-api@v1 --organization=openapi-org --public
```

### Upload other folders and files

The `--files` option allows you to upload other folders and files.

```bash
redocly push openapi/petstore.yaml --destination=petstore-api@v1 --organization=openapi-org --files ./path/to/folder
```

You can also add files and folders by providing them in the `redocly.yaml` configuration file:

```yaml
apis:
  main:
    root: ./openapi.yam;
files:
  - ./path/to/folder
  - ./path/to/another-folder/file.md
  - ./file.md
```

Note that the `--files` option has higher priority than the `redocly.yaml` configuration file.

### Set up CI from Redocly Workflows

The Redocly Workflows interface can help you get started with the `push` command.

1. In **API registry**, select **Add API**.
1. In the **Definition name** step, provide a name for your new API description.
1. In the **Choose source** step, select **Upload from CI/CD**. This generates syntax for the `push` command that you can copy and use to upload a new API description file. Or use the [`redocly push -u` command](#upsert-an-api-with-push) directly from the command-line interface.

{% /tab %}

{% /tabs %}
