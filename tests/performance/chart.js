import fs from 'node:fs';

const content = fs.readFileSync('benchmark_check.json', 'utf8');
const json = JSON.parse(content);

/** Returns the median of a numeric array without mutating the input. */
const median = (xs) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Median absolute deviation around a given centre — a robust alternative to stddev. */
const medianAbsoluteDeviation = (xs, centre) => median(xs.map((x) => Math.abs(x - centre)));

const arr = json.results.map((r) => [
  r.command.replace(/^node node_modules\/([^/]+)\/.*/, (_, cliVersion) => cliVersion),
  r.median,
  medianAbsoluteDeviation(r.times, r.median),
]);
const minMedian = Math.min(...arr.map(([_, m]) => m));

/** Builds a unicode bar whose length scales with how much slower a result is than the fastest. */
const constructBarForChart = (value, min) => {
  if (min <= 0) return 'N/A';
  const slownessRatio = value / min;
  const slownessFactor = slownessRatio - 1;
  const maxBarLength = 30;
  const visualFactor = Math.min(1, slownessFactor);
  const length = Math.floor(visualFactor * maxBarLength);
  return '▓' + '▓'.repeat(length);
};

const output = [
  '| CLI Version | Median Time ± MAD (s) | Relative Performance (Lower is Faster) |',
  '|---|---|---|',
  ...arr.map(([cliVersion, medianValue, madValue]) => {
    const bar = constructBarForChart(medianValue, minMedian);
    const medianFormatted = medianValue.toFixed(3);
    const madFormatted = madValue.toFixed(3);
    const relativeSpeedFactor = (medianValue / minMedian).toFixed(2);
    const factorSuffix = medianValue === minMedian ? 'x (Fastest)' : 'x';

    const timeWithSpread = `${medianFormatted}s ± ${madFormatted}s`;
    const performanceDisplay = `${bar} ${relativeSpeedFactor}${factorSuffix}`;

    return `| ${cliVersion} | ${timeWithSpread} | ${performanceDisplay} |`;
  }),
].join('\n');

process.stdout.write(output);
