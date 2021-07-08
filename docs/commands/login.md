# `login`

Use the `login` command to authenticate to the API registry. You must [generate a personal API key](../../workflows/personal-api-keys.md) first.

When you log in, the `preview-docs` command will start a preview server using Redocly API reference docs with all of the premium features.

Also, you will be able to access your members-only (private) API definitions in the Redocly registry, and use the `push` command.

If you're having issues with the `login` command, use the `--verbose` option to display a detailed error trace (if any):

```bash
openapi login --verbose
```
