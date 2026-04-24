import type { Location } from '../../ref-utils.js';
import type {
  Oas3Definition,
  Oas3_1Definition,
  Oas3_2Definition,
  Oas3Operation,
  Oas3PathItem,
} from '../../typings/openapi.js';
import type { Oas2Definition, Oas2Operation, Oas2PathItem } from '../../typings/swagger.js';
import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { createSecuritySchemeReferencesChecker } from './security-scheme-references.js';

type AnyOas3Definition = Oas3Definition | Oas3_1Definition | Oas3_2Definition;

export const SecurityDefined: Oas3Rule | Oas2Rule = (opts: {
  exceptions?: { path: string; methods?: string[] }[];
}) => {
  const checker = createSecuritySchemeReferencesChecker();

  const operationsWithoutSecurity: Location[] = [];
  let eachOperationHasSecurity: boolean = true;
  let path: string | undefined;

  return {
    Root: {
      leave(root: Oas2Definition | AnyOas3Definition, ctx: UserContext) {
        checker.reportUndefinedSchemes(ctx);

        if (root.security || eachOperationHasSecurity) {
          return;
        } else {
          for (const operationLocation of operationsWithoutSecurity) {
            ctx.report({
              message: `Every operation should have security defined on it or on the root level.`,
              location: operationLocation.key(),
            });
          }
        }
      },
    },
    ...checker.visitors,
    PathItem: {
      enter(pathItem: Oas2PathItem | Oas3PathItem, { key }: UserContext) {
        path = key as string;
      },
      Operation(operation: Oas2Operation | Oas3Operation, { location, key }: UserContext) {
        const isException = opts.exceptions?.some(
          (item) =>
            item.path === path &&
            (!item.methods || item.methods?.some((method) => method.toLowerCase() === key))
        );
        if (!operation?.security && !isException) {
          eachOperationHasSecurity = false;
          operationsWithoutSecurity.push(location);
        }
      },
    },
  };
};
