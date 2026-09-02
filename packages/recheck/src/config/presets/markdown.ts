import { resolveAssertion } from '../../rules/registry.js';
import type { BaseRule, RecheckConfig } from '../../types/index.js';

/**
 * Builds preset rule entries for a set of already-ported rule names: one
 * `recheck/<name>` entry each, `severity: 'error'`, and empty assertion
 * options (`{}`, i.e. upstream/rule defaults) — per spec §4.
 *
 * Message resolution (single source of truth, no hand-maintained message
 * strings duplicated here): for a **token** rule (every markdownlint-ported
 * rule from Task 5 onward), the message comes straight from that rule's own
 * `defaults.message` via `resolveAssertion` — the same default a user's
 * config falls back to when it omits `message` (see
 * rules/token/messages.ts formatTokenMessage). For a **scope** rule (the
 * pre-existing native rules, which have no `defaults` object at all — see
 * rules/types.ts ScopeRule), there's nothing to derive a message from, so
 * an explicit override in `messages` is required; passing one for a token
 * rule is also allowed and wins, in case a preset ever needs to override a
 * rule's wording. The current config schema still requires a non-empty
 * `message` on every rule (see schema.ts `required: [...]`) — that hasn't
 * changed, only where the string comes from at preset-build time.
 */
export function registerPresetRules(
  names: string[],
  messages: Record<string, string> = {}
): RecheckConfig {
  const config: RecheckConfig = {};
  for (const name of names) {
    const message = messages[name] ?? defaultMessageFor(name);
    if (!message) {
      throw new Error(`registerPresetRules: missing message for preset rule "${name}"`);
    }
    const rule: BaseRule = {
      severity: 'error',
      message,
      assertions: { [name]: {} },
    };
    config[`recheck/${name}`] = rule;
  }
  return config;
}

function defaultMessageFor(name: string): string | undefined {
  try {
    const resolved = resolveAssertion(name);
    if (resolved.kind === 'token') {
      const message = resolved.rule.defaults.message;
      return typeof message === 'string' ? message : undefined;
    }
    return undefined;
  } catch {
    // Not yet registered (e.g. a scope rule with no explicit message
    // passed, or a name that doesn't resolve at all) — validate.ts's
    // validateAssertions() is what actually gates unknown assertion ids
    // for user configs; this function only decides whether it can
    // synthesize a message.
    return undefined;
  }
}

/**
 * Rule (short) names ported into the `recheck/markdown` preset so far. Each
 * batch task (5-10) appends the rule names it lands. Token-rule messages
 * are derived automatically from the rule's own `defaults.message` (see
 * defaultMessageFor above) — only list a name in MARKDOWN_PRESET_MESSAGES
 * if it's a scope rule (no `defaults`) or the preset wants to override the
 * rule's own wording.
 */
export const MARKDOWN_PRESET_RULES: string[] = [
  'heading-increment',
  'heading-style',
  'no-missing-space-atx',
  'no-multiple-space-atx',
  'no-missing-space-closed-atx',
  'no-multiple-space-closed-atx',
  'blanks-around-headings',
  'heading-start-left',
  'no-duplicate-heading',
  'single-h1',
  'no-trailing-punctuation',
  'no-emphasis-as-heading',
  'first-line-h1',
  'required-headings',
  'no-trailing-spaces',
  'no-hard-tabs',
  'no-multiple-blanks',
  'line-length',
  'single-trailing-newline',
  'hr-style',
  'ul-style',
  'list-indent',
  'ul-indent',
  'ol-prefix',
  'list-marker-space',
  'blanks-around-lists',
  'no-reversed-links',
  'commands-show-output',
  'blanks-around-fences',
  'no-space-in-emphasis',
  'no-space-in-code',
  'no-space-in-links',
  'fenced-code-language',
  'no-empty-links',
  'code-block-style',
  'code-fence-style',
  'no-inline-html',
  'no-bare-urls',
  'proper-names',
  'no-alt-text',
  'emphasis-style',
  'strong-style',
  'link-fragments',
  'reference-links-images',
  'link-image-reference-definitions',
  'link-image-style',
  'descriptive-link-text',
  'no-multiple-space-blockquote',
  'no-blanks-blockquote',
  'table-pipe-style',
  'table-column-count',
  'blanks-around-tables',
  'table-column-style',
];

/**
 * Explicit message overrides for markdown preset rules, keyed by (short)
 * rule name. Only needed for scope rules (which have no `defaults.message`
 * to derive from) or to override a token rule's own default wording — see
 * registerPresetRules/defaultMessageFor above. Empty today: every rule in
 * MARKDOWN_PRESET_RULES is a token rule and derives its message from its own
 * `defaults.message`. (`no-trailing-spaces` and `no-hard-tabs` needed
 * entries here before Task 11 removed the legacy scope rules that used to
 * shadow them via `resolveAssertion`'s scope-first resolution.)
 */
export const MARKDOWN_PRESET_MESSAGES: Record<string, string> = {};

export function buildMarkdownPreset(): RecheckConfig {
  return registerPresetRules(MARKDOWN_PRESET_RULES, MARKDOWN_PRESET_MESSAGES);
}
