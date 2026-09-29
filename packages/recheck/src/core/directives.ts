import { filterByTypes } from '../parser/index.js';
import type { TokenTree } from '../parser/types.js';
import type { Problem } from '../types/index.js';
import { newLineRe } from './line-endings.js';

const DIRECTIVE_RE =
  /<!--\s*recheck-(disable-file|disable-next-line|disable|enable)((?:\s+[\w/-]+)*)\s*-->/g;

const short = (name: string) => name.replace(/^recheck\//, '');

type DirectiveKind = 'disable-file' | 'disable-next-line' | 'disable' | 'enable';

interface Event {
  line: number;
  kind: DirectiveKind;
  rules: string[];
} // rules: short names; [] = all

export interface DirectiveMap {
  fileDisabled: boolean;
  isSuppressed(ruleName: string, line: number): boolean;
  warnings: Problem[];
}

export function parseDirectives(
  tree: TokenTree,
  file: string,
  knownRuleNames: Set<string>
): DirectiveMap {
  const knownShort = new Set([...knownRuleNames].map(short));
  const events: Event[] = [];
  const warnings: Problem[] = [];
  let fileDisabled = false;

  for (const token of filterByTypes(tree, ['htmlFlow', 'htmlText'])) {
    DIRECTIVE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DIRECTIVE_RE.exec(token.text)) !== null) {
      const kind = m[1] as DirectiveKind;
      // An HTML block can span several lines, so add the line breaks before the match.
      const breaksBeforeMatch = token.text.slice(0, m.index).match(newLineRe)?.length ?? 0;
      const directiveLine = token.startLine + breaksBeforeMatch;
      const rules = m[2].trim() ? m[2].trim().split(/\s+/).map(short) : [];
      for (const r of rules) {
        if (!knownShort.has(r)) {
          warnings.push({
            file,
            line: directiveLine,
            column: 1,
            text: '',
            match: r,
            ruleName: 'recheck-directive',
            severity: 'warn',
            message: `Inline directive names unknown rule "${r}" — check for a typo; it disables nothing.`,
          });
        }
      }
      if (kind === 'disable-file') fileDisabled = true;
      else events.push({ line: directiveLine, kind, rules });
    }
  }
  events.sort((a, b) => a.line - b.line);

  // Replay the events up to `line` to see whether the rule is disabled there.
  const isSuppressed = (ruleName: string, line: number): boolean => {
    const r = short(ruleName);
    let allDisabled = false;
    const ruleState = new Map<string, boolean>(); // true = disabled
    for (const e of events) {
      if (e.kind === 'disable-next-line') {
        if (e.line + 1 === line && (e.rules.length === 0 || e.rules.includes(r))) return true;
        continue;
      }
      if (e.line > line) break;
      const disabled = e.kind === 'disable';
      if (e.rules.length === 0) {
        allDisabled = disabled;
        ruleState.clear();
      } else for (const er of e.rules) ruleState.set(er, disabled);
    }
    return ruleState.has(r) ? (ruleState.get(r) as boolean) : allDisabled;
  };

  return { fileDisabled, isSuppressed, warnings };
}
