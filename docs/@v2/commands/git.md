# `git`

Use the `git` commands to work with a Redocly-hosted Reunite project as an ordinary git repository.
Clone it, commit locally with any tools you like, and push your branch back.

`redocly git clone` saves Redocly CLI as the [git credential helper](https://git-scm.com/docs/gitcredentials) for Reunite in the new repository.
After that, plain `git`, your editor, and AI coding agents push and pull with your Redocly login.
No token is written to the repository or to your git configuration: git asks Redocly CLI for the credential when it needs one.

{% admonition type="info" name="Redocly-hosted projects only" %}
These commands work with projects whose content Reunite hosts.
Projects connected to GitHub, GitLab, Bitbucket, or Azure DevOps keep using that provider.
{% /admonition %}

## Before you begin

Have the following ready:

- [Redocly CLI](../installation.md) installed globally, so that git can run the `redocly` command, and `git` installed.
- A user account in the Reunite organization, with access to the project.
- A login: run [`redocly login`](./login.md), or set the `REDOCLY_AUTHORIZATION` environment variable to an organization [API key](https://redocly.com/docs/realm/reunite/organization/api-keys) with the RBAC permission model.
  API keys with granular permissions can't be used with Git.

## Command usage

```bash
redocly git clone <organization>/<project> [directory] [--residency <residency>]
redocly git push [--force] [--set-upstream] [refspec...]
redocly git pull [refspec...]
```

After `redocly git clone`, you can use `git push` and `git pull` directly.
`redocly git push` and `redocly git pull` also work in repositories cloned without Redocly CLI:
they find the Reunite remote among the repository's remotes and use the credential helper for that host for one command.

## Command options

### clone

Clones the project into `directory`, sets `origin` to the project's Reunite git URL, and saves the credential helper in the repository's git configuration.

| Option               | Type    | Description                                                                                                     |
| -------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| organization/project | string  | **REQUIRED.** Organization and project slugs or IDs, separated by a slash, for example `acme/developer-portal`. |
| directory            | string  | Directory to clone into. The default value is the project slug or ID.                                           |
| --residency, -r      | string  | Residency of the application. The supported values are: `us`, `eu`, or a full URL. The default value is `us`.   |
| --config             | string  | Specify the path to the [configuration file](../configuration/index.md).                                        |
| --help               | boolean | Display help.                                                                                                   |

### push

Runs `git push` in the current repository with the credential helper.

| Option             | Type     | Description                                                              |
| ------------------ | -------- | ------------------------------------------------------------------------ |
| refspec            | [string] | Remote and refspec passed to `git push`, for example `origin my-branch`. |
| --force, -f        | boolean  | Force the push.                                                          |
| --set-upstream, -u | boolean  | Set the upstream of the pushed branch.                                   |
| --config           | string   | Specify the path to the [configuration file](../configuration/index.md). |
| --help             | boolean  | Display help.                                                            |

### pull

Runs `git pull` in the current repository with the credential helper.

| Option   | Type     | Description                                                              |
| -------- | -------- | ------------------------------------------------------------------------ |
| refspec  | [string] | Remote and refspec passed to `git pull`, for example `origin main`.      |
| --config | string   | Specify the path to the [configuration file](../configuration/index.md). |
| --help   | boolean  | Display help.                                                            |

## Credential helper

`redocly git clone` adds these lines to the `.git/config` file of the new repository:

```ini
[credential "https://app.cloud.redocly.com/"]
	helper =
	helper = !REDOCLY_SUPPRESS_UPDATE_NOTICE=true redocly git credential
```

The empty `helper` line turns off other credential helpers, such as the system keychain, for the Reunite host only.
Git then runs `redocly git credential` when Reunite asks for a login.
The helper answers with the API key from `REDOCLY_AUTHORIZATION` when it is set, or with your `redocly login` token.
It never stores credentials.
If you are not logged in, git stops and the helper tells you which `redocly login` command to run.

If the `redocly` command is not on your `PATH` during the clone, the helper runs the same Redocly CLI version with `npx` instead, which is slower.

## Permissions

Reunite applies your project role to every git request:

- Cloning and pulling need read access to every file in the project.
  If your access is limited to some files, use the Reunite editor instead.
- Pushing needs permission to commit, write access to every file in the project, and an active subscription.
- Nobody can push to the default branch, also with an API key.
  Push a branch and open a pull request in Reunite.
- Creating and deleting branches need the matching branch permissions. The default branch can't be deleted.

When a push is not allowed, git reports each ref as rejected and shows the reason:

```text
 ! [remote rejected] main -> main (the default branch can't be pushed to; push another branch and open a pull request in Reunite)
```

## Examples

### Clone, change, and push a branch

```bash
redocly login
redocly git clone acme/developer-portal
cd developer-portal
git switch -c update-quickstart
# edit files, then commit
git commit -am "Update the quickstart"
git push --set-upstream origin update-quickstart
```

Open a pull request for the branch in Reunite to review and publish the change.

### Push from CI

Set `REDOCLY_AUTHORIZATION` to an API key to clone, pull, and push without an interactive login:

```bash
export REDOCLY_AUTHORIZATION=<api-key>
redocly git clone acme/developer-portal
```

## Resources

- [`login`](./login.md) command
- [`push`](./push.md) command, which uploads files from another repository to a Reunite project
