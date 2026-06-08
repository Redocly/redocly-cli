import type { Location } from '../ref-utils.js';
import type { UserContext } from '../walk.js';

/** Build a PascalCase component key from a `title`; `null` if empty or has unsupported characters. */
export function titleToPascalCase(title: string): string | null {
  const tokens = title.trim().split(/\s+/);
  for (const token of tokens) {
    // Allowed characters mirror the OpenAPI/AsyncAPI component-key pattern.
    if (!/^[A-Za-z0-9.\-_]+$/.test(token)) {
      return null;
    }
  }
  return tokens.map((token) => token.replace(/^[a-z]/, (c) => c.toUpperCase())).join('');
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
