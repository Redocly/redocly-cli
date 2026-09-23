const TEMPLATE_EXPRESSION = /\{[^}]+\}/g;

/** The names of the template expressions in a path, in the order they appear. */
export function templateParameterNames(template: string): string[] {
  return [...template.matchAll(TEMPLATE_EXPRESSION)].map(([expression]) => expression.slice(1, -1));
}

/** The path with its template names replaced by their positions: `/pets/{id}` → `/pets/{0}`. */
export function templateShape(template: string): string {
  let position = 0;
  return template.replace(TEMPLATE_EXPRESSION, () => `{${position++}}`);
}
