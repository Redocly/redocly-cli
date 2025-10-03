import { query, type JsonValue } from 'jsonpath-rfc9535';

export function evaluateJSONPathCondition(condition: string, context: JsonValue) {
  try {
    const jsonpathExpressions = parseJSONPathExpressions(condition);
    let replacedCondition = condition;

    for (let j = jsonpathExpressions.length - 1; j >= 0; j--) {
      const { expression, start, end } = jsonpathExpressions[j];
      const replacement = evaluateExpression(expression, context);

      replacedCondition =
        replacedCondition.slice(0, start) + replacement + replacedCondition.slice(end);
    }

    const evaluateFn = new Function(`return ${replacedCondition};`);
    return !!evaluateFn();
  } catch (error) {
    return false;
  }
}

function parseJSONPathExpressions(condition: string) {
  const jsonpathExpressions: Array<{ expression: string; start: number; end: number }> = [];
  let i = 0;

  while (i < condition.length) {
    if (condition[i] === '$') {
      const start = i;
      const jsonpath = parseSingleJSONPath(condition, i);

      if (jsonpath.expression.length > 1) {
        jsonpathExpressions.push({
          expression: jsonpath.expression,
          start,
          end: jsonpath.end,
        });
      }
      i = jsonpath.end;
    } else {
      i++;
    }
  }

  return jsonpathExpressions;
}

function parseSingleJSONPath(
  condition: string,
  startIndex: number
): { expression: string; end: number } {
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
      if (condition[i + 1] === '?') {
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

  return { expression: jsonpath, end: i };
}

function evaluateExpression(expression: string, context: JsonValue): string {
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
  const value = result[0] ?? null;
  return JSON.stringify(value);
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
