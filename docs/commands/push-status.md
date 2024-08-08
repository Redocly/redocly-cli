# `push-status`

This command is used with Reunite products only.
It provides details about files, deployments, and API scorecards, using a `<pushId>` that is returned by an earlier `push` command.

The `push-status` command can be used whenever the application or process executing a `push` command (without `--wait-for-deployment` option) returns the `pushId`.
This identifier can be used by subsequent systems to perform custom logic when the deployment is completed.

## Prerequisites

Have the following before you use the `push-status` command:

- A user account in a [Reunite project](https://auth.cloud.redocly.com/).
- An active organization [API key](https://redocly.com/docs/realm/setup/how-to/api-keys).
- [Redocly CLI](../installation.md) v1.10.x or later.

## Authentication

Use the `REDOCLY_AUTHORIZATION` environment variable to set the API key.
See the [Manage API keys](https://redocly.com/docs/realm/setup/how-to/api-keys) page in the documentation for details on how to get your API key in Reunite.

## Usage

```bash
REDOCLY_AUTHORIZATION=<api-key> redocly push-status <pushId> --organization <orgSlug> --project <projectSlug> [--wait] [--max-execution-time <timeInSeconds>]
```

## Options

| Option               | Type    | Required | Default value                                                  | Description                                                                                                       |
| -------------------- | ------- | -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| pushId               | string  | true     | -                                                              | Identifier of the push you are tracking. Returned as result of the [`push`](./push.md) command.                   |
| --organization, -o   | string  | true     | -                                                              | [Organization slug](https://redocly.com/docs/realm/setup/how-to/git-providers/gitlab-self-managed#find-org-slug). |
| --project, -p        | string  | true     | -                                                              | [Project slug](https://redocly.com/docs/realm/setup/how-to/git-providers/gitlab-self-managed#find-org-slug).      |
| --domain, -d         | string  | false    | [https://app.cloud.redocly.com](https://app.cloud.redocly.com) | The domain that the `push` command pushed to.                                                                     |
| --wait               | boolean | false    | false                                                          | Waits until the build is completed if it is in progress.                                                          |
| --max-execution-time | number  | false    | 600                                                            | Maximum wait time for build completion in seconds (used in conjunction with the `--wait` option).                 |

## Examples

When `push` is performed from the repository's default branch, a preview build is automatically followed by a production build; this command can send only the completed builds or wait for uncompleted builds to complete.

### Get the build status of a specific push

The following example command prints the status of completed preview and production builds as well as scorecards if they exist for the push with the ID `push_01hkw0p0wg348n3gtxmv8rt6hy` in the `redocly` organization and `awesome-api-docs` project:

```bash
REDOCLY_AUTHORIZATION='api-key' redocly push-status push_01hkw0p0wg348n3gtxmv8rt6hy -o=redocly -p=awesome-api-docs
```

If there are preview or production builds that haven't completed yet for the push ID, they are not included in the output of this command.

### Get build status for a specific push and wait until it is completed

You can configure the `push-status` command to check the deployment statuses of the preview build (and subsequent production build if applicable), and if the builds are not complete, check every 5 seconds until the builds are complete.

The following example command prints the status for the preview and production builds as well as scorecards if they exist for the push with the ID `push_01hkw0p0wg348n3gtxmv8rt6hy` in the `redocly` organization and `awesome-api-docs` project:

```bash
REDOCLY_AUTHORIZATION='api-key' redocly push-status push_01hkw0p0wg348n3gtxmv8rt6hy -o=redocly -p=awesome-api-docs --wait
```
