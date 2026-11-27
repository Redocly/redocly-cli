import { isRef, type Location } from '../../ref-utils.js';
import type { OasRef } from '../../typings/openapi.js';
import { isNotEmptyArray } from '../../utils/is-not-empty-array.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Async2Rule, Async3Rule, Arazzo1Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { ResolveResult, UserContext } from '../../walk.js';
import { type AnySchema, resolveSchema, schemaHasProperty } from '../utils.js';

type RequiredCheck = {
  location: Location;
  from?: Location;
  undefinedIndexes: number[];
};

const COMPOSITION_KEYWORDS = ['allOf', 'anyOf', 'oneOf'] as const;

export const NoRequiredSchemaPropertiesUndefined:
  | Oas3Rule
  | Oas2Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  const parents: AnySchema[] = [];
  const validatedRefNodes = new Set<unknown>();
  // a schema the walker enters once can be used in several places, so each place
  // where it's used is checked, and the problems are reported once the walk is done
  const usageChecks = new Map<AnySchema, RequiredCheck[]>();
  const visitChecks = new Map<AnySchema, RequiredCheck[]>();

  const reportUndefinedRequired = (
    schema: AnySchema,
    schemaLocation: Location,
    ctx: UserContext
  ) => {
    if (!isNotEmptyArray<string>(schema.required)) return;

    for (const [i, requiredProperty] of schema.required.entries()) {
      if (!schemaHasProperty(schema, requiredProperty, ctx, new Set(), schemaLocation)) {
        ctx.report({
          message: `Required property '${requiredProperty}' is not defined.`,
          location: schemaLocation.child(['required', i]),
          reference:
            'https://redocly.com/docs/cli/rules/common/no-required-schema-properties-undefined',
        });
      }
    }
  };

  const isCompositionChild = (parent: AnySchema, child: AnySchema, ctx: UserContext): boolean => {
    const matchesChild = (s: AnySchema) => resolveSchema(s, ctx).schema === child;
    return !!(
      parent.allOf?.some(matchesChild) ||
      parent.anyOf?.some(matchesChild) ||
      parent.oneOf?.some(matchesChild)
    );
  };

  const findCompositionAncestors = (i: number, child: AnySchema, ctx: UserContext): AnySchema[] => {
    if (i < 0) {
      return [];
    }

    const parent = parents[i];

    return isCompositionChild(parent, child, ctx)
      ? [parent, ...findCompositionAncestors(i - 1, parent, ctx)]
      : [];
  };

  const isCompositionUsage = (parent: AnySchema | undefined, ctx: UserContext): boolean =>
    parent !== undefined && [parent.allOf, parent.anyOf, parent.oneOf].includes(ctx.parent);

  // what a schema defines itself is the same wherever it's used
  const ownUndefinedIndexes = new Map<AnySchema, number[]>();

  const checkRequired = (
    schema: AnySchema,
    required: string[],
    schemaLocation: Location,
    compositionAncestors: AnySchema[],
    ctx: UserContext,
    from?: Location
  ): RequiredCheck => {
    const ownUndefined =
      ownUndefinedIndexes.get(schema) ??
      required.flatMap((requiredProperty, i) =>
        schemaHasProperty(schema, requiredProperty, ctx, new Set(), schemaLocation) ? [] : [i]
      );
    ownUndefinedIndexes.set(schema, ownUndefined);

    return {
      location: schemaLocation,
      from,
      undefinedIndexes: ownUndefined.filter(
        (i) =>
          !compositionAncestors.some((ancestor) => schemaHasProperty(ancestor, required[i], ctx))
      ),
    };
  };

  const addCheck = (
    checks: Map<AnySchema, RequiredCheck[]>,
    schema: AnySchema,
    check: RequiredCheck
  ) => {
    checks.set(schema, [...(checks.get(schema) ?? []), check]);
  };

  // the walker enters the inline allOf, anyOf and oneOf members of a referenced schema
  // only once too, so they are checked for every usage of that schema as well
  const checkUsage = (
    schema: AnySchema,
    schemaLocation: Location,
    compositionAncestors: AnySchema[],
    ctx: UserContext,
    from?: Location
  ) => {
    if (isNotEmptyArray<string>(schema.required)) {
      addCheck(
        usageChecks,
        schema,
        checkRequired(schema, schema.required, schemaLocation, compositionAncestors, ctx, from)
      );
    }

    for (const keyword of COMPOSITION_KEYWORDS) {
      for (const [i, member] of (schema[keyword] ?? []).entries()) {
        if (isPlainObject(member) && !isRef(member)) {
          checkUsage(
            member,
            schemaLocation.child([keyword, i]),
            [schema, ...compositionAncestors],
            ctx,
            from
          );
        }
      }
    }
  };

  const report = (schema: AnySchema, checks: RequiredCheck[], ctx: UserContext) => {
    if (!isNotEmptyArray<string>(schema.required)) return;

    for (const [i, requiredProperty] of schema.required.entries()) {
      const failing = checks.filter((check) => check.undefinedIndexes.includes(i));
      if (failing.length === 0) continue;

      // when no usage defines the property, the schema itself is reported once
      const reported: Pick<RequiredCheck, 'location' | 'from'>[] =
        failing.length === checks.length ? [{ location: checks[0].location }] : failing;

      for (const { location, from } of reported) {
        ctx.report({
          message: `Required property '${requiredProperty}' is not defined.`,
          location: location.child(['required', i]),
          ...(from === undefined ? {} : { from }),
          reference:
            'https://redocly.com/docs/cli/rules/common/no-required-schema-properties-undefined',
        });
      }
    }
  };

  return {
    Root: {
      leave(_: unknown, ctx: UserContext) {
        for (const schema of new Set([...visitChecks.keys(), ...usageChecks.keys()])) {
          report(schema, usageChecks.get(schema) ?? visitChecks.get(schema) ?? [], ctx);
        }
      },
    },
    ref: {
      enter(refNode: OasRef, ctx: UserContext, resolved: ResolveResult<AnySchema>) {
        if (
          ctx.type.name !== 'Schema' ||
          !isPlainObject(resolved.node) ||
          resolved.location === undefined
        ) {
          return;
        }

        checkUsage(
          resolved.node,
          resolved.location,
          isCompositionUsage(parents.at(-1), ctx)
            ? findCompositionAncestors(parents.length - 1, resolved.node, ctx)
            : [],
          ctx,
          ctx.location
        );
      },
      leave(refNode: OasRef, ctx: UserContext, resolved: ResolveResult<AnySchema>) {
        if (ctx.type.name !== 'Schema') return;

        // composed $refs are never visited as Schema nodes, so the `required` sibling
        // keywords of the ref itself and of the chain hops are validated here
        const composedSchemas = [
          { node: refNode as unknown, location: ctx.location },
          ...(resolved.chain ?? []),
        ];
        for (const { node, location } of composedSchemas) {
          if (!isPlainObject(node) || validatedRefNodes.has(node)) {
            continue;
          }
          validatedRefNodes.add(node);
          reportUndefinedRequired(node as AnySchema, location, ctx);
        }
      },
    },
    Schema: {
      leave(_: AnySchema) {
        parents.pop();
      },
      enter(currentSchema: AnySchema, ctx: UserContext) {
        parents.push(currentSchema);
        if (!isNotEmptyArray<string>(currentSchema.required)) {
          return;
        }

        addCheck(
          visitChecks,
          currentSchema,
          checkRequired(
            currentSchema,
            currentSchema.required,
            ctx.location,
            findCompositionAncestors(parents.length - 2, currentSchema, ctx),
            ctx
          )
        );
      },
    },
  };
};
