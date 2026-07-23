# Validate Markdown descriptions

Authors:

- [`@lornajane`](https://github.com/lornajane) Lorna Mitchell (Redocly)

## What this does and why

Writing Markdown within YAML/JSON can be awkward, and our usual Markdown tooling may not be available. This plugin adds a rule that uses a third-party Markdown validator library, the excellent [markdownlint](https://github.com/DavidAnson/markdownlint), to pick the `description` fields from your OpenAPI description, and make sure it's valid. This can really help to catch typos and formatting problems, especially in longer descriptions or large APIs.

By using an existing library, we get all the power and configurability of this specialist tool, and so you can edit and adapt this plugin to meet your own Markdown preferences.

## Code

This rule is built on the `markdownlint` library, so we need a `package.json` file to specify the dependency:

```json
{
  "name": "redocly-openapi-markdown-plugin",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "main": "openapi-markdown.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "MIT",
  "dependencies": {
    "markdownlint": "^0.31.1"
  }
}
```

Make sure to install the dependency using your favorite package manager. For example I use `npm` so my installation command is:

```sh
npm install
```

The entry point for the plugin code is in `openapi-markdown.js`:

```js
import ValidateMarkdown from './rule-validate-markdown.js';

export default function plugin() {
  return {
    id: 'openapi-markdown',
    rules: {
      oas3: {
        validate: ValidateMarkdown,
      },
    },
  };
}
```

The rule itself is in `rule-validate-markdown.js`:

```js
import markdownlint from 'markdownlint';

const config = {
  // the list is here https://github.com/DavidAnson/markdownlint#rules--aliases
  MD013: { line_length: 120 },
  MD041: false, // first line should be h1
  MD047: false, // should end with newline
};

function checkString(description, ctx) {
  let options = {
    strings: {
      desc: description,
    },
    config: config,
  };

  try {
    const lintResults = markdownlint.sync(options);

    if (lintResults.desc.length) {
      // desc is the key in the options.strings object
      let lines = description.split('\n');

      for (const desc of lintResults.desc) {
        // grab error message
        let message = desc.ruleDescription;
        // add line number context for longer entries
        if (desc.lineNumber > 1) {
          // computer counts from zero, humans count from 1
          const charsByError = lines[desc.lineNumber - 1].substring(0, 20);
          message = `${message} (near: ${charsByError} ...)`;
        }

        ctx.report({
          message: message,
          location: ctx.location.child('description'),
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
}

export default function ValidateMarkdown() {
  console.log('OpenAPI Markdown: validate');
  return {
    Info: {
      enter({ description }, ctx) {
        if (description) {
          return checkString(description, ctx);
        }
      },
    },
    Tag: {
      enter({ description }, ctx) {
        if (description) {
          return checkString(description, ctx);
        }
      },
    },
    Operation: {
      enter({ description }, ctx) {
        if (description) {
          return checkString(description, ctx);
        }
      },
    },
    Parameter: {
      enter({ description }, ctx) {
        if (description) {
          return checkString(description, ctx);
        }
      },
    },
  };
}
```

To control the markdown validation rules in use, edit the config at the top of the file.

Bring the plugin into your `redocly.yaml` file like this:

```yaml
plugins:
  - ./openapi-markdown.js

rules:
  openapi-markdown/validate: warn
```

When you lint your API descriptions, you'll see warnings for any invalid markdown found in the description fields.

## Examples

Given an OpenAPI description with these opening lines:

```yaml
openapi: 3.1.0
info:
  title: Redocly Cafe
  description: |-
    Demo API for cafe operators (not customers) to manage menus, orders, and revenue.


    ## Made by Redocly
    Create API credentials and try it yourself at [Redocly Cafe](https://cafe.redocly.com).
  version: 1.0.0
```

Linting (with `--format=stylish` for brevity) produces the following output:

```text
validating cafe.yaml...
OpenAPI Markdown: validate
cafe.yaml:
  4:16  warning  openapi-markdown/validate  Multiple consecutive blank lines (near:  ...)
  4:16  warning  openapi-markdown/validate  Headings should be surrounded by blank lines (near: ## Made by Redocly ...)

cafe.yaml: validated in 24ms

Woohoo! Your API description is valid. 🎉
You have 2 warnings.
```

You can configure markdownlint to pick up (or ignore) any aspects of markdown that it knows about.

## References

Built on [markdownlint](https://github.com/DavidAnson/markdownlint).
