// In Node.js, the logger writes to these two streams. This keeps the test output clean.
// A test can still assert on a call, for example `expect(process.stderr.write).toHaveBeenCalledWith(...)`.
// Vitest restores all spies before each test, so `beforeEach` spies again for each test.
// `beforeAll` covers the setup hooks, where the client generator tests generate their clients.
function silenceOutput() {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
}

beforeAll(silenceOutput);
beforeEach(silenceOutput);
