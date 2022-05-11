import * as path from 'path';
import {
  options as colorOptions,
  gray,
  blue,
  bgRed,
  bgYellow,
  black,
  yellow,
  red,
} from 'colorette';

const coreVersion = require('../../package.json').version;

import { NormalizedProblem, ProblemSeverity, LineColLocationObject, LocationObject } from '../walk';
import { getCodeframe, getLineColLocation } from './codeframes';
import { env } from "../config";

export type Totals = {
  errors: number;
  warnings: number;
  ignored: number;
};

const ERROR_MESSAGE = {
  INVALID_SEVERITY_LEVEL: 'Invalid severity level; accepted values: error or warn',
};

const BG_COLORS = {
  warn: (str: string) => bgYellow(black(str)),
  error: bgRed,
};

const COLORS = {
  warn: yellow,
  error: red,
};

const SEVERITY_NAMES = {
  warn: 'Warning',
  error: 'Error',
};

const CODECLIMATE_SEVERITY_MAPPING = {
  error: 'critical',
  warn: 'minor',
};

const MAX_SUGGEST = 5;

function severityToNumber(severity: ProblemSeverity) {
  return severity === 'error' ? 1 : 2;
}

export type OutputFormat = 'codeframe' | 'stylish' | 'json' | 'checkstyle' | 'codeclimate';

export function getTotals(problems: (NormalizedProblem & { ignored?: boolean })[]): Totals {
  let errors = 0;
  let warnings = 0;
  let ignored = 0;

  for (const m of problems) {
    if (m.ignored) {
      ignored++;
      continue;
    }
    if (m.severity === 'error') errors++;
    if (m.severity === 'warn') warnings++;
  }

  return {
    errors,
    warnings,
    ignored,
  };
}

export function formatProblems(
  problems: (NormalizedProblem & { ignored?: boolean })[],
  opts: {
    maxProblems?: number;
    cwd?: string;
    format?: OutputFormat;
    color?: boolean;
    totals: Totals;
    version: string;
  },
) {
  const {
    maxProblems = 100,
    cwd = process.cwd(),
    format = 'codeframe',
    color = colorOptions.enabled,
    totals = getTotals(problems),
    version = coreVersion,
  } = opts;

  colorOptions.enabled = color; // force colors if specified

  const totalProblems = problems.length;
  problems = problems.filter((m) => !m.ignored);
  const ignoredProblems = totalProblems - problems.length;

  problems = problems
    .sort((a, b) => severityToNumber(a.severity) - severityToNumber(b.severity))
    .slice(0, maxProblems);

  if (!totalProblems && format !== 'json') return;

  switch (format) {
    case 'json':
      outputJSON();
      break;
    case 'codeframe':
      for (let i = 0; i < problems.length; i++) {
        const problem = problems[i];
        process.stderr.write(`${formatCodeframe(problem, i)}\n`);
      }
      break;
    case 'stylish': {
      const groupedByFile = groupByFiles(problems);
      for (const [file, { ruleIdPad, locationPad: positionPad, fileProblems }] of Object.entries(
        groupedByFile,
      )) {
        process.stderr.write(`${blue(path.relative(cwd, file))}:\n`);

        for (let i = 0; i < fileProblems.length; i++) {
          const problem = fileProblems[i];
          process.stderr.write(`${formatStylish(problem, positionPad, ruleIdPad)}\n`);
        }

        process.stderr.write('\n');
      }
      break;
    }
    case 'checkstyle': {
      const groupedByFile = groupByFiles(problems);

      process.stdout.write('<?xml version="1.0" encoding="UTF-8"?>\n');
      process.stdout.write('<checkstyle version="4.3">\n');

      for (const [file, { fileProblems }] of Object.entries(groupedByFile)) {
        process.stdout.write(`<file name="${xmlEscape(path.relative(cwd, file))}">\n`);
        fileProblems.forEach(formatCheckstyle);
        process.stdout.write(`</file>\n`);
      }

      process.stdout.write(`</checkstyle>\n`);
      break;
    }
    case 'codeclimate':
      outputForCodeClimate();
      break;
  }

  if (totalProblems - ignoredProblems > maxProblems) {
    process.stderr.write(
      `< ... ${totalProblems - maxProblems} more problems hidden > ${gray(
        'increase with `--max-problems N`',
      )}\n`,
    );
  }

  function outputForCodeClimate() {
    const issues = problems.map((p) => {
      const location = p.location[0]; // TODO: support multiple location
      const lineCol = getLineColLocation(location);
      return {
        description: p.message,
        location: {
          path: path.relative(cwd, location.source.absoluteRef),
          lines: {
            begin: lineCol.start.line,
          },
        },
        severity: CODECLIMATE_SEVERITY_MAPPING[p.severity],
        fingerprint: `${p.ruleId}${p.location.length > 0 ? '-' + p.location[0].pointer : ''}`,
      };
    });
    process.stdout.write(JSON.stringify(issues, null, 2));
  }

  function outputJSON() {
    const resultObject = {
      totals,
      version,
      problems: problems.map((p) => {
        let problem = {
          ...p,
          location: p.location.map((location: any) => ({
            ...location,
            source: {
              ref: path.relative(cwd, location.source.absoluteRef),
            },
          })),
          from: p.from
            ? {
                ...p.from,
                source: {
                  ref: path.relative(cwd, p.from?.source.absoluteRef || cwd),
                },
              }
            : undefined,
        };

        if (env.FORMAT_JSON_WITH_CODEFRAMES) {
          const location = p.location[0]; // TODO: support multiple locations
          const loc = getLineColLocation(location);
          (problem as any).codeframe = getCodeframe(loc, color);
        }
        return problem;
      }),
    };
    process.stdout.write(JSON.stringify(resultObject, null, 2));
  }

  function getBgColor(problem: NormalizedProblem) {
    const { severity } = problem;
    if (!BG_COLORS[severity]) {
      throw new Error(ERROR_MESSAGE.INVALID_SEVERITY_LEVEL);
    }
    return BG_COLORS[severity];
  }

  function formatCodeframe(problem: NormalizedProblem, idx: number) {
    const bgColor = getBgColor(problem);
    const location = problem.location[0]; // TODO: support multiple locations
    const relativePath = path.relative(cwd, location.source.absoluteRef);
    const loc = getLineColLocation(location);
    const atPointer = location.pointer ? gray(`at ${location.pointer}`) : '';
    const fileWithLoc = `${relativePath}:${loc.start.line}:${loc.start.col}`;
    return (
      `[${idx + 1}] ${bgColor(fileWithLoc)} ${atPointer}\n\n` +
      `${problem.message}\n\n` +
      formatDidYouMean(problem) +
      getCodeframe(loc, color) +
      '\n\n' +
      formatFrom(cwd, problem.from) +
      `${SEVERITY_NAMES[problem.severity]} was generated by the ${blue(problem.ruleId)} rule.\n\n`
    );
  }

  function formatStylish(problem: OnlyLineColProblem, locationPad: number, ruleIdPad: number) {
    const color = COLORS[problem.severity];
    if (!SEVERITY_NAMES[problem.severity]) {
      return 'Error not found severity. Please check your config file. Allowed values: \`warn,error,off\`'
    }
    const severityName = color(SEVERITY_NAMES[problem.severity].toLowerCase().padEnd(7));
    const { start } = problem.location[0];
    return `  ${`${start.line}:${start.col}`.padEnd(
      locationPad,
    )}  ${severityName}  ${problem.ruleId.padEnd(ruleIdPad)}  ${problem.message}`;
  }

  function formatCheckstyle(problem: OnlyLineColProblem) {
    const { line, col } = problem.location[0].start;
    const severity = problem.severity == 'warn' ? 'warning' : 'error';
    const message = xmlEscape(problem.message);
    const source = xmlEscape(problem.ruleId);
    process.stdout.write(
      `<error line="${line}" column="${col}" severity="${severity}" message="${message}" source="${source}" />\n`,
    );
  }
}

function formatFrom(cwd: string, location?: LocationObject) {
  if (!location) return '';
  const relativePath = path.relative(cwd, location.source.absoluteRef);
  const loc = getLineColLocation(location);
  const fileWithLoc = `${relativePath}:${loc.start.line}:${loc.start.col}`;

  return `referenced from ${blue(fileWithLoc)}\n\n`;
}

function formatDidYouMean(problem: NormalizedProblem) {
  if (problem.suggest.length === 0) return '';

  if (problem.suggest.length === 1) {
    return `Did you mean: ${problem.suggest[0]} ?\n\n`;
  } else {
    return `Did you mean:\n  - ${problem.suggest.slice(0, MAX_SUGGEST).join('\n  - ')}\n\n`;
  }
}

type OnlyLineColProblem = Omit<NormalizedProblem, 'location'> & {
  location: LineColLocationObject[];
};

const groupByFiles = (problems: NormalizedProblem[]) => {
  const fileGroups: Record<
    string,
    {
      locationPad: number;
      ruleIdPad: number;
      fileProblems: OnlyLineColProblem[];
    }
  > = {};
  for (const problem of problems) {
    const absoluteRef = problem.location[0].source.absoluteRef; // TODO: multiple errors
    fileGroups[absoluteRef] = fileGroups[absoluteRef] || {
      fileProblems: [],
      ruleIdPad: 0,
      locationPad: 0,
    };

    const mappedProblem = { ...problem, location: problem.location.map(getLineColLocation) };
    fileGroups[absoluteRef].fileProblems.push(mappedProblem);
    fileGroups[absoluteRef].ruleIdPad = Math.max(
      problem.ruleId.length,
      fileGroups[absoluteRef].ruleIdPad,
    );

    fileGroups[absoluteRef].locationPad = Math.max(
      Math.max(...mappedProblem.location.map((loc) => `${loc.start.line}:${loc.start.col}`.length)),
      fileGroups[absoluteRef].locationPad,
    );
  }

  return fileGroups;
};

function xmlEscape(s: string): string {
  return s.replace(/[<>&"'\x00-\x1F\x7F\u0080-\uFFFF]/gu, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return `&#${char.charCodeAt(0)};`;
    }
  });
}
