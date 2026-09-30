// TEMPORARY — aggregates the raw hyperfine JSON uploaded by benchmark-noise.yaml into a
// markdown report on run-to-run variance per runner provider. Delete together with that workflow.
//
// Usage: node noise-report.mjs <dir-with-one-subdir-per-sample>
// Each subdir holds meta.txt (runner=, sample=, cpu=, nproc=) and benchmark_<op>.json.
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'noise-results';

const operations = [
  { name: 'Bundle', file: 'benchmark_bundle.json' },
  { name: 'Lint', file: 'benchmark_lint.json' },
  { name: 'Check Config', file: 'benchmark_check-config.json' },
];

const median = (xs) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const versionOf = (command) => command.replace(/^node node_modules\/([^/]+)\/.*/, (_, v) => v);

const samples = [];
for (const dir of fs.readdirSync(root)) {
  const full = path.join(root, dir);
  if (!fs.statSync(full).isDirectory() || !fs.existsSync(path.join(full, 'meta.txt'))) continue;
  const meta = Object.fromEntries(
    fs
      .readFileSync(path.join(full, 'meta.txt'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i), line.slice(i + 1)];
      })
  );
  const ops = {};
  for (const { name, file } of operations) {
    const p = path.join(full, file);
    if (!fs.existsSync(p)) continue;
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    ops[name] = Object.fromEntries(json.results.map((r) => [versionOf(r.command), r]));
  }
  samples.push({ runner: meta.runner, sample: Number(meta.sample), attempt: meta.attempt, cpu: meta.cpu, nproc: meta.nproc, ops });
}

const runners = [...new Set(samples.map((s) => s.runner))].sort();
const out = [];

out.push('## Benchmark runner noise', '');
out.push(
  `Same commit, ${samples.length} samples. One sample = one full run of the performance benchmark (hyperfine, 2 warmups, ≥10 timed runs per command).`,
  ''
);

out.push('### Machines', '', '| Runner | Samples | CPU models seen |', '|---|---|---|');
for (const runner of runners) {
  const ss = samples.filter((s) => s.runner === runner);
  const cpus = [...new Set(ss.map((s) => `${s.cpu} (${s.nproc} vCPU)`))];
  out.push(`| ${runner} | ${ss.length} | ${cpus.join('<br>')} |`);
}
out.push('');

out.push('### Absolute time per command (median of each sample, seconds)', '');
out.push(
  'Spread = (max − min) / median across samples, i.e. how far apart two runs of the same job can land. Within-run CV = mean of hyperfine stddev/mean per sample, i.e. jitter inside one job.',
  ''
);
out.push(
  '| Runner | Operation | Version | min | median | max | spread across samples | within-run CV |',
  '|---|---|---|---|---|---|---|---|'
);
for (const runner of runners) {
  for (const { name } of operations) {
    const ss = samples.filter((s) => s.runner === runner && s.ops[name]);
    if (!ss.length) continue;
    const versions = [...new Set(ss.flatMap((s) => Object.keys(s.ops[name])))];
    for (const version of versions) {
      const entries = ss.map((s) => s.ops[name][version]).filter(Boolean);
      const medians = entries.map((e) => e.median);
      const mid = median(medians);
      const lo = Math.min(...medians);
      const hi = Math.max(...medians);
      const cv = mean(entries.map((e) => e.stddev / e.mean));
      out.push(
        `| ${runner} | ${name} | ${version} | ${lo.toFixed(3)} | ${mid.toFixed(3)} | ${hi.toFixed(3)} | ${pct((hi - lo) / mid)} | ${pct(cv)} |`
      );
    }
  }
}
out.push('');

out.push('### cli-next / cli-latest ratio per sample', '');
out.push(
  'This ratio is what the performance comment reports (chart.js warns when it exceeds 1.05 and the noise estimate). Both versions run in the same job, so shared machine slowness cancels out; the spread here is the noise a regression must beat.',
  ''
);
out.push('| Runner | Operation | Ratios (one per sample) | min | max | spread (max − min) |', '|---|---|---|---|---|---|');
for (const runner of runners) {
  for (const { name } of operations) {
    const ratios = samples
      .filter((s) => s.runner === runner && s.ops[name]?.['cli-next'] && s.ops[name]?.['cli-latest'])
      .sort((a, b) => a.sample - b.sample)
      .map((s) => s.ops[name]['cli-next'].median / s.ops[name]['cli-latest'].median);
    if (!ratios.length) continue;
    const lo = Math.min(...ratios);
    const hi = Math.max(...ratios);
    out.push(
      `| ${runner} | ${name} | ${ratios.map((x) => x.toFixed(3)).join(', ')} | ${lo.toFixed(3)} | ${hi.toFixed(3)} | ${(hi - lo).toFixed(3)} |`
    );
  }
}
out.push('');

process.stdout.write(out.join('\n') + '\n');
