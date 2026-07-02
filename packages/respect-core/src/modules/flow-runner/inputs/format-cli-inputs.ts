import { isPlainObject } from '@redocly/openapi-core';

export function formatCliInputs(input: string | string[] | undefined): Record<string, string> {
  if (!input) {
    return {};
  }

  if (Array.isArray(input)) {
    return input.reduce(
      (result, param) => {
        const parsed = parseParam(param);
        return { ...result, ...parsed };
      },
      {} as Record<string, string>
    );
  }

  return parseParam(input);
}

function parseParam(param: string): Record<string, string> {
  try {
    const parsedObject = JSON.parse(param);

    if (isPlainObject(parsedObject)) {
      return parsedObject as Record<string, string>;
    }
  } catch {
    // do nothing
  }

  if (typeof param === 'string') {
    // Handle comma-separated key-value pairs
    if (param.includes(',')) {
      return param.split(',').reduce(
        (acc, pair) => {
          const [key, value] = pair.split('=');
          if (key && value) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        },
        {} as Record<string, string>
      );
    }

    // Handle single key-value pair
    if (param.includes('=')) {
      const [key, value] = param.split('=');
      return { [key.trim()]: value.trim() };
    }
  }

  return {};
}
