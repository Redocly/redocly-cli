import fs from 'node:fs';

const median = (xs) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const medianAbsoluteDeviation = (xs, centre) => median(xs.map((x) => Math.abs(x - centre)));

const constructBarForChart = (value, min) => {
  if (min <= 0) return 'N/A';
  const slownessFactor = value / min - 1;
  const maxBarLength = 30;
  const length = Math.floor(Math.min(1, slownessFactor) * maxBarLength);
  return '▓' + '▓'.repeat(length);
};

const renderSection = (jsonPath, title) => {
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const rows = json.results.map((r) => [
    r.command.replace(/^node node_modules\/([^/]+)\/.*/, (_, cliVersion) => cliVersion),
    r.median,
    medianAbsoluteDeviation(r.times, r.median),
  ]);
  const fastest = Math.min(...rows.map(([, value]) => value));

  return [
    `### ${title}`,
    '',
    '| CLI Version | Median Time ± MAD (s) | Relative Performance (Lower is Faster) |',
    '|---|---|---|',
    ...rows.map(([cliVersion, medianValue, madValue]) => {
      const bar = constructBarForChart(medianValue, fastest);
      const factor = (medianValue / fastest).toFixed(2);
      const suffix = medianValue === fastest ? 'x (Fastest)' : 'x';
      return `| ${cliVersion} | ${medianValue.toFixed(3)}s ± ${madValue.toFixed(3)}s | ${bar} ${factor}${suffix} |`;
    }),
  ].join('\n');
};

const output = [
  '## Performance Benchmark',
  '',
  renderSection('benchmark_bundle.json', 'Bundle'),
  '',
  renderSection('benchmark_lint.json', 'Lint'),
].join('\n');

process.stdout.write(output);
