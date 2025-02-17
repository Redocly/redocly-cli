const JsonPointer = require('json-pointer');

export function replaceJSONPointers(expression: string, context: any): string {
  const jsonPointerReplacementRules = [
    {
      pattern: /\$response\.body#\/([\w\/]+)/g,
      ctxFunction: (match: string, pointer: string) => {
        return resolvePointer(context.$response?.body, pointer, match);
      },
    },
    {
      pattern: /\$request\.body#\/([\w\/]+)/g,
      ctxFunction: (match: string, pointer: string) => {
        return resolvePointer(context.$request?.body, pointer, match);
      },
    },
    {
      pattern: /\$outputs\.([\w\-A-Za-z0-9_]+)#\/([\w\/]+)/g,
      ctxFunction: (match: string, property: string, pointer: string) => {
        return resolvePointer(context.$outputs?.[property], pointer, match);
      },
    },
    {
      pattern: /\$workflows\.([\w\-A-Za-z0-9_]+)\.outputs\.([\w\-A-Za-z0-9_]+)#\/([\w\/]+)/g,
      ctxFunction: (match: string, workflowId: string, property: string, pointer: string) => {
        return resolvePointer(
          context.$workflows?.[workflowId]?.outputs?.[property],
          pointer,
          match
        );
      },
    },
    {
      pattern: /\$steps\.([\w\-A-Za-z0-9_]+)\.outputs\.([\w\-A-Za-z0-9_]+)#\/([\w\/]+)/g,
      ctxFunction: (match: string, stepId: string, property: string, pointer: string) => {
        return resolvePointer(context.$steps?.[stepId]?.outputs?.[property], pointer, match);
      },
    },
  ];

  let result = expression;
  for (const { pattern, ctxFunction } of jsonPointerReplacementRules) {
    result = result.replaceAll(pattern, ctxFunction);
  }

  return result;
}

function resolvePointer(sourceContext: any, pointer: string, fallbackMatch: string): string {
  if (sourceContext) {
    try {
      const value = JsonPointer.get(sourceContext, `/${pointer}`);
      if (typeof value === 'string') {
        return JSON.stringify(value); // Safely quote the strings
      }
      if (Array.isArray(value) || typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value !== undefined ? value : fallbackMatch;
    } catch (_error) {
      return fallbackMatch;
    }
  }
  return fallbackMatch;
}
