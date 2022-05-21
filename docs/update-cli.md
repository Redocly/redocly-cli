# Update Redocly CLI

If you've already installed Redocly CLI, you'll want to keep it as up to date as possible. Staying on top of versions ensures that you get the latest functionality and bug fixes. Depending on how you originally installed Redocly CLI, there are two ways to update it.

## How to update a project-level installation

If you installed Redocly CLI in your project's npm dependencies follow these steps:

1. Navigate to your project root directory and open `package.json` in any text editor.
2. Find the line that contains `"@redocly/cli":` followed by the version number.
3. Change the version number to the latest one in the [Changelog](./changelog.md).
4. Save the changes then close `package.json`.
5. Run `npm install` from the project root directory on the command line.
6. Commit the changed `package.json` and `package-lock.json` files to your Git repository.
7. Check the project-level installation by running this command from the project root directory: `npx redocly --version`.

## How to update a global installation

If you [installed Redocly CLI globally](./installation.md), run this command:

```shell Command
npm i -g @redocly/cli@latest
```

You can check your version by running `redocly --version`.