# `push-status`

This command is used with Reunite products only.
It provides details about files, deployments, and API scorecards, using `<pushId>` returned by an earlier `push` command.

The `push-status` command can be used whenever the application or process executing a `push` command (without `--wait-for-deployment` option) returns the `pushId`.
This identifier can be used by subsequent systems to perform custom logic when the deployment is completed.

## Prerequisites

Have the following values ready to use with the `push-status` command.

1. A user account in a [Reunite project](https://auth.cloud.redocly.com/).
1. An active organization [API key](https://redocly.com/docs/realm/setup/how-to/api-keys)
1. [Redocly CLI](../installation.md) v1.10.x or later.

## Authentication

Use the `REDOCLY_AUTHORIZATION` environment variable to set the API key. See [Manage API keys](https://redocly.com/docs/realm/setup/how-to/api-keys) page for details.

## Usage

```bash
REDOCLY_AUTHORIZATION=<api-key> redocly push-status <pushId> --organization <orgSlug> --project <projectSlug> [--wait] [--max-execution-time <timeInSeconds>]
```

## Options

| Option               | Type    | Required | Default value                                                  | Description                                                                                                   |
| -------------------- | ------- | -------- |----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| pushId               | string  | true     | -                                                              | Identifier of the push whose state should be displayed. Returned as result of the [`push`](./push.md) command. |
| --organization, -o   | string  | true     | -                                                              | [Organization slug](#where-to-find-the-redocly-organization-or-project-slugs).                                 |
| --project, -p        | string  | true     | -                                                              | [Project slug](#where-to-find-the-redocly-organization-or-project-slugs).                                      |
| --domain, -d         | string  | false    | [https://app.cloud.redocly.com](https://app.cloud.redocly.com) | The domain that the `push` command pushed to.                                                                  |
| --wait               | boolean | false    | false                                                          | Waits until the build is completed if it is in progress.                                                       |
| --max-execution-time | number  | false    | 600                                                            | Maximum wait time for build completion in seconds (used in conjunction with the `--wait` option).              |

### Where to find the Redocly organization or project slugs

{% partial file="../../../_partials/get-organization-and-project-slugs.md" /%}

## Examples

### Get the build status of a specific push

The following command prints the status of preview and production build as well as scorecards if they exist for the push with the ID `push_01hkw0p0wg348n3gtxmv8rt6hy` in the `redocly` organization and `awesome-api-docs` project.

```bash
REDOCLY_AUTHORIZATION='api-key' redocly push-status push_01hkw0p0wg348n3gtxmv8rt6hy -o=redocly -p=awesome-api-docs
```

Use this command to get the status of a previous deployment.

### Get build status for a specific push and wait until it is completed

The following command checks the deployment statuses of the preview build (and subsequent production build if applicable), and waits for the builds to complete.

```bash
REDOCLY_AUTHORIZATION='api-key' redocly push-status push_01hkw0p0wg348n3gtxmv8rt6hy -o=redocly -p=awesome-api-docs --wait
```

The checks are run for the push with the ID `push_01hkw0p0wg348n3gtxmv8rt6hy` in the `redocly` organization and `awesome-api-docs` project every 5 seconds until the build is completed, and prints scorecard information. When `push` is performed from the repository's default branch, a preview build is automatically followed by a production build; this command waits for both to complete.
