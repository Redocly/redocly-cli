import { query, type JsonValue } from 'jsonpath-rfc9535';

export function evaluateJSONPathCondition(condition: string, context: JsonValue) {
  try {
    const resolvedCondition = parseExpressions(condition, context);
    const evaluateFn = new Function(`return ${resolvedCondition};`);

    return !!evaluateFn();
  } catch (error) {
    return false;
  }
}

function parseExpressions(condition: string, context: JsonValue): string {
  const expressionsParts: Array<string> = [];

  let i = 0;
  let expressionElements = '';

  while (i < condition.length) {
    if (condition[i] === '$') {
      if (expressionElements.length > 0) {
        expressionsParts.push(expressionElements);
        expressionElements = '';
      }
      const start = i;
      const expression = parseSingleJSONPath(condition, i);

      if (expression.length > 1) {
        const evaluatedExpression = evaluateJSONPathExpression(expression, context);

        expressionsParts.push(evaluatedExpression);
      }
      i = start + expression.length;
    } else {
      expressionElements += condition[i];
      i++;
    }
  }

  // Push any remaining content after the while loop
  if (expressionElements.length > 0) {
    expressionsParts.push(expressionElements);
  }

  return expressionsParts.join('');
}

function parseSingleJSONPath(condition: string, startIndex: number): string {
  let jsonpath = '$';
  let bracketDepth = 0;
  let inQuotes = false;
  let quoteChar = '';
  let inFilter = false;
  let filterDepth = 0;
  let i = startIndex + 1; // Skip the '$'

  while (i < condition.length) {
    const char = condition[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      jsonpath += char;
      i++;
      continue;
    }

    if (char === quoteChar && inQuotes) {
      inQuotes = false;
      jsonpath += char;
      i++;
      continue;
    }

    if (inQuotes) {
      jsonpath += char;
      i++;
      continue;
    }

    if (char === '[') {
      bracketDepth++;
      if (i + 1 < condition.length && condition[i + 1] === '?') {
        inFilter = true;
        filterDepth = bracketDepth;
      }
      jsonpath += char;
      i++;
      continue;
    }

    if (char === ']') {
      bracketDepth--;
      if (inFilter && bracketDepth < filterDepth) {
        inFilter = false;
      }
      jsonpath += char;
      i++;
      continue;
    }

    // Stop at logical operators, comparison operators, or whitespace (outside of filters)
    if (!inFilter && (/\s/.test(char) || /[<>=!&|,)]/.test(char))) {
      break;
    }

    jsonpath += char;
    i++;
  }

  return jsonpath;
}

function evaluateJSONPathExpression(expression: string, context: JsonValue): string {
  // Handle legacy .length suffix for backward compatibility that is not a valid RFC 9535 expression
  if (expression.endsWith('.length')) {
    const basePath = expression.slice(0, -'.length'.length);
    const normalizedPath = transformHyphensToUnderscores(basePath);
    const result = query(context, normalizedPath);
    const value = result[0] ?? null;
    return Array.isArray(value) ? String(value.length) : '0';
  }

  if (expression.includes('[?(') && expression.includes(')]')) {
    return handleFilterExpression(expression, context);
  }

  const normalizedPath = transformHyphensToUnderscores(expression);
  const result = query(context, normalizedPath);
  return JSON.stringify(result[0]);
}

function handleFilterExpression(expression: string, context: JsonValue): string {
  const filterMatch = expression.match(/\[\?\((.*)\)\]/);
  if (!filterMatch) return 'false';

  const filterCondition = filterMatch[1];
  const basePath = expression.substring(0, expression.indexOf('[?('));
  const normalizedBasePath = transformHyphensToUnderscores(basePath);
  const jsonpathResult = query(context, normalizedBasePath);

  // Flatten the result in case JSONPath returns nested arrays
  const arrayToFilter = Array.isArray(jsonpathResult) ? jsonpathResult.flat() : jsonpathResult;

  if (!Array.isArray(arrayToFilter)) {
    return 'false';
  }

  const filteredArray = arrayToFilter.filter((item: unknown) => {
    const convertedCondition = processFilterCondition(filterCondition, item);

    try {
      const safeEval = new Function('item', `return ${convertedCondition};`);
      return !!safeEval(item);
    } catch {
      return false;
    }
  });

  const afterFilter = expression.substring(expression.indexOf(')]') + 2);

  if (afterFilter.startsWith('.')) {
    const propertyMatch = afterFilter.match(/\.([a-zA-Z0-9_-]+)/);
    if (propertyMatch) {
      const propertyName = propertyMatch[1].replace(/-/g, '_');
      const propertyValues = filteredArray.map(
        (item: unknown) => (item as Record<string, unknown>)[propertyName]
      );
      return JSON.stringify(propertyValues);
    }
  }

  return filteredArray.length > 0 ? JSON.stringify(filteredArray) : 'false';
}

function processFilterCondition(filterCondition: string, item: unknown): string {
  let convertedCondition = filterCondition;

  // Handle @.property.match(/pattern/) expressions
  convertedCondition = convertedCondition.replace(
    /@\.([a-zA-Z0-9_-]+)\.match\(([^)]+)\)/g,
    (_, prop: string, pattern: string) => {
      const normalizedProp = prop.replace(/-/g, '_');
      const value = (item as Record<string, unknown>)[normalizedProp];
      if (typeof value !== 'string') return 'false';

      try {
        let cleanPattern = pattern.replace(/^["']|["']$/g, ''); // Remove quotes
        cleanPattern = cleanPattern.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
        const regex = new RegExp(cleanPattern);
        return String(regex.test(value));
      } catch {
        return 'false';
      }
    }
  );

  // Handle @.property expressions (simple property access)
  convertedCondition = convertedCondition.replace(/@\.([a-zA-Z0-9_-]+)/g, (_, prop: string) => {
    const normalizedProp = prop.replace(/-/g, '_');
    const value = (item as Record<string, unknown>)[normalizedProp];
    return JSON.stringify(value);
  });

  return convertedCondition;
}

function transformHyphensToUnderscores(path: string): string {
  return path.replace(/\.([a-zA-Z0-9_-]+)/g, (_, prop) => '.' + prop.replace(/-/g, '_'));
}
