import fs from 'node:fs';

const calculateMedian = (xs) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calculateMedianAbsoluteDeviation = (xs, centre) =>
  calculateMedian(xs.map((x) => Math.abs(x - centre)));

const constructBarForChart = (value, min) => {
  if (min <= 0) return 'N/A';
  const slownessFactor = value / min - 1;
  const baseBarLength = 5;
  const extraBarMax = 30;
  const extra = Math.floor(Math.min(1, slownessFactor / 0.3) * extraBarMax);
  return '▓'.repeat(baseBarLength + extra);
};

const loadResults = (jsonPath) => {
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return new Map(
    json.results.map(({ command, median, times }) => {
      const cliVersion = command.replace(/^node node_modules\/([^/]+)\/.*/, (_, v) => v);
      return [cliVersion, { median, mad: calculateMedianAbsoluteDeviation(times, median) }];
    })
  );
};

const findFastest = (results) =>
  [...results.values()].reduce((best, r) => (r.median < best.median ? r : best));

const renderCell = (entry, fastest) => {
  const bar = constructBarForChart(entry.median, fastest.median);
  const factor = entry.median / fastest.median;
  if (entry === fastest) {
    return `${bar} ${factor.toFixed(2)}x (Fastest)`;
  }
  const relativeUnc =
    factor * Math.sqrt((entry.mad / entry.median) ** 2 + (fastest.mad / fastest.median) ** 2);
  return `${bar} ${factor.toFixed(2)}x ± ${Math.round(relativeUnc * 100) / 100}`;
};

const operations = [
  { name: 'Bundle', file: 'benchmark_bundle.json' },
  { name: 'Lint', file: 'benchmark_lint.json' },
  { name: 'Check Config', file: 'benchmark_check-config.json' },
];

const columns = operations.map(({ name, file }) => {
  const data = loadResults(file);
  return { name, data, fastest: findFastest(data) };
});

const versions = [...new Set(columns.flatMap((c) => [...c.data.keys()]))];

const renderRow = (version) =>
  `| ${version} | ${columns
    .map((c) => {
      const entry = c.data.get(version);
      return entry ? renderCell(entry, c.fastest) : '—';
    })
    .join(' | ')} |`;

const output = [
  '## Performance Benchmark (Lower is Faster)',
  '',
  `| CLI Version | ${columns.map((c) => c.name).join(' | ')} |`,
  `|---|${columns.map(() => '---').join('|')}|`,
  ...versions.map(renderRow),
].join('\n');

process.stdout.write(output);
