import { query, type JsonValue } from 'jsonpath-rfc9535';

export function evaluateJSONPathCondition(condition: string, context: JsonValue): boolean {
  try {
    const result = query([context], condition);
    return result.length > 0;
  } catch {
    return false;
  }
}
