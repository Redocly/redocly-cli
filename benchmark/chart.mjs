import fs from 'node:fs';

const content = fs.readFileSync('benchmark_check.json', 'utf8');
const json = JSON.parse(content);
const arr = json.results.map((r) => [
  r.command.replace(/^node node_modules\/([^/]+)\/.*/, (_, cliVersion) => cliVersion),
  r.mean,
]);
const min = arr.reduce(($, [_, mean]) => Math.min($, mean), Infinity);
const max = arr.reduce(($, [_, mean]) => Math.max($, mean), -Infinity);

const MAX_BAR_LENGTH = 30;

const constructBarForChart = (x) => {
  const length = Math.floor(x * MAX_BAR_LENGTH);
  return '▓' + '▓'.repeat(length) + ' '.repeat(MAX_BAR_LENGTH - length);
};

const bars = arr.map(
  ([cliVersion, mean]) => `│ ${cliVersion} │ ${constructBarForChart((mean - min) / (max - min))} │`
);

const output = [
  '           TIME CHART',
  '┌' + '─'.repeat(10) + '┬' + '─'.repeat(MAX_BAR_LENGTH + 3) + '┐',
  ...bars,
  '└' + '─'.repeat(10) + '┴' + '─'.repeat(MAX_BAR_LENGTH + 3) + '┘\n',
].join('\n');

process.stdout.write(output);
