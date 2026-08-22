// The `types` stage: the Go type annotation for a schema.

import { isNullable, unwrapNullable, type DateType } from '../../authoring/index.js';
import type { SchemaModel } from '../../intermediate-representation/model.js';
import { exported } from '../../printers/go.js';

/** The Go type for a schema; `required=false` optionals become pointers at the field site. */
export function goType(schema: SchemaModel, dateType: DateType = 'string'): string {
  if (isNullable(schema)) {
    const inner = goType(unwrapNullable(schema), dateType);
    return inner.startsWith('*') || inner === 'any' ? inner : `*${inner}`;
  }
  switch (schema.kind) {
    case 'scalar':
      // Under `dateType: Date`, a date-time is a time.Time (encoding/json handles
      // RFC 3339 natively) and a bare date is the runtime's `Date` wrapper.
      if (dateType === 'Date' && schema.scalar === 'string') {
        if (schema.metadata?.format === 'date-time') return 'time.Time';
        if (schema.metadata?.format === 'date') return 'Date';
      }
      return { string: 'string', integer: 'int64', number: 'float64', boolean: 'bool' }[
        schema.scalar
      ];
    case 'array':
      return `[]${goType(schema.items, dateType)}`;
    case 'record':
      return `map[string]${goType(schema.value, dateType)}`;
    case 'ref':
      return exported(schema.name);
    case 'literal':
      return typeof schema.value === 'string'
        ? 'string'
        : typeof schema.value === 'boolean'
          ? 'bool'
          : 'float64';
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get types.
      return { string: 'string', integer: 'int64', number: 'float64', boolean: 'bool' }[
        schema.scalar
      ];
    case 'omit':
      // Go has no Omit; the base struct is the honest annotation (readOnly
      // fields are server-managed and simply omitted from requests).
      return exported(schema.base);
    case 'union':
    case 'null':
    case 'object':
    case 'intersection':
    case 'unknown':
      return 'any';
  }
}
