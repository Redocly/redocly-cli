# openapi-core

See https://github.com/Redocly/redocly-cli

> **Important:**
> The openapi-core package exports a bunch of functions but some of them are intended for internal use only.
> Additionally, some of the function arguments are not documented below because they are not intended for public use.
> Avoid using any functions that are not documented below.
> If your use case is not documented below, please open an issue.

## Basic usage

### Lint from file system

```js
import { lint, loadConfig } from '@redocly/openapi-core';

const pathToApi = 'openapi.yaml';
const config = loadConfig({ configPath: 'optional/path/to/redocly.yaml' });
const lintResults = await lint({ ref: pathToApi, config });
```

### Bundle from file system

```js
import { bundle, loadConfig } from '@redocly/openapi-core';

const pathToApi = 'openapi.yaml';
const config = loadConfig({ configPath: 'optional/path/to/redocly.yaml' });
const { bundle, problems } = await bundle({ ref: pathToApi, config });
```

### Lint from from memory

```js
import { lintFromString, createConfig, stringifyYaml } from '@redocly/openapi-core';

const config = await createConfig(
  {
    extends: ['minimal'],
    rules: {
      'operation-description': 'error',
    },
  },
  {
    // optionally provide config path for resolving $refs and proper error locations
    configPath: 'optional/path/to/redocly.yaml',
  }
);
const source = stringifyYaml({ openapi: '3.0.1' /* ... */ }); // you can also use JSON.stringify
const lintResults = await lintFromString({
  source,
  // optionally pass path to the file for resolving $refs and proper error locations
  absoluteRef: 'optional/path/to/openapi.yaml',
  config,
});
```

### Lint from from memory with a custom rule

```js
import { lintFromString, createConfig, stringifyYaml } from '@redocly/openapi-core';

const CustomRule = (ruleOptions) => {
  return {
    Operation() {
      // some rule logic
    },
  };
};

const config = createConfig({
  extends: ['recommended'],
  plugins: [
    {
      id: 'pluginId',
      rules: {
        oas3: {
          customRule1: CustomRule,
        },
        oas2: {
          customRule1: CustomRule, // if the same rule can handle both oas3 and oas2
        },
      },
      decorators: {
        // ...
      },
    },
  ],
  // enable rule
  rules: {
    'pluginId/customRule1': 'error',
  },
  decorators: {
    // ...
  },
});

const source = stringifyYaml({ openapi: '3.0.1' /* ... */ }); // you can also use JSON.stringify
const lintResults = await lintFromString({
  source,
  // optionally pass path to the file for resolving $refs and proper error locations
  absoluteRef: 'optional/path/to/openapi.yaml',
  config,
});
```

### Bundle from memory

```js
import { bundleFromString, createConfig } from '@redocly/openapi-core';

const config = await createConfig({}); // create empty config
const source = stringifyYaml({ openapi: '3.0.1' /* ... */ }); // you can also use JSON.stringify
const { bundle, problems } = await bundleFromString({
  source,
  // optionally pass path to the file for resolving $refs and proper error locations
  absoluteRef: 'optional/path/to/openapi.yaml',
  config,
});
```

## API

### `createConfig`

Creates a config object from a JSON or YAML string or JS object.
Resolves remote config from `extends` (if there are URLs or local fs paths).

```ts
async function createConfig(
  // JSON or YAML string or object with Redocly config
  config: string | RawUniversalConfig,
  options?: {
    // optional path to the config file for resolving $refs and proper error locations
    configPath?: string;
  }
): Promise<Config>;
```

### `loadConfig`

Loads a config object from a file system. If `configPath` is not provided,
it will try to find `redocly.yaml` in the current working directory.

```ts
async function loadConfig(options?: {
  // optional path to the config file for resolving $refs and proper error locations
  configPath?: string;
  // allows to add custom `extends` additionally to one from the config file
  customExtends?: string[];
}): Promise<Config>;
```

### `lint`

Lint an OpenAPI document from the file system.

```ts
async function lint(options: {
  // path to the OpenAPI document root
  ref: string;
  // config object
  config: Config;
}): Promise<NormalizedProblem[]>;
```

### `lintFromString`

Lint an OpenAPI document from the string.

```ts
async function lintFromString(options: {
  // OpenAPI document string
  source: string;
  // optional path to the OpenAPI document for resolving $refs and proper error locations
  absoluteRef?: string;
  // config object
  config: Config;
}): Promise<NormalizedProblem[]>;
```

### `bundle`

Bundle an OpenAPI document from the file system.

```ts
async function bundle(options: {
  // path to the OpenAPI document root
  ref: string;
  // config object
  config: Config;
  // whether to fully dereference $refs, resulting document won't have any $ref
  // warning: this can produce circular objects
  dereference?: boolean;
  // whether to remove unused components (schemas, parameters, responses, etc)
  removeUnusedComponents?: boolean;
  // whether to keep $ref pointers to the http URLs and resolve only local fs $refs
  keepUrlRefs?: boolean;
}): Promise<{
    bundle: {
      parsed: object; // OpenAPI document object as js object
    };
    problems: NormalizedProblem[]
    fileDependencies
    rootType
    refTypes
    visitorsData

  }>;
```

### `bundleFromString`

Bundle an OpenAPI document from the string.

```ts
async function bundleFromString(options: {
  // OpenAPI document string
  source: string;
  // optional path to the OpenAPI document for resolving $refs and proper error locations
  absoluteRef?: string;
  // config object
  config: Config;
  // whether to fully dereference $refs, resulting document won't have any $ref
  // warning: this can produce circular objects
  dereference?: boolean;
  // whether to remove unused components (schemas, parameters, responses, etc)
  removeUnusedComponents?: boolean;
  // whether to keep $ref pointers to the http URLs and resolve only local fs $refs
  keepUrlRefs?: boolean;
}): Promise<{
    bundle: {
      parsed: object; // OpenAPI document object as js object
    };
    problems: NormalizedProblem[]
    fileDependencies
    rootType
    refTypes
    visitorsData

  }>;
```

### `stringifyYaml`

Helper function to stringify a javascript object to YAML.

```ts
function stringifyYaml(obj: object): string;
```