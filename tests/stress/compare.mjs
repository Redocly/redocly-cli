// Compares the lint output of two CLI builds cell by cell and writes a Markdown report.
// Usage: node tests/stress/compare.mjs <base-dir> <head-dir> <report.md>
// Exits with 1 when any cell differs.
import fs from 'node:fs';
import path from 'node:path';

const MAX_ROWS_PER_BUCKET = 50;
const STDERR_TAIL_LINES = 40;

const [baseDir, headDir, reportPath] = process.argv.slice(2);
if (!baseDir || !headDir || !reportPath) {
  console.error('Usage: node tests/stress/compare.mjs <base-dir> <head-dir> <report.md>');
  process.exit(2);
}

function readCell(dir, name) {
  const exitCode = fs.readFileSync(path.join(dir, `${name}.exit`), 'utf8').trim();
  const stderr = fs.readFileSync(path.join(dir, `${name}.stderr`), 'utf8');
  const stdout = fs.readFileSync(path.join(dir, `${name}.json`), 'utf8');
  // A crashed run leaves empty or partial stdout. The exit code reports that case.
  let problems = null;
  try {
    problems = JSON.parse(stdout).problems;
  } catch {
    problems = null;
  }
  return { exitCode, stderr, problems };
}

function getLocation(problem) {
  const location = problem.location[0];
  if (!location) {
    return '';
  }
  return `${location.source.ref}#${location.pointer}`;
}

function getPosition(problem) {
  const location = problem.location[0];
  if (!location) {
    return '';
  }
  return `${location.start.line}:${location.start.col}-${location.end.line}:${location.end.col}`;
}

// Where the problem is and which rule reports it.
function placeKey(problem) {
  return `${getLocation(problem)}\n${problem.ruleId}`;
}

// The place plus the message.
function identityKey(problem) {
  return `${placeKey(problem)}\n${problem.message}`;
}

function addToGroup(groups, key, problem) {
  let group = groups.get(key);
  if (!group) {
    group = [];
    groups.set(key, group);
  }
  group.push(problem);
}

function groupByIdentity(problems) {
  const groups = new Map();
  for (const problem of problems) {
    addToGroup(groups, identityKey(problem), problem);
  }
  return groups;
}

function describeDifferences(baseProblem, headProblem) {
  const differences = [];
  if (baseProblem.severity !== headProblem.severity) {
    differences.push(`severity ${baseProblem.severity}, now ${headProblem.severity}`);
  }
  const basePosition = getPosition(baseProblem);
  const headPosition = getPosition(headProblem);
  if (basePosition !== headPosition) {
    differences.push(`position ${basePosition}, now ${headPosition}`);
  }
  return differences;
}

function compareProblems(baseProblems, headProblems) {
  const added = [];
  const removed = [];
  const changed = [];
  const baseGroups = groupByIdentity(baseProblems);
  const headGroups = groupByIdentity(headProblems);

  for (const [key, headGroup] of headGroups) {
    const baseGroup = baseGroups.get(key) || [];
    for (let index = 0; index < headGroup.length; index++) {
      if (index >= baseGroup.length) {
        added.push(headGroup[index]);
        continue;
      }
      const differences = describeDifferences(baseGroup[index], headGroup[index]);
      if (differences.length > 0) {
        changed.push({
          base: baseGroup[index],
          head: headGroup[index],
          what: differences.join('; '),
        });
      }
    }
  }
  for (const [key, baseGroup] of baseGroups) {
    const headGroup = headGroups.get(key) || [];
    for (let index = headGroup.length; index < baseGroup.length; index++) {
      removed.push(baseGroup[index]);
    }
  }

  // A removed and an added problem at the same place from the same rule is one changed message.
  const removedByPlace = new Map();
  for (const problem of removed) {
    addToGroup(removedByPlace, placeKey(problem), problem);
  }
  const stillAdded = [];
  for (const problem of added) {
    const group = removedByPlace.get(placeKey(problem));
    if (group && group.length > 0) {
      const baseProblem = group.shift();
      changed.push({
        base: baseProblem,
        head: problem,
        what: `was "${baseProblem.message}", now "${problem.message}"`,
      });
    } else {
      stillAdded.push(problem);
    }
  }
  const stillRemoved = [];
  for (const group of removedByPlace.values()) {
    for (const problem of group) {
      stillRemoved.push(problem);
    }
  }

  return { added: sortProblems(stillAdded), removed: sortProblems(stillRemoved), changed };
}

function sortProblems(problems) {
  return [...problems].sort((left, right) => {
    const leftKey = identityKey(left);
    const rightKey = identityKey(right);
    if (leftKey < rightKey) {
      return -1;
    }
    if (leftKey > rightKey) {
      return 1;
    }
    return 0;
  });
}

function escapeCell(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderBucket(title, rows) {
  const lines = [
    `**${title} (${rows.length})**`,
    '',
    '| Rule | Location | Details |',
    '| --- | --- | --- |',
  ];
  for (const row of rows.slice(0, MAX_ROWS_PER_BUCKET)) {
    lines.push(
      `| ${escapeCell(row.ruleId)} | ${escapeCell(row.location)} | ${escapeCell(row.details)} |`
    );
  }
  if (rows.length > MAX_ROWS_PER_BUCKET) {
    lines.push('', `... and ${rows.length - MAX_ROWS_PER_BUCKET} more.`);
  }
  lines.push('');
  return lines;
}

function problemRows(problems) {
  return problems.map((problem) => ({
    ruleId: problem.ruleId,
    location: getLocation(problem),
    details: problem.message,
  }));
}

function renderCellDetails(name, base, head, diff) {
  const summary = `${name}: +${diff.added.length} -${diff.removed.length} ~${diff.changed.length}`;
  const lines = ['<details>', `<summary><code>${summary}</code></summary>`, ''];
  if (base.exitCode !== head.exitCode) {
    lines.push(
      `Exit code was ${base.exitCode}, now ${head.exitCode}. Last lines of stderr from the pull request build:`,
      ''
    );
    const stderrLines = head.stderr.trimEnd().split('\n');
    lines.push('```', ...stderrLines.slice(-STDERR_TAIL_LINES), '```', '');
  }
  if (diff.added.length > 0) {
    lines.push(...renderBucket('Added', problemRows(diff.added)));
  }
  if (diff.removed.length > 0) {
    lines.push(...renderBucket('Removed', problemRows(diff.removed)));
  }
  if (diff.changed.length > 0) {
    const rows = diff.changed.map((change) => ({
      ruleId: change.head.ruleId,
      location: getLocation(change.head),
      details: change.what,
    }));
    lines.push(...renderBucket('Changed', rows));
  }
  lines.push('</details>', '');
  return lines;
}

const cellNames = fs
  .readdirSync(baseDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -'.json'.length))
  .sort();

const summaryRows = [];
const detailLines = [];
let differingCells = 0;
for (const name of cellNames) {
  const base = readCell(baseDir, name);
  const head = readCell(headDir, name);
  const hasJsonOnBothSides = base.problems !== null && head.problems !== null;
  // Without JSON on one side, every problem would count as added or removed, so only the exit code is compared.
  let diff = { added: [], removed: [], changed: [] };
  if (hasJsonOnBothSides) {
    diff = compareProblems(base.problems, head.problems);
  }
  const differs =
    base.exitCode !== head.exitCode ||
    !hasJsonOnBothSides ||
    diff.added.length + diff.removed.length + diff.changed.length > 0;
  if (differs) {
    differingCells++;
    detailLines.push(...renderCellDetails(name, base, head, diff));
  }
  const baseCount = base.problems === null ? 'no JSON' : base.problems.length;
  const headCount = head.problems === null ? 'no JSON' : head.problems.length;
  summaryRows.push(
    `| ${name} | ${base.exitCode} | ${head.exitCode} | ${baseCount} | ${headCount} | ${diff.added.length} | ${diff.removed.length} | ${diff.changed.length} |`
  );
}

const reportLines = ['## Stress test on production specs', ''];
if (differingCells === 0) {
  reportLines.push(
    `Identical output on ${cellNames.length} cells.`,
    '',
    '<details>',
    '<summary>Problem counts per cell</summary>',
    ''
  );
} else {
  reportLines.push(
    `${differingCells} of ${cellNames.length} cells differ between the base and the pull request build.`,
    ''
  );
}
reportLines.push(
  '| Cell | Base exit | Head exit | Base problems | Head problems | Added | Removed | Changed |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...summaryRows,
  ''
);
if (differingCells === 0) {
  reportLines.push('</details>', '');
} else {
  reportLines.push(...detailLines);
}

const report = reportLines.join('\n');
fs.writeFileSync(reportPath, report);
console.log(report);
process.exit(differingCells > 0 ? 1 : 0);
