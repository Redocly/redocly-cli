const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function processTestCase(casePath) {
  process.stdout.write(`Running ${casePath} test case...\n`);
  const snapshotPath = path.resolve(__dirname, '../cases', casePath);

  if (!fs.existsSync(`${snapshotPath}/.redocly.yaml`)) {
    process.stdout.write('.redocly.yaml not found. Proceeding to the next test case.\n');
    return false;
  }

  const { stdout, stderr } = spawnSync('node', ['../../../dist/index.js', 'validate'], {
    cwd: snapshotPath,
    env: {
      ...process.env,
      ENABLE_DEBUG_ERROR_POINTER: true,
    },
  });

  const newSnapshot = `Stdout:\n${stdout.toString('utf-8')}\n=====\nStderr:\n${stderr.toString('utf-8')}`;
  if (!fs.existsSync(`${snapshotPath}/snapshot.txt`)) {
    process.stdout.write('Snapshot not found. Writing current result as a snapshot for future runs.\n');
    fs.writeFileSync(`${snapshotPath}/snapshot.txt`, newSnapshot, { encoding: 'utf-8' });
  }
  const snapshot = fs.readFileSync(`${snapshotPath}/snapshot.txt`, { encoding: 'utf-8' });
  if (snapshot !== newSnapshot) {
    process.stdout.write(`Snapshots mismatch for testcase ${casePath}.\n`);
    return true;
  }
  process.stdout.write('Test finished successfully\n');
  return false;
}

function main() {
  const casesDir = fs.readdirSync(path.resolve(__dirname, '../cases'));
  const failedTests = [];
  for (const test of casesDir) {
    if (processTestCase(test)) {
      failedTests.push(test);
    }
    process.stdout.write('\n');
  }
  if (!failedTests.length) {
    process.stdout.write('All tests run succesfully.\n');
    process.exit(0);
  }

  process.stdout.write(`\n\nFinished running test cases. Total failed: ${failedTests.length}.\n`);
  process.stdout.write(`Failed tests:\n- ${failedTests.join('\n -')}\n`);
  process.exit(1);
}

main();
