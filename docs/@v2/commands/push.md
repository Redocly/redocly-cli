# `push`

Use the push command with the Reunite family of products.

This command is used to push files from another location to a Reunite project.

{% admonition type="warning" name="The content is overwritten" %}
The content of the destination folder (in other words the `--mount-path`) is overwritten every time changes are detected in comparison to the current content.
{% /admonition %}

## Before you begin

Have the following values ready to use with the `push` command:

- A user account in a [Reunite project](https://auth.cloud.redocly.com/).
- An active organization [API key](https://redocly.com/docs/realm/setup/how-to/api-keys).
- [Redocly CLI](../installation.md) installed.

Use the `REDOCLY_AUTHORIZATION` environment variable to set the API key.
See the [Manage API keys](https://redocly.com/docs/realm/setup/how-to/api-keys) page in the documentation for details on how to get your API key in Reunite.

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
| --mount-path, -mp     |  string  | **REQUIRED.** The path where the files are mounted in the project. Cannot be empty or identical to the project path.                                                                   |
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
npx @redocly/cli push docs/museum.yaml \
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

The `docs/museum.yaml` file from the repository the action is running on is added to the `/docs/remotes/cicd` folder.
The change is made on behalf of the latest commit author and uses the most recent commit message.

The `--commit-sha`, `--commit-url`, `--namespace`, `--repository` options are used to attach the details of the push to the deployment and are also shown on the Reunite "Deployments" page.
This information is useful in case you have multiple sources for the pushes.

Whenever a `push` is performed from the default branch (`--branch "${{ github.ref_name }}"` and equals to `--default-branch "${{ github.event.repository.default_branch || github.event.repository.master_branch }}"`) - a production deployment starts automatically after a successful preview deployment.
In this case the command waits for both deployments to finish.

## Resources

- Use the [push-status command](./push-status.md) to check on an in-progress deploy.
- For use in a CI context, check out the [GitHub Action](https://redocly.com/docs/realm/setup/reference/reunite-push-action).
