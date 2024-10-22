import fs from 'node:fs';

const content = fs.readFileSync('benchmark_check.json', 'utf8');
const json = JSON.parse(content);
const arr = json.results.map((r) => [
  r.command.replace(/^node node_modules\/([^/]+)\/.*/, (_, cliVersion) => cliVersion),
  r.mean,
]);
const min = Math.min(...arr.map(([_, mean]) => mean));
const max = Math.max(...arr.map(([_, mean]) => mean));

const constructBarForChart = (x) => {
  const length = Math.floor(x * 30);
  return '▓' + '▓'.repeat(length);
};

const output = [
  '| CLI Version | Performance benchmark (test duration diff) |',
  '|---|---|',
  ...arr.map(
    ([cliVersion, mean]) =>
      `| ${cliVersion} | ${constructBarForChart((mean - min) / (max - min))} |`
  ),
].join('\n');

process.stdout.write(output);
