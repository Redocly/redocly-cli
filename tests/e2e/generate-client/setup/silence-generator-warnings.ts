import { logger } from '@redocly/openapi-core';

// The tests call `generateClient` in process, and the generator reports expected notes, such
// as a renamed schema, through `logger.warn`. This hides them, so the test output stays clean.
// A test can still assert on a note with `expect(logger.warn).toHaveBeenCalledWith(...)`.
function silenceGeneratorWarnings(): void {
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
}

// Vitest restores every spy before each test, so the hook spies again for each test.
// The call at load time also covers `beforeAll` hooks, which run before the first test.
silenceGeneratorWarnings();
beforeEach(silenceGeneratorWarnings);
