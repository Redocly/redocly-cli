import type { Location } from '../ref-utils.js';
import type { UserContext } from '../walk.js';

/** Build a PascalCase component key from a `title`; `null` if empty or has unsupported characters. */
export function titleToPascalCase(title: string): string | null {
  const tokens = title
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return null;
  }
  for (const token of tokens) {
    if (!/^[A-Za-z0-9.\-_]+$/.test(token)) {
      return null;
    }
  }
  return tokens
    .map((token) => {
      const first = token[0];
      if (first >= 'a' && first <= 'z') {
        return first.toUpperCase() + token.slice(1);
      }
      return token;
    })
    .join('');
}

/** Schema component name from its `title`; errors and returns `null` if missing or unusable. */
export function buildSchemaNameFromTitle(
  target: { node: unknown; location: Location },
  ctx: UserContext
): string | null {
  const node = target.node as { title?: unknown } | null;
  const title = typeof node?.title === 'string' ? node.title : '';
  if (title.trim() === '') {
    ctx.report({
      message: `Schema must define a \`title\` to build a component name.`,
      location: target.location,
      forceSeverity: 'error',
    });
    return null;
  }
  const name = titleToPascalCase(title);
  if (name === null) {
    ctx.report({
      message:
        `Title "${title}" can't be turned into a component name. ` +
        `Use only letters, digits, \`.\`, \`-\`, \`_\`, and spaces.`,
      location: target.location.child('title'),
      forceSeverity: 'error',
    });
    return null;
  }
  return name;
}
