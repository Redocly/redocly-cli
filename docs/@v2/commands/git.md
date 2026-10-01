# `git`

Use the `git` commands to work with a Redocly-hosted Reunite project as an ordinary git repository.
Clone it, commit locally with any tools you like, and push your branch back.

The commands run your local `git` and send your Redocly credentials with each request to Reunite.
No token is written to the repository or to your git configuration.

{% admonition type="info" name="Redocly-hosted projects only" %}
These commands work with projects whose content Reunite hosts.
Projects connected to GitHub, GitLab, Bitbucket, or Azure DevOps keep using that provider.
{% /admonition %}

## Before you begin

Have the following ready:

- [Redocly CLI](../installation.md) and `git` 2.31 or later installed.
- A user account in the Reunite organization, with access to the project.
- A login: run [`redocly login`](./login.md), or set the `REDOCLY_AUTHORIZATION` environment variable to an organization [API key](https://redocly.com/docs/realm/reunite/organization/api-keys) with the RBAC permission model.
  API keys with granular permissions can't be used with Git.

## Command usage

```bash
redocly git clone --organization <organization> --project <project> [directory] [--residency <residency>]
redocly git push [--force] [--set-upstream] [refspec...]
redocly git pull [refspec...]
```

Run `push` and `pull` inside a repository created with `redocly git clone`.
They find the Reunite remote among the repository's remotes and send your Redocly credentials only to that host.

## Command options

### clone

Clones the project into `directory` and sets `origin` to the project's Reunite git URL.

| Option             | Type    | Description                                                                                                   |
| ------------------ | ------- | ------------------------------------------------------------------------------------------------------------- |
| directory          | string  | Directory to clone into. The default value is the `--project` value.                                          |
| --organization, -o | string  | **REQUIRED.** Organization slug or ID.                                                                        |
| --project, -p      | string  | **REQUIRED.** Project slug or ID.                                                                             |
| --residency, -r    | string  | Residency of the application. The supported values are: `us`, `eu`, or a full URL. The default value is `us`. |
| --config           | string  | Specify the path to the [configuration file](../configuration/index.md).                                      |
| --help             | boolean | Display help.                                                                                                 |

### push

Runs `git push` in the current repository with your Redocly credentials.

| Option             | Type     | Description                                                              |
| ------------------ | -------- | ------------------------------------------------------------------------ |
| refspec            | [string] | Remote and refspec passed to `git push`, for example `origin my-branch`. |
| --force, -f        | boolean  | Force the push.                                                          |
| --set-upstream, -u | boolean  | Set the upstream of the pushed branch.                                   |
| --config           | string   | Specify the path to the [configuration file](../configuration/index.md). |
| --help             | boolean  | Display help.                                                            |

### pull

Runs `git pull` in the current repository with your Redocly credentials.

| Option   | Type     | Description                                                              |
| -------- | -------- | ------------------------------------------------------------------------ |
| refspec  | [string] | Remote and refspec passed to `git pull`, for example `origin main`.      |
| --config | string   | Specify the path to the [configuration file](../configuration/index.md). |
| --help   | boolean  | Display help.                                                            |

## Permissions

Reunite applies your project role to every git request:

- Cloning and pulling need read access to every file in the project.
  If your access is limited to some files, use the Reunite editor instead.
- Pushing needs permission to commit, write access to every file in the project, and an active subscription.
- Pushing to the default branch needs the permission to edit it, which the project **Admin** role has.
  With other roles, push a branch and open a pull request in Reunite.
- Creating and deleting branches need the matching branch permissions. The default branch can't be deleted.

When a push is not allowed, git reports each ref as rejected and shows the reason:

```text
 ! [remote rejected] main -> main (you don't have permission to push to the default branch; push another branch and open a pull request)
```

## Examples

### Clone, change, and push a branch

```bash
redocly login
redocly git clone -o acme -p developer-portal
cd developer-portal
git switch -c update-quickstart
# edit files, then commit
git commit -am "Update the quickstart"
redocly git push --set-upstream origin update-quickstart
```

Open a pull request for the branch in Reunite to review and publish the change.

### Push from CI

Set `REDOCLY_AUTHORIZATION` to an API key to run the commands without an interactive login:

```bash
export REDOCLY_AUTHORIZATION=<api-key>
redocly git clone -o acme -p developer-portal
```

## Resources

- [`login`](./login.md) command
- [`push`](./push.md) command, which uploads files from another repository to a Reunite project
