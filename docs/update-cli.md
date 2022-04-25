# Update OpenAPI CLI

If you've already installed OpenAPI CLI, you'll want to keep it as up to date as possible. Staying on top of versions ensures that you get the latest functionalities and bug fixes.

:::success Tip
Ensure you have the latest version of npm before you begin.
:::

Navigate to your local `openapi-starter` folder and open `package.json` in any text editor.

Find the line that contains `"@redocly/openapi-cli":` followed by the version number. Change the version number to the latest one in the Changelog, save the changes and close `package.json`.

To install the latest OpenAPI CLI version, run this command in the root of your local `openapi-starter` folder:

```shell Command
npm i -g @redocly/openapi-cli@latest
```

Check your version by running any command with the `--version` option, such as `openapi bundle --version` or `openapi lint --version`.