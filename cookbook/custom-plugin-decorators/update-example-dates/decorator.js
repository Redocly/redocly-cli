export default function updateExampleDates() {
  return {
    // Covers the 'examples' keyword (including examples in the 'components' section)
    Example: {
      enter(example) {
        replaceWithComputedDateTime(example, 'value');
      },
    },
    // Covers the 'example' in media type objects
    MediaType: {
      enter(mediaTypeObject) {
        replaceWithComputedDateTime(mediaTypeObject, 'example');
      },
    },
    // Covers the 'example' in schemas
    Schema: {
      enter(schema) {
        replaceWithComputedDateTime(schema, 'example');
      },
    },
  };
}

// Replaces the value at parent[key] when it is a string containing the template,
// or traverses it when it is an object
function replaceWithComputedDateTime(parent, key) {
  const value = parent[key];
  if (typeof value === 'string' && /\$DateTimeNow/.test(value)) {
    parent[key] = computeDateTemplate(value);
  } else {
    traverseAndReplaceWithComputedDateTime(value);
  }
}

function traverseAndReplaceWithComputedDateTime(value) {
  if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      replaceWithComputedDateTime(value, key);
    }
  }
}

function computeDateTemplate(template) {
  const substitutedExpression = template
    .replace('$DateTimeNow', Date.now()) // Replacing the variable with the current date in milliseconds
    .replace(/(\d+)\s*days?/g, (_, t) => t * 1000 * 60 * 60 * 24) // Replacing days with milliseconds
    .trim();
  const calculated = substitutedExpression // A basic calculator
    .split(/\s*\+\s*/)
    .reduce((sum, item) => sum + +item, 0);
  return new Date(calculated).toISOString();
}
