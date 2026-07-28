/**
 * Custom oxlint rule: disallow 'typeof ... object' comparison,
 *
 * Rationale: `typeof x === 'object'` is true for `null` and arrays as well, and is
 * almost always a sign that a more precise check is wanted (e.g. an `isPlainObject`
 * helper, `Array.isArray`, an explicit `!= null` guard, or an `'in'` check).
 */

const TYPEOF_STRING = 'object';
const COMPARISON_OPS = new Set(['===', '==', '!==', '!=']);

function isTypeofExpression(node) {
  return node?.type === 'UnaryExpression' && node?.operator === 'typeof';
}

function isObjectStringLiteral(node) {
  if (node?.type === 'Literal') {
    return node.value === TYPEOF_STRING;
  }
  if (
    node?.type === 'TemplateLiteral' &&
    node?.expressions.length === 0 &&
    node?.quasis.length === 1
  ) {
    return node.quasis[0].value.cooked === TYPEOF_STRING;
  }
  return false;
}

const noTypeofObject = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow `typeof x === 'object'`; prefer a more precise check (isPlainObject helper, Array.isArray, != null guard, 'in' check).",
    },
    schema: [],
    messages: {
      noTypeofObject: "Avoid `typeof ... 'object'` comparison. Use `isPlainObject` helper instead.",
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        if (!COMPARISON_OPS.has(node.operator)) return;
        const matches =
          (isTypeofExpression(node.left) && isObjectStringLiteral(node.right)) ||
          (isTypeofExpression(node.right) && isObjectStringLiteral(node.left));
        if (matches) {
          context.report({ node, messageId: 'noTypeofObject' });
        }
      },
    };
  },
};

const plugin = {
  meta: {
    name: 'oxlint-redocly-plugin',
  },
  rules: {
    'no-typeof-object': noTypeofObject,
  },
};

export default plugin;
