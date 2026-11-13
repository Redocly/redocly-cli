// Compares the lint output of two CLI builds cell by cell and writes a Markdown report.
// Usage: node tests/stress/compare.mjs <base-dir> <head-dir> <report.md>
// Exit code: 0 when the output is identical, 1 when it differs, 2 when a lint run wrote no JSON.
import fs from 'node:fs';
import path from 'node:path';

const MAX_EXAMPLES_PER_KIND = 3;
const MAX_MESSAGE_LENGTH = 200;
const STDERR_TAIL_LINES = 40;
// GitHub rejects a comment that is longer than 65536 characters.
const MAX_REPORT_LENGTH = 60000;
const README_URL = 'https://github.com/Redocly/redocly-cli/blob/main/tests/stress/README.md';

const [baseDir, headDir, reportPath] = process.argv.slice(2);
if (!baseDir || !headDir || !reportPath) {
  process.stderr.write('Usage: node tests/stress/compare.mjs <base-dir> <head-dir> <report.md>\n');
  process.exit(2);
}

function readCell(dir, name) {
  const exitCode = fs.readFileSync(path.join(dir, `${name}.exit`), 'utf8').trim();
  const stderr = fs.readFileSync(path.join(dir, `${name}.stderr`), 'utf8');
  const stdout = fs.readFileSync(path.join(dir, `${name}.json`), 'utf8');
  // A crashed run leaves empty or partial stdout.
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
      // The same problem with a different severity, line, or column is a changed problem.
      if (
        baseGroup[index].severity !== headGroup[index].severity ||
        getPosition(baseGroup[index]) !== getPosition(headGroup[index])
      ) {
        changed.push({ base: baseGroup[index], head: headGroup[index] });
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
      changed.push({ base: group.shift(), head: problem });
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

function getRuleEntry(rules, ruleId) {
  let entry = rules.get(ruleId);
  if (!entry) {
    entry = { ruleId, baseCount: 0, headCount: 0, added: [], removed: [], changed: [] };
    rules.set(ruleId, entry);
  }
  return entry;
}

// Returns one entry per rule that reports different problems, sorted by rule name.
function collectDifferingRules(baseProblems, headProblems, diff) {
  const rules = new Map();
  for (const problem of baseProblems) {
    getRuleEntry(rules, problem.ruleId).baseCount++;
  }
  for (const problem of headProblems) {
    getRuleEntry(rules, problem.ruleId).headCount++;
  }
  for (const problem of diff.added) {
    getRuleEntry(rules, problem.ruleId).added.push(problem);
  }
  for (const problem of diff.removed) {
    getRuleEntry(rules, problem.ruleId).removed.push(problem);
  }
  for (const change of diff.changed) {
    getRuleEntry(rules, change.head.ruleId).changed.push(change);
  }

  const differingRules = [];
  for (const entry of rules.values()) {
    if (entry.added.length + entry.removed.length + entry.changed.length > 0) {
      differingRules.push(entry);
    }
  }
  differingRules.sort((left, right) => left.ruleId.localeCompare(right.ruleId));
  return differingRules;
}

function formatCount(count) {
  return count.toLocaleString('en-US');
}

// One line in the style of the lint output: <file>:<line>:<column> [<severity>] <message>
function formatProblem(problem) {
  let message = problem.message.replace(/\r?\n/g, ' ');
  if (message.length > MAX_MESSAGE_LENGTH) {
    message = `${message.slice(0, MAX_MESSAGE_LENGTH)}...`;
  }
  const location = problem.location[0];
  if (!location) {
    return `[${problem.severity}] ${message}`;
  }
  return `${location.source.ref}:${location.start.line}:${location.start.col} [${problem.severity}] ${message}`;
}

function renderMoreLine(total) {
  if (total <= MAX_EXAMPLES_PER_KIND) {
    return [];
  }
  return [`  ... and ${formatCount(total - MAX_EXAMPLES_PER_KIND)} more`];
}

// A `diff` code block. GitHub shows the `-` lines in red and the `+` lines in green.
function renderExamples(rules) {
  const lines = [
    '<details>',
    `<summary>Examples (the first ${MAX_EXAMPLES_PER_KIND} of each kind per rule)</summary>`,
    '',
    '```diff',
  ];
  for (const rule of rules) {
    if (rule.removed.length > 0) {
      lines.push(`@@ ${rule.ruleId}: ${formatCount(rule.removed.length)} removed @@`);
      for (const problem of rule.removed.slice(0, MAX_EXAMPLES_PER_KIND)) {
        lines.push(`- ${formatProblem(problem)}`);
      }
      lines.push(...renderMoreLine(rule.removed.length));
    }
    if (rule.added.length > 0) {
      lines.push(`@@ ${rule.ruleId}: ${formatCount(rule.added.length)} added @@`);
      for (const problem of rule.added.slice(0, MAX_EXAMPLES_PER_KIND)) {
        lines.push(`+ ${formatProblem(problem)}`);
      }
      lines.push(...renderMoreLine(rule.added.length));
    }
    if (rule.changed.length > 0) {
      lines.push(`@@ ${rule.ruleId}: ${formatCount(rule.changed.length)} changed @@`);
      for (const change of rule.changed.slice(0, MAX_EXAMPLES_PER_KIND)) {
        lines.push(`- ${formatProblem(change.base)}`, `+ ${formatProblem(change.head)}`);
      }
      lines.push(...renderMoreLine(rule.changed.length));
    }
  }
  lines.push('```', '', '</details>', '');
  return lines;
}

function renderStderr(buildName, cell) {
  const stderrLines = cell.stderr.trimEnd().split('\n');
  return [
    `The ${buildName} build wrote no JSON report. Last lines of its stderr:`,
    '',
    '```',
    ...stderrLines.slice(-STDERR_TAIL_LINES),
    '```',
    '',
  ];
}

// The heading, the exit codes, and the table of rules for one cell that differs.
function renderCellSection(cell) {
  const lines = [`### ${cell.spec} · \`${cell.config}\``, ''];
  if (cell.base.exitCode !== cell.head.exitCode) {
    lines.push(`Exit code: ${cell.base.exitCode} in base, ${cell.head.exitCode} in head.`, '');
  }
  if (cell.base.problems === null) {
    lines.push(...renderStderr('base', cell.base));
  }
  if (cell.head.problems === null) {
    lines.push(...renderStderr('head', cell.head));
  }
  if (cell.rules.length > 0) {
    lines.push(
      '| Rule | Base | Head | Added | Removed | Changed |',
      '| :-- | --: | --: | --: | --: | --: |'
    );
    for (const rule of cell.rules) {
      lines.push(
        `| \`${rule.ruleId}\` | ${formatCount(rule.baseCount)} | ${formatCount(rule.headCount)} | ${formatCount(rule.added.length)} | ${formatCount(rule.removed.length)} | ${formatCount(rule.changed.length)} |`
      );
    }
    lines.push('');
  }
  return lines;
}

const cellNames = fs
  .readdirSync(baseDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -'.json'.length))
  .sort();

const cells = [];
let failedCells = 0;
let differingCells = 0;
for (const name of cellNames) {
  const [spec, config] = name.split('.');
  const cell = {
    spec,
    config,
    base: readCell(baseDir, name),
    head: readCell(headDir, name),
    diff: { added: [], removed: [], changed: [] },
    rules: [],
    failed: false,
    differs: false,
  };
  if (cell.base.problems === null || cell.head.problems === null) {
    // Without JSON on one side, every problem would count as added or removed.
    cell.failed = true;
    failedCells++;
  } else {
    cell.diff = compareProblems(cell.base.problems, cell.head.problems);
    cell.rules = collectDifferingRules(cell.base.problems, cell.head.problems, cell.diff);
    cell.differs = cell.base.exitCode !== cell.head.exitCode || cell.rules.length > 0;
    if (cell.differs) {
      differingCells++;
    }
  }
  cells.push(cell);
}

const reportLines = ['## Stress test on production specs', ''];
if (failedCells > 0) {
  reportLines.push(`❌ **A lint run failed** in ${failedCells} of ${cells.length} runs.`);
} else if (differingCells > 0) {
  reportLines.push(`⚠️ **The lint output changed** in ${differingCells} of ${cells.length} runs.`);
} else {
  reportLines.push(
    `✅ **No changes.** The two builds report the same problems in ${cells.length} runs.`
  );
}
reportLines.push('');

if (failedCells + differingCells === 0) {
  reportLines.push('| API description | Config | Problems |', '| :-- | :-- | --: |');
  for (const cell of cells) {
    reportLines.push(
      `| ${cell.spec} | \`${cell.config}\` | ${formatCount(cell.head.problems.length)} |`
    );
  }
} else {
  reportLines.push(
    '| API description | Config | Base | Head | Added | Removed | Changed |',
    '| :-- | :-- | --: | --: | --: | --: | --: |'
  );
  for (const cell of cells) {
    let baseCount = 'failed';
    if (cell.base.problems !== null) {
      baseCount = formatCount(cell.base.problems.length);
    }
    let headCount = 'failed';
    if (cell.head.problems !== null) {
      headCount = formatCount(cell.head.problems.length);
    }
    reportLines.push(
      `| ${cell.spec} | \`${cell.config}\` | ${baseCount} | ${headCount} | ${formatCount(cell.diff.added.length)} | ${formatCount(cell.diff.removed.length)} | ${formatCount(cell.diff.changed.length)} |`
    );
  }
}
reportLines.push('');

const footerLines = [`[How to read this report and run it locally](${README_URL})`, ''];

// The tables always go into the report. The examples go in only while the comment has room for them.
const sections = [];
let remainingLength =
  MAX_REPORT_LENGTH - reportLines.join('\n').length - footerLines.join('\n').length;
for (const cell of cells) {
  if (!cell.failed && !cell.differs) {
    continue;
  }
  const section = { tableLines: renderCellSection(cell), exampleLines: [] };
  if (cell.rules.length > 0) {
    section.exampleLines = renderExamples(cell.rules);
  }
  remainingLength -= section.tableLines.join('\n').length;
  sections.push(section);
}
for (const section of sections) {
  reportLines.push(...section.tableLines);
  const examplesLength = section.exampleLines.join('\n').length;
  if (examplesLength <= remainingLength) {
    reportLines.push(...section.exampleLines);
    remainingLength -= examplesLength;
  } else {
    reportLines.push(
      'The examples do not fit in this comment. Run the comparison locally to see them.',
      ''
    );
  }
}
reportLines.push(...footerLines);

const report = reportLines.join('\n');
fs.writeFileSync(reportPath, report);
process.stdout.write(report);
if (failedCells > 0) {
  process.exit(2);
}
if (differingCells > 0) {
  process.exit(1);
}
