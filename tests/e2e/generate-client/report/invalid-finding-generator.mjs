// A custom generator that reports a bare string, so the report e2e sees the shape check fail the run.
export default {
  name: 'invalid-finding-generator',
  run({ reportFinding }) {
    reportFinding('oops');
    return [];
  },
};
