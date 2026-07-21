export default function updateExampleDates() {
  return {
    // Covers the 'examples' keyword (including examples in the 'components' section)
    Example: {
      enter(example) {
        traverseAndReplaceWithComputedDateTime(example.value);
      },
    },
    // Covers the 'example' in media type objects
    MediaType: {
      enter(mediaTypeObject) {
        if (mediaTypeObject.example) {
          traverseAndReplaceWithComputedDateTime(mediaTypeObject.example);
        }
      },
    },
    // Covers the 'example' in schemas
    Schema: {
      enter(schema) {
        if (schema.example) {
          traverseAndReplaceWithComputedDateTime(schema);
        }
      },
    },
  };
}

function traverseAndReplaceWithComputedDateTime(value) {
  if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      if (typeof value[key] === 'string' && /\$DateTimeNow/.test(value[key])) {
        // Replacing the template with a computed datetime value
        value[key] = computeDateTemplate(value[key]);
      } else {
        traverseAndReplaceWithComputedDateTime(value[key]);
      }
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
