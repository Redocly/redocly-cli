# `push`

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

To authenticate to the API registry, you can use the `REDOCLY_AUTHORIZATION` environment variable. It can be set to either your [personal API key](../../settings/personal-api-keys.md) or to an organization-wide API key (configurable by organization owners in **Redocly Workflows > Org settings > API keys**).

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
