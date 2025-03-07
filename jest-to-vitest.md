# jest-to-vitest migration guide

## How to use

1. Run `npx vitest run --config vitest.one-by-one.config.ts PATH_TO_TEST_FILE`
This is done as the main vitest config has a whitelist of tests to run and every new file that we migrate does not exist there.
2. Add the PATH_TO_TEST_FILE to the `migrated-suites.json` file

To run a specific suite with `jest`

```
npx jest --testPathPattern PATH_TO_TEST_FILE
```

## use-cases

### jest.fn

1. Replace `jest.fn()` with `vi.fn()`

### jest.SpyInstance;

1. The file needs to include `import { MockInstance } from 'vitest';`
2. Replace `let spy: jest.SpyInstance;` with `let spy: MockInstance;`

