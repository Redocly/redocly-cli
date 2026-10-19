// In Node.js, the logger writes to these two streams. This keeps the unit test output clean.
// A test can still assert on a call, for example `expect(process.stderr.write).toHaveBeenCalledWith(...)`.
// Vitest restores all spies before each test, so this hook spies again for each test.
beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});
