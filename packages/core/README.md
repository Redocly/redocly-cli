# openapi-core

See https://github.com/Redocly/redocly-cli

## Basic usage

### Lint

```js
import { formatProblems, lint, loadConfig } from '@redocly/openapi-core';

const pathToApi = 'openapi.yaml';
const config = loadConfig({ configPath: 'optional/path/to/.redocly.yaml' });
const lintResults = await lint({ ref: pathToApi, config });
```

### Bundle

```js
import { formatProblems, bundle, loadConfig } from '@redocly/openapi-core';

const pathToApi = 'openapi.yaml';
const config = loadConfig({ configPath: 'optional/path/to/.redocly.yaml' });
const { bundle, problems } = await bundle({ ref: pathToApi, config });
```
