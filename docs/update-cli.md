# Update OpenAPI CLI

If you've already installed OpenAPI CLI, you'll want to keep it as up to date as possible. Staying on top of versions ensures that you get the latest functionality and bug fixes. Depending on how you originally installed OpenAPI CLI, there are two ways to update it.

:::success Tip
Before you begin, ensure that you have the latest version of npm installed.
:::

## How to update your openapi-starter installation

If you installed OpenAPI CLI using the [openapi-starter template](https://github.com/Redocly/openapi-starter) follow these steps:

1. Navigate to and open `package.json` in any text editor.
2. Find the line that contains `"@redocly/cli":` followed by the version number.
3. Change the version number to the latest one in the [Changelog](./changelog.md).
4. Save the changes then close `package.json`.
5. Run `npm install` from the project's root directory on the command line.
6. Commit the changed `package.json` and `package-lock.json` files to your Git repository.

## How to update your global installation

If you [installed OpenAPI CLI globally](./docs/installation.md), run this command:

```shell Command
npm i -g @redocly/cli@latest
```

You can check your version by running `redocly --version`.