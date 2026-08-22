// The `types` stage: schema → Python type annotation.

import { isNullable, unwrapNullable, type DateType } from '../../authoring/index.js';
import type { SchemaModel } from '../../intermediate-representation/model.js';
import { className, naming } from './naming.js';

/** The Python type annotation for a schema (anonymous complex shapes collapse to Any-ish). */
export function pythonType(schema: SchemaModel, dateType: DateType = 'string'): string {
  if (isNullable(schema)) {
    return `Optional[${pythonType(unwrapNullable(schema), dateType)}]`;
  }
  switch (schema.kind) {
    case 'scalar':
      // `dateType: Date` annotates date/date-time as stdlib objects; `_decode.py`
      // converts them from and to ISO strings on the wire.
      if (dateType === 'Date' && schema.scalar === 'string') {
        if (schema.metadata?.format === 'date-time') return 'datetime';
        if (schema.metadata?.format === 'date') return 'date';
      }
      return { string: 'str', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'array':
      return `List[${pythonType(schema.items, dateType)}]`;
    case 'record':
      return `Dict[str, ${pythonType(schema.value, dateType)}]`;
    case 'ref':
      return className(schema.name);
    case 'literal':
      return `Literal[${naming.literal(schema.value)}]`;
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get classes.
      return { string: 'str', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'union':
      return `Union[${schema.members.map((member) => pythonType(member, dateType)).join(', ')}]`;
    case 'null':
      return 'None';
    case 'omit':
      // Python has no Omit; the base class is the honest annotation (readOnly
      // fields are server-managed and simply absent on requests).
      return className(schema.base);
    case 'object':
    case 'intersection':
    case 'unknown':
      return 'Any';
  }
}
