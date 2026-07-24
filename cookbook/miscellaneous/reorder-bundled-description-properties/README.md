# Reorder description properties

Authors:

- [`@tatomyr`](https://github.com/tatomyr) Andrew Tatomyr (Redocly)

## What this does and why

Sometimes you might want to enforce a specific order of properties in your OpenAPI descriptions. Especially it could be useful after bundling the description, as the order of properties might change.

## Code

For that purpose, you can write a simple `JavaScript` script code similar to the one below:

```javascript
/* reorder.js */

// Import the necessary modules
import fs from 'fs';
import { parseYaml, stringifyYaml } from '@redocly/openapi-core';

// Define the function to reorder the properties
const reorder = (root) => {
  const { components, openapi, ...rest } = root;
  return {
    // Here you can put the properties in the order you want
    components,
    ...rest,
    openapi,
  };
};

// Get the file name from the command line arguments
const fileName = process.argv[2];

// Read the file content, reorder and print the output
const content = fs.readFileSync(fileName, 'utf8');
const reordered = reorder(parseYaml(content));
process.stdout.write(stringifyYaml(reordered));
```

Please notice that `@redocly/openapi-core` has to be installed as a project dependency as it exposes the `parseYaml` and `stringifyYaml` functions.

You can tweak the properties you need to put in the desired order in the `reorder` function.

Then you can bundle the file with Redocly CLI (or just use any OpenAPI file) and then reorder the properties with the following command:

```bash
node reorder.js <path-to-the-bundled-file.yaml>
```

## Examples

Given an OpenAPI description:

```yaml
openapi: 3.1.0
paths:
  /menu:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: schema.yaml
```

which references a schema in a separate file `schema.yaml`:

```yaml
type: object
properties:
  name:
    type: string
  price:
    type: integer
```

bundling with `redocly bundle openapi.yaml -o bundled.yaml` will produce the following `bundled.yaml`:

```yaml
openapi: 3.1.0
paths:
  /menu:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/schema'
components:
  schemas:
    schema:
      type: object
      properties:
        name:
          type: string
        price:
          type: integer
```

But if we want to reorder the properties in the `bundled.yaml` file, we can run `node reorder.js bundled.yaml` which will result in the following output:

```yaml
components:
  schemas:
    schema:
      type: object
      properties:
        name:
          type: string
        price:
          type: integer
paths:
  /menu:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/schema'
openapi: 3.1.0
```
