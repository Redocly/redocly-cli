// The `models` stage: named schemas as Enum classes, dataclasses/pydantic models
// (allOf flattened), union aliases, and the decoder's discriminator registrations.

import {
  type ApiModel,
  type DateType,
  discriminatorCases,
  enumValues,
  flattenAllOf,
  type PropertyModel,
} from '@redocly/client-generator';
import { PythonPrinter } from '@redocly/client-generator/printers/python';

import { className, fieldName, naming } from './naming.js';
import { pythonType } from './types.js';

/** The model style the generator emits: plain dataclasses, or pydantic `BaseModel`s. */
export type PythonModels = 'dataclass' | 'pydantic';

/** The wire property and value a union's discriminator mapping pins on one member class. */
export type DiscriminatorPin = { property: string; value: string };

/**
 * Under `models: pydantic` the decoder hands a whole object tree to `model_validate`, so a
 * union nested in a model is resolved by pydantic and never reaches the `DISCRIMINATORS`
 * table. Pydantic resolves it correctly when the annotation carries the discriminator, which
 * it accepts only if every member types that property as a `Literal` — and the mapping
 * already pins one value per member. This pass works out which unions qualify: every member
 * must declare the property, and no member may be pinned to two different values (a schema
 * reused by two unions).
 */
export function pydanticDiscriminators(model: ApiModel): {
  pins: Map<string, DiscriminatorPin>;
  unions: Map<string, string>;
} {
  const pins = new Map<string, DiscriminatorPin>();
  const conflicted = new Set<string>();
  const candidates: Array<{ name: string; property: string; members: string[] }> = [];
  for (const { name, schema } of model.schemas) {
    const cases = discriminatorCases(schema, model);
    if (cases === undefined) continue;
    const declares = cases.cases.every(
      (entry) =>
        flattenAllOf(entry.schema, model)?.properties.some(
          (property) => property.name === cases.property
        ) === true
    );
    if (!declares) continue;
    for (const entry of cases.cases) {
      const existing = pins.get(entry.schemaName);
      if (existing !== undefined && existing.value !== entry.value) {
        conflicted.add(entry.schemaName);
        continue;
      }
      pins.set(entry.schemaName, { property: cases.property, value: entry.value });
    }
    candidates.push({
      name,
      property: cases.property,
      members: cases.cases.map((entry) => entry.schemaName),
    });
  }
  const unions = new Map<string, string>();
  for (const candidate of candidates) {
    if (candidate.members.some((member) => conflicted.has(member))) continue;
    unions.set(candidate.name, fieldName(candidate.property).python);
  }
  for (const member of conflicted) pins.delete(member);
  return { pins, unions };
}

function writeDataclass(
  printer: PythonPrinter,
  name: string,
  properties: PropertyModel[],
  dateType: DateType,
  models: PythonModels,
  description?: string,
  /** The discriminator value this class is mapped to, pinned as a `Literal` (pydantic). */
  pinned?: DiscriminatorPin
): void {
  const pydantic = models === 'pydantic';
  if (!pydantic) printer.line('@dataclass');
  const header = pydantic ? `class ${className(name)}(BaseModel):` : `class ${className(name)}:`;
  printer.block(header, () => {
    printer.doc(description);
    // A wire name that is not a legal field name travels as an alias, so the model
    // accepts both spellings; without this, populating by field name would fail.
    if (pydantic) {
      printer.line('model_config = ConfigDict(populate_by_name=True)');
      printer.blank();
    }
    // Required fields first — a dataclass field without a default may not follow one with.
    const ordered = [
      ...properties.filter((property) => property.required),
      ...properties.filter((property) => !property.required),
    ];
    const fieldMap: Array<[string, string]> = [];
    if (ordered.length === 0) printer.line('pass');
    for (const property of ordered) {
      const { python, renamed } = fieldName(property.name);
      if (renamed && !pydantic) fieldMap.push([python, property.name]);
      const alias = renamed && pydantic ? `alias=${naming.string(property.name)}` : undefined;
      const baseType =
        pinned?.property === property.name
          ? `Literal[${naming.literal(pinned.value)}]`
          : pythonType(property.schema, dateType);
      if (property.required) {
        const value = alias === undefined ? '' : ` = Field(${alias})`;
        printer.line(`${python}: ${baseType}${value}`);
      } else {
        const optional = baseType.startsWith('Optional[') ? baseType : `Optional[${baseType}]`;
        const value = alias === undefined ? 'None' : `Field(default=None, ${alias})`;
        printer.line(`${python}: ${optional} = ${value}`);
      }
    }
    if (fieldMap.length > 0) {
      printer.blank();
      printer.line('# Python field name -> wire (JSON) name, for (de)serialization.');
      const entries = fieldMap.map(([py, wire]) => `"${py}": ${naming.string(wire)}`).join(', ');
      printer.line(`_field_map: ClassVar[Dict[str, str]] = {${entries}}`);
    }
  });
  printer.blank();
  printer.blank();
}

/** Render every named schema: Enum classes, dataclasses (allOf flattened), union aliases. */
export function renderPythonModels(
  model: ApiModel,
  dateType: DateType = 'string',
  models: PythonModels = 'dataclass'
): string {
  const printer = new PythonPrinter();
  const { pins, unions } =
    models === 'pydantic'
      ? pydanticDiscriminators(model)
      : { pins: new Map<string, DiscriminatorPin>(), unions: new Map<string, string>() };
  printer.line('from __future__ import annotations');
  printer.blank();
  if (models === 'dataclass') printer.line('from dataclasses import dataclass');
  printer.line('from enum import Enum');
  // `ClassVar` types the `_field_map` of a dataclass model, which pydantic mode
  // replaces with field aliases — importing it there would be an unused import.
  const typingNames = [
    'Any',
    'AsyncIterator',
    'Dict',
    'Iterator',
    'List',
    'Literal',
    'Optional',
    'Tuple',
    'Union',
  ];
  if (models === 'dataclass') typingNames.splice(2, 0, 'ClassVar');
  if (unions.size > 0) typingNames.unshift('Annotated');
  printer.line(`from typing import ${typingNames.join(', ')}`);
  if (models === 'pydantic') printer.line('from pydantic import BaseModel, ConfigDict, Field');
  // Only under `dateType: Date` — an unused import in every other client would be noise.
  if (dateType === 'Date') printer.line('from datetime import date, datetime');
  printer.blank();
  printer.blank();

  const aliases: Array<() => void> = [];
  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined) {
      const base = asEnum.scalar === 'string' ? 'str, Enum' : 'int, Enum';
      printer.block(`class ${className(name)}(${base}):`, () => {
        printer.doc(schema.description);
        asEnum.values.forEach((value, index) => {
          printer.line(`${asEnum.memberNames[index]} = ${naming.literal(value)}`);
        });
      });
      printer.blank();
      printer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeDataclass(
          printer,
          name,
          flat.properties,
          dateType,
          models,
          flat.description ?? schema.description,
          pins.get(name)
        );
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
        printer.line(`# Discriminated by "${cases.property}": ${table}`);
      }
      const field = unions.get(name);
      const union =
        field === undefined
          ? pythonType(schema, dateType)
          : `Annotated[${pythonType(schema, dateType)}, Field(discriminator=${naming.string(field)})]`;
      printer.line(`${className(name)} = ${union}`);
      printer.blank();
    });
  }
  for (const emit of aliases) emit();
  return printer.toString();
}

/**
 * `DISCRIMINATORS[Pet] = ("petType", {"cat": Cat, ...})` registration lines, which `decode`
 * dispatches through. A union whose annotation already carries the discriminator is left
 * out: pydantic resolves it at any depth, and the `Literal` on each member makes the
 * decoder's member probe exact.
 */
export function discriminatorRegistrations(model: ApiModel, annotated: Set<string>): string[] {
  const lines: string[] = [];
  for (const { name, schema } of model.schemas) {
    if (annotated.has(name)) continue;
    const cases = discriminatorCases(schema, model);
    if (cases === undefined) continue;
    const mapping = cases.cases
      .map((entry) => `${naming.string(entry.value)}: ${className(entry.schemaName)}`)
      .join(', ');
    lines.push(
      `DISCRIMINATORS[${className(name)}] = (${naming.string(cases.property)}, {${mapping}})`
    );
  }
  return lines;
}
