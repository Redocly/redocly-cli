import { JSONPath } from 'jsonpath-plus';

function cleanPattern(pattern: string | undefined): string {
  return pattern ? pattern.replace(/^["']|["']$/g, '') : '';
}

// Helper function to normalize property names (hyphens to underscores)
function normalizePropertyNames(path: string): string {
  return path.replace(/\.([a-zA-Z0-9_-]+)/g, (_: string, prop: string) => {
    return '.' + prop.replace(/-/g, '_');
  });
}

export function evaluateJSONPAthCondition(condition: string, context: Record<string, unknown>) {
  // RFC 9535 https://www.rfc-editor.org/rfc/rfc9535#name-length-function-extension

  const FUNCTION_EXTENSIONS = {
    length: (path: string, context: Record<string, unknown>) => {
      const result = JSONPath({ path, json: context });
      if (result.length === 0) return 0;
      return Array.isArray(result[0]) ? result[0].length : result.length;
    },
    count: (path: string, context: Record<string, unknown>) => {
      const result = JSONPath({ path, json: context });
      return result.length;
    },
    value: (path: string, context: Record<string, unknown>) => {
      const result = JSONPath({ path, json: context });
      return result[0] ?? null;
    },
    match: (path: string, context: Record<string, unknown>, pattern: string) => {
      const result = JSONPath({ path, json: context });
      if (result.length === 0) return false;
      const value = result[0];
      if (typeof value !== 'string') return false;
      try {
        const regex = new RegExp(pattern);
        return regex.test(value);
      } catch {
        return false;
      }
    },
    search: (path: string, context: Record<string, unknown>, pattern: string) => {
      const result = JSONPath({ path, json: context });
      if (result.length === 0) return -1;
      const value = result[0];
      if (typeof value !== 'string') return -1;
      try {
        const regex = new RegExp(pattern);
        const match = value.search(regex);
        return match;
      } catch {
        return -1;
      }
    },
  };

  // Optimized function handlers mapping
  const functionHandlers = {
    value: (normalizedPath: string, context: Record<string, unknown>) => {
      const result = FUNCTION_EXTENSIONS.value(normalizedPath, context);
      return JSON.stringify(result);
    },
    length: (normalizedPath: string, context: Record<string, unknown>) => {
      const result = FUNCTION_EXTENSIONS.length(normalizedPath, context);
      return String(result);
    },
    count: (normalizedPath: string, context: Record<string, unknown>) => {
      const result = FUNCTION_EXTENSIONS.count(normalizedPath, context);
      return String(result);
    },
    match: (
      normalizedPath: string,
      context: Record<string, unknown>,
      pattern: string | undefined
    ) => {
      const cleanPatternValue = cleanPattern(pattern);
      const result = FUNCTION_EXTENSIONS.match(normalizedPath, context, cleanPatternValue);
      return String(result);
    },
    search: (
      normalizedPath: string,
      context: Record<string, unknown>,
      pattern: string | undefined
    ) => {
      const cleanPatternValue = cleanPattern(pattern);
      const result = FUNCTION_EXTENSIONS.search(normalizedPath, context, cleanPatternValue);
      return String(result);
    },
  };

  try {
    // Preprocess top-level function calls like length($.path), count($.path), value($.path), match($.path, pattern), search($.path, pattern)
    // Manual parsing to handle quoted patterns correctly
    let workingCondition = condition;
    const functionNames = ['length', 'count', 'value', 'match', 'search'];

    for (const funcName of functionNames) {
      const funcPattern = new RegExp(
        `${funcName}\\(\\s*(\\$[^)]+?)(?:\\s*,\\s*([^)]+))?\\s*\\)`,
        'g'
      );
      workingCondition = workingCondition.replace(funcPattern, (match, rawPath, pattern) => {
        const normalizedPath = normalizePropertyNames(rawPath);

        const handler = functionHandlers[funcName as keyof typeof functionHandlers];
        if (handler) {
          return handler(normalizedPath, context, pattern);
        }

        return match;
      });
    }

    // Parse and extract all JSONPath expressions from the condition
    const jsonpathExpressions: Array<{ expression: string; start: number; end: number }> = [];
    let i = 0;

    while (i < workingCondition.length) {
      if (workingCondition[i] === '$') {
        const start = i;
        let jsonpath = '$';
        let bracketDepth = 0;
        let inQuotes = false;
        let quoteChar = '';
        let inFilter = false;
        let filterDepth = 0;

        i++; // Skip the '$'

        while (i < workingCondition.length) {
          const char = workingCondition[i];

          // Handle quoted strings (for bracket notation)
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

          // Handle brackets and filters
          if (char === '[') {
            bracketDepth++;
            if (workingCondition[i + 1] === '?') {
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

        if (jsonpath.length > 1) {
          jsonpathExpressions.push({
            expression: jsonpath,
            start,
            end: i,
          });
        }
      } else {
        i++;
      }
    }

    // Process JSONPath expressions in reverse order to maintain correct indices
    let replacedCondition = workingCondition;

    for (let j = jsonpathExpressions.length - 1; j >= 0; j--) {
      const { expression, start, end } = jsonpathExpressions[j];
      let replacement = '';
      let handled = false;

      // Check for function extensions first
      for (const [funcName] of Object.entries(FUNCTION_EXTENSIONS)) {
        const funcPattern = new RegExp(`\\.${funcName}\\(\\)$`);
        if (funcPattern.test(expression)) {
          const basePath = expression.replace(funcPattern, '');
          const normalizedPath = normalizePropertyNames(basePath);

          // Handle functions that require different numbers of arguments
          if (funcName === 'match' || funcName === 'search') {
            // These functions require a pattern, but we don't have one in this context
            // So we'll skip them here and let them be handled by the top-level preprocessing
            continue;
          }

          // For functions that only need path and context
          if (funcName === 'length') {
            replacement = String(FUNCTION_EXTENSIONS.length(normalizedPath, context));
          } else if (funcName === 'count') {
            replacement = String(FUNCTION_EXTENSIONS.count(normalizedPath, context));
          } else if (funcName === 'value') {
            replacement = String(FUNCTION_EXTENSIONS.value(normalizedPath, context));
          }
          handled = true;
          break;
        }
      }

      // Handle legacy .length suffix for backward compatibility
      if (!handled && expression.endsWith('.length')) {
        const basePath = expression.slice(0, -'.length'.length);
        const normalizedPath = normalizePropertyNames(basePath);
        const jsonpathResult = JSONPath({ path: normalizedPath, json: context });
        const jsonpathResultValue = jsonpathResult[0] ?? null;
        replacement = Array.isArray(jsonpathResultValue) ? String(jsonpathResultValue.length) : '0';
        handled = true;
      }

      // Handle regular JSONPath expressions (including filters)
      if (!handled) {
        // Check if this is a filter expression with function extensions
        if (expression.includes('[?(') && expression.includes(')]')) {
          // This is a filter expression, we need to handle it specially
          const filterMatch = expression.match(/\[\?\((.*)\)\]/);
          if (filterMatch) {
            const filterCondition = filterMatch[1];

            // Extract the base path correctly - everything before the filter
            const basePath = expression.substring(0, expression.indexOf('[?('));

            // Get the array to filter
            const normalizedBasePath = normalizePropertyNames(basePath);
            const jsonpathResult = JSONPath({ path: normalizedBasePath, json: context });

            // Flatten the result in case JSONPath returns nested arrays
            const arrayToFilter = Array.isArray(jsonpathResult)
              ? jsonpathResult.flat()
              : jsonpathResult;

            if (!Array.isArray(arrayToFilter)) {
              replacement = 'false';
            } else {
              // Filter the array based on the condition
              const filteredArray = arrayToFilter.filter((item: any) => {
                // Convert the filter condition to work with the current item
                let convertedCondition = filterCondition;

                // Handle @.property.match(/pattern/) expressions
                convertedCondition = convertedCondition.replace(
                  /@\.([a-zA-Z0-9_-]+)\.match\(([^)]+)\)/g,
                  (_: string, prop: string, pattern: string) => {
                    const normalizedProp = prop.replace(/-/g, '_');
                    const value = item[normalizedProp];
                    if (typeof value !== 'string') return 'false';

                    try {
                      // Remove quotes and slashes from pattern if present
                      let cleanPattern = pattern.replace(/^["']|["']$/g, ''); // Remove quotes
                      cleanPattern = cleanPattern.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes

                      const regex = new RegExp(cleanPattern);
                      const result = regex.test(value);
                      return String(result);
                    } catch {
                      return 'false';
                    }
                  }
                );

                // Handle @.property expressions (simple property access)
                convertedCondition = convertedCondition.replace(
                  /@\.([a-zA-Z0-9_-]+)/g,
                  (_: string, prop: string) => {
                    const normalizedProp = prop.replace(/-/g, '_');
                    const value = item[normalizedProp];
                    return JSON.stringify(value);
                  }
                );

                // Replace length() function calls with actual values
                convertedCondition = convertedCondition.replace(
                  /length\(([^)]+)\)/g,
                  (_: string, path: string) => {
                    const normalizedPath = normalizePropertyNames(path);
                    const result = FUNCTION_EXTENSIONS.length(normalizedPath, { '@': item });
                    return String(result);
                  }
                );

                // Evaluate the condition for this specific item
                try {
                  const safeEval = new Function(
                    'item',
                    `
                    return ${convertedCondition};
                  `
                  );
                  const result = safeEval(item);
                  return !!result;
                } catch (error) {
                  console.warn(
                    `Filter expression evaluation failed for item: ${convertedCondition}`,
                    error
                  );
                  return false;
                }
              });

              // Now we need to extract the property after the filter
              const afterFilter = expression.substring(expression.indexOf(')]') + 2);
              if (afterFilter.startsWith('.')) {
                // Extract the property name after the filter
                const propertyMatch = afterFilter.match(/\.([a-zA-Z0-9_-]+)/);
                if (propertyMatch) {
                  const propertyName = propertyMatch[1].replace(/-/g, '_');
                  // Get the property from each filtered item
                  const propertyValues = filteredArray.map((item: any) => item[propertyName]);
                  replacement = JSON.stringify(propertyValues);
                } else {
                  // Fix: Check if filtered array is empty and return 'false' instead of '[]'
                  replacement = filteredArray.length > 0 ? JSON.stringify(filteredArray) : 'false';
                }
              } else {
                // Fix: Check if filtered array is empty and return 'false' instead of '[]'
                replacement = filteredArray.length > 0 ? JSON.stringify(filteredArray) : 'false';
              }
            }
          } else {
            replacement = 'false';
          }
        } else {
          // Regular JSONPath expression
          const normalizedPath = normalizePropertyNames(expression);
          const jsonpathResult = JSONPath({ path: normalizedPath, json: context });
          const jsonpathResultValue = jsonpathResult[0] ?? null;
          replacement = JSON.stringify(jsonpathResultValue);
        }
      }

      // Replace the expression in the condition
      replacedCondition =
        replacedCondition.slice(0, start) + replacement + replacedCondition.slice(end);
    }

    // Evaluate the final logical expression
    const evaluateFn = new Function(`return ${replacedCondition};`);
    return !!evaluateFn();
  } catch (error) {
    console.warn(`JSONPath evaluation failed for condition "${condition}":`, error);
    return false;
  }
}
