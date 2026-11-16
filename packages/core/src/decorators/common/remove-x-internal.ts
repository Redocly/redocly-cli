import { isRef } from '../../ref-utils.js';
import { isEmptyArray } from '../../utils/is-empty-array.js';
import { isEmptyObject } from '../../utils/is-empty-object.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Oas3Decorator, Oas2Decorator } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const DEFAULT_INTERNAL_PROPERTY_NAME = 'x-internal';

type SecurityRequirementList = {
  list: Record<string, string[]>[];
  parent: UserContext['parent'];
  key: UserContext['key'];
};

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
        if (isRef(node[key])) {
          const resolved = ctx.resolve(node[key]);
          if (isPlainObject(resolved.node) && resolved.node?.[internalFlagProperty]) {
            delete node[key];
            didDelete = true;
          }
        }
        if (isPlainObject(node[key]) && node[key]?.[internalFlagProperty]) {
          delete node[key];
          didDelete = true;
        }
        if (ctx.type.name === 'NamedSecuritySchemes' && !(key in node)) {
          removedSecuritySchemes.add(key);
        }
      }
    }

    if (didDelete && (isEmptyObject(node) || isEmptyArray(node))) {
      delete parent[key];
    }
  }

  function removeInternalSecurityRequirements({ list, parent, key }: SecurityRequirementList) {
    // A requirement lists schemes that must all be used together, so it can't be kept without one of them.
    let didDelete = false;
    for (let i = 0; i < list.length; i++) {
      if (Object.keys(list[i]).some((name) => removedSecuritySchemes.has(name))) {
        list.splice(i, 1);
        didDelete = true;
        i--;
      }
    }
    if (didDelete && isEmptyArray(list)) {
      delete parent[key];
    }
  }

  let originalMapping: Record<string, string> = {};
  const removedSecuritySchemes = new Set<string>();
  const securityRequirementLists: SecurityRequirementList[] = [];
  return {
    Root: {
      leave: () => {
        securityRequirementLists.forEach(removeInternalSecurityRequirements);
      },
    },
    SecurityRequirementList: {
      enter: (list: Record<string, string[]>[], { parent, key }: UserContext) => {
        securityRequirementLists.push({ list, parent, key });
      },
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
