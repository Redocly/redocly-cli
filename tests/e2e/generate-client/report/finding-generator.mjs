// A custom generator loaded by path specifier in the report e2e. It reports one finding through
// its input, so the test sees whether a finding of a custom generator gets into the report, and
// that the report keeps only the documented keys of the finding.
export default {
  name: 'finding-generator',
  run({ reportFinding }) {
    reportFinding({
      kind: 'operation-skipped',
      message: 'finding-generator skipped listMenuItems.',
      operations: ['listMenuItems'],
      severity: 'error',
    });
    return [];
  },
};
