import { isRef } from '../../ref-utils.js';
import type { Oas3Definition } from '../../typings/openapi.js';
import { isEmptyArray } from '../../utils/is-empty-array.js';
import { isEmptyObject } from '../../utils/is-empty-object.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Oas3Decorator, Oas2Decorator } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const DEFAULT_INTERNAL_PROPERTY_NAME = 'x-internal';

type RootOrOperation = Pick<Oas3Definition, 'security'>;

export const RemoveXInternal: Oas3Decorator | Oas2Decorator = ({
  internalFlagProperty = DEFAULT_INTERNAL_PROPERTY_NAME,
}) => {
  // oxlint-disable-next-line sonarjs/cognitive-complexity
  function removeInternal(
    node: unknown,
    ctx: UserContext,
    originalMapping: Record<string, string>
  ) {
    const { parent, key } = ctx;
    let didDelete = false;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (isRef(node[i])) {
          const resolved = ctx.resolve(node[i]);
          if (resolved.node?.[internalFlagProperty]) {
            // First, remove the reference in the discriminator mapping, if it exists:
            if (isPlainObject(parent.discriminator?.mapping)) {
              for (const mapping in parent.discriminator.mapping) {
                if (originalMapping?.[mapping] === node[i].$ref) {
                  delete parent.discriminator.mapping[mapping];
                }
              }
            }
            node.splice(i, 1);
            didDelete = true;
            i--;
          }
        }
        if (node[i]?.[internalFlagProperty]) {
          node.splice(i, 1);
          didDelete = true;
          i--;
        }
      }
    } else if (isPlainObject(node)) {
      for (const key of Object.keys(node)) {
        const value = node[key];
        let isInternal = false;
        if (isRef(value)) {
          const resolved = ctx.resolve(value);
          isInternal = isPlainObject(resolved.node) && Boolean(resolved.node[internalFlagProperty]);
        }
        if (!isInternal && isPlainObject(value)) {
          isInternal = Boolean(value[internalFlagProperty]);
        }
        if (isInternal) {
          delete node[key];
          didDelete = true;

          // The NamedSecuritySchemes visitor runs after any, when the schemes are already deleted.
          if (ctx.type.name === 'NamedSecuritySchemes') removedSecuritySchemes.add(key);
        }
      }
    }

    if (didDelete && (isEmptyObject(node) || isEmptyArray(node))) {
      delete parent[key];
    }
  }

  let originalMapping: Record<string, string> = {};
  const removedSecuritySchemes = new Set<string>();
  const rootAndOperations: RootOrOperation[] = [];

  function collectRootOrOperation(node: RootOrOperation) {
    rootAndOperations.push(node);
  }

  return {
    Root: {
      enter: collectRootOrOperation,
      leave: () => {
        if (removedSecuritySchemes.size === 0) return;

        for (const node of rootAndOperations) {
          const security = node.security;
          if (!Array.isArray(security)) continue;

          // All schemes in one requirement must be used together.
          const filtered: NonNullable<RootOrOperation['security']> = [];
          for (const requirement of security) {
            let usesRemovedScheme = false;
            if (isPlainObject(requirement)) {
              for (const name of Object.keys(requirement)) {
                if (removedSecuritySchemes.has(name)) {
                  usesRemovedScheme = true;
                  break;
                }
              }
            }
            if (!usesRemovedScheme) filtered.push(requirement);
          }
          if (filtered.length === security.length) continue;

          if (filtered.length) {
            node.security = filtered;
          } else {
            delete node.security;
          }
        }
      },
    },
    Operation: {
      enter: collectRootOrOperation,
    },
    DiscriminatorMapping: {
      enter: (mapping: Record<string, string>) => {
        originalMapping = JSON.parse(JSON.stringify(mapping));
      },
    },
    any: {
      enter: (node, ctx) => {
        removeInternal(node, ctx, originalMapping);
      },
    },
  };
};
