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

### vi.spyOn

1. When spying on `path`, needed to use this hack (doesn't work without shallow copying):

```js
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual };
});
```

### vi.mocked

1. Replace this:

```js
existsSync as jest.Mock<any, any>
```

with this:

```js
vi.mocked(existsSync)
```

This passes the actual types down to the mocked function and helps maintain consistency.
