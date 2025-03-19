# jest-to-vitest migration guide

### jest.fn

1. Replace `jest.fn()` with `vi.fn()`

### jest.SpyInstance

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
