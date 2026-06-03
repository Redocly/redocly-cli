import { isRef, type Location } from '../../ref-utils.js';
import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { operationHasSecurity } from '../common/operation-has-security.js';

const SECURITY_SCHEMES_POINTER = '#/components/securitySchemes/';

type SecurityReference = {
  location: Location;
  name: string;
  resolvedPointer?: string;
  resolved: boolean;
};

export const SecurityDefined: Async3Rule = () => {
  const references: SecurityReference[] = [];
  const operationsWithoutSecurity: Location[] = [];
  let rootServers: Record<string, unknown> | undefined;

  const resolveMaybeRef = (node: unknown, resolve: UserContext['resolve']): unknown =>
    isRef(node) ? resolve(node).node : node;

  const operationSecuredByServers = (
    operation: { channel?: unknown },
    resolve: UserContext['resolve']
  ): boolean => {
    const channelRaw = operation?.channel;
    let channel: { servers?: unknown[] } | undefined;
    if (isRef(channelRaw)) {
      const resolved = resolve(channelRaw);
      if (resolved.node === undefined) return false;
      channel = resolved.node as { servers?: unknown[] };
    } else {
      channel = channelRaw as { servers?: unknown[] } | undefined;
    }
    const applicableServers = Array.isArray(channel?.servers)
      ? channel.servers
      : rootServers
        ? Object.values(rootServers)
        : [];
    return applicableServers.some((server) => {
      const serverNode = resolveMaybeRef(server, resolve) as { security?: unknown } | undefined;
      return Boolean(serverNode?.security);
    });
  };

  return {
    Root: {
      enter(root: { servers?: Record<string, unknown> }) {
        rootServers = root?.servers;
      },
      leave(_root: unknown, { report }: UserContext) {
        for (const reference of references) {
          if (!reference.resolved) {
            report({
              message: `There is no \`${reference.name}\` security scheme defined.`,
              location: reference.location.key(),
            });
            continue;
          }

          const pointer = reference.resolvedPointer ?? '';
          if (
            !pointer.startsWith(SECURITY_SCHEMES_POINTER) ||
            pointer.slice(SECURITY_SCHEMES_POINTER.length).includes('/')
          ) {
            report({
              message: `Security scheme \`$ref\` must point to \`#/components/securitySchemes\`.`,
              location: reference.location.key(),
            });
          }
        }

        for (const operationLocation of operationsWithoutSecurity) {
          report({
            message: `Every operation should have security defined on it.`,
            location: operationLocation.key(),
          });
        }
      },
    },
    SecuritySchemeList: {
      enter(list: unknown[] | undefined, { location, resolve }: UserContext) {
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (!isRef(item)) continue;
          const itemLocation = location.child([i]);
          const resolved = resolve(item);
          const name = item.$ref.split('/').pop() ?? item.$ref;
          references.push({
            location: itemLocation,
            name,
            resolvedPointer: resolved.location?.pointer,
            resolved: resolved.node !== undefined,
          });
        }
      },
    },
    Operation(
      operation: { security?: unknown; traits?: unknown[]; channel?: unknown },
      { location, resolve }: UserContext
    ) {
      if (operationHasSecurity(operation, resolve)) return;
      if (operationSecuredByServers(operation, resolve)) return;
      operationsWithoutSecurity.push(location);
    },
  };
};
