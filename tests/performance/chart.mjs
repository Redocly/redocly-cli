import fs from 'node:fs';

const content = fs.readFileSync('benchmark_check.json', 'utf8');
const json = JSON.parse(content);
const arr = json.results.map((r) => [
  r.command.replace(/^node node_modules\/([^/]+)\/.*/, (_, cliVersion) => cliVersion),
  r.mean,
  r.stddev,
]);
const minMean = Math.min(...arr.map(([_, mean]) => mean));

const constructBarForChart = (mean, min) => {
  if (min <= 0) return 'N/A';
  const slownessRatio = mean / min;
  const slownessFactor = slownessRatio - 1;
  const maxBarLength = 30;
  const visualFactor = Math.min(1, slownessFactor);
  const length = Math.floor(visualFactor * maxBarLength);
  return '▓' + '▓'.repeat(length);
};

const output = [
  '| CLI Version | Mean Time ± Std Dev (s) | Relative Performance (Lower is Faster) |',
  '|---|---|---|',
  ...arr.map(([cliVersion, mean, stddev]) => {
    const bar = constructBarForChart(mean, minMean);
    const meanFormatted = mean.toFixed(3);
    const stddevFormatted = stddev.toFixed(3);
    const relativeSpeedFactor = (mean / minMean).toFixed(2);
    const factorSuffix = mean === minMean ? 'x (Fastest)' : 'x';

    const timeWithStddev = `${meanFormatted}s ± ${stddevFormatted}s`;
    const performanceDisplay = `${bar} ${relativeSpeedFactor}${factorSuffix}`;

    return `| ${cliVersion} | ${timeWithStddev} | ${performanceDisplay} |`;
  }),
].join('\n');

process.stdout.write(output);
