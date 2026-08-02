// The built-in `python` generator — the first non-TypeScript library entry,
// authored the way the AGENTS.md skill teaches users' agents to author theirs:
// with the language-neutral toolkit only (CodeWriter + schema/naming helpers).
// A guard test pins that this module never imports the TS emitter toolkit.

import {
  CodeWriter,
  discriminatorCases,
  docText,
  enumValues,
  flattenAllOf,
  identifierFor,
  isNullable,
  RESERVED_WORDS,
  unwrapNullable,
} from '../authoring/index.js';
import type { ApiModel, PropertyModel, SchemaModel } from '../intermediate-representation/model.js';

const PY = RESERVED_WORDS.python;

/** A named schema's Python class name. */
function className(name: string): string {
  return identifierFor(name, { style: 'pascal', reserved: PY });
}

/** A field/parameter name, with the wire name preserved when sanitization renames it. */
function fieldName(name: string): { python: string; renamed: boolean } {
  const python = identifierFor(name, { style: 'snake', reserved: PY });
  return { python, renamed: python !== name };
}

/** The Python type annotation for a schema (anonymous complex shapes collapse to Any-ish). */
export function pythonType(schema: SchemaModel): string {
  if (isNullable(schema)) {
    return `Optional[${pythonType(unwrapNullable(schema))}]`;
  }
  switch (schema.kind) {
    case 'scalar':
      return { string: 'str', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'array':
      return `List[${pythonType(schema.items)}]`;
    case 'record':
      return `Dict[str, ${pythonType(schema.value)}]`;
    case 'ref':
      return className(schema.name);
    case 'literal':
      return `Literal[${JSON.stringify(schema.value)}]`;
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get classes.
      return { string: 'str', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'union':
      return `Union[${schema.members.map(pythonType).join(', ')}]`;
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

function writeDocstring(writer: CodeWriter, description?: string): void {
  const lines = docText(description);
  if (lines.length === 0) return;
  if (lines.length === 1) {
    writer.line(`"""${lines[0]}"""`);
    return;
  }
  writer.line(`"""${lines[0]}`);
  for (const line of lines.slice(1)) writer.line(line);
  writer.line('"""');
}

function writeDataclass(
  writer: CodeWriter,
  name: string,
  properties: PropertyModel[],
  description?: string
): void {
  writer.line('@dataclass');
  writer.block(`class ${className(name)}:`, () => {
    writeDocstring(writer, description);
    // Required fields first — a dataclass field without a default may not follow one with.
    const ordered = [
      ...properties.filter((property) => property.required),
      ...properties.filter((property) => !property.required),
    ];
    const fieldMap: Array<[string, string]> = [];
    if (ordered.length === 0) writer.line('pass');
    for (const property of ordered) {
      const { python, renamed } = fieldName(property.name);
      if (renamed) fieldMap.push([python, property.name]);
      const baseType = pythonType(property.schema);
      if (property.required) {
        writer.line(`${python}: ${baseType}`);
      } else {
        const optional = baseType.startsWith('Optional[') ? baseType : `Optional[${baseType}]`;
        writer.line(`${python}: ${optional} = None`);
      }
    }
    if (fieldMap.length > 0) {
      writer.blank();
      writer.line('# Python field name -> wire (JSON) name, for (de)serialization.');
      const entries = fieldMap.map(([py, wire]) => `"${py}": ${JSON.stringify(wire)}`).join(', ');
      writer.line(`_field_map: ClassVar[Dict[str, str]] = {${entries}}`);
    }
  });
  writer.blank();
  writer.blank();
}

/** Render every named schema: Enum classes, dataclasses (allOf flattened), union aliases. */
export function renderPythonModels(model: ApiModel): string {
  const writer = new CodeWriter('    ');
  writer.line('from __future__ import annotations');
  writer.blank();
  writer.line('from dataclasses import dataclass');
  writer.line('from enum import Enum');
  writer.line('from typing import Any, ClassVar, Dict, List, Literal, Optional, Union');
  writer.blank();
  writer.blank();

  const aliases: Array<() => void> = [];
  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined) {
      const base = asEnum.scalar === 'string' ? 'str, Enum' : 'int, Enum';
      writer.block(`class ${className(name)}(${base}):`, () => {
        writeDocstring(writer, schema.description);
        asEnum.values.forEach((value, index) => {
          writer.line(`${asEnum.memberNames[index]} = ${JSON.stringify(value)}`);
        });
      });
      writer.blank();
      writer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeDataclass(writer, name, flat.properties, flat.description ?? schema.description);
        continue;
      }
    }
    // Everything else (unions, scalar aliases, records) becomes a module-level alias,
    // emitted AFTER the classes it references so the assignment evaluates.
    aliases.push(() => {
      const cases = discriminatorCases(schema, model);
      if (cases !== undefined) {
        const table = cases.cases
          .map((entry) => `${entry.value} -> ${className(entry.schemaName)}`)
          .join(', ');
        writer.line(`# Discriminated by "${cases.property}": ${table}`);
      }
      writer.line(`${className(name)} = ${pythonType(schema)}`);
      writer.blank();
    });
  }
  for (const emit of aliases) emit();
  return writer.toString();
}
