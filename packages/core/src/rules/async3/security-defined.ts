import { isRef, type Location } from '../../ref-utils.js';
import type {
  Async3Channel,
  Async3Operation,
  Async3SecurityScheme,
  Async3Server,
} from '../../typings/asyncapi3.js';
import type { Referenced } from '../../typings/openapi.js';
import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { hasSecurityRequirements, isAsyncOperationSecured } from '../utils.js';

const SECURITY_SCHEMES_POINTER = '#/components/securitySchemes/';

type SecurityReference = {
  location: Location;
  name: string;
  refPointer: string;
  resolved: boolean;
  local: boolean;
};

function getRefPointer(ref: string): string {
  const hashIndex = ref.indexOf('#');
  return hashIndex === -1 ? ref : ref.slice(hashIndex);
}

function pointsToSecurityScheme(pointer: string): boolean {
  return (
    pointer.startsWith(SECURITY_SCHEMES_POINTER) &&
    !pointer.slice(SECURITY_SCHEMES_POINTER.length).includes('/')
  );
}

export const SecurityDefined: Async3Rule = () => {
  const references: SecurityReference[] = [];
  let rootServers: Record<string, Referenced<Async3Server>> | undefined;
  let rootServersFrom: string | undefined;
  let rootOperations: Record<string, Referenced<Async3Operation>> | undefined;
  let rootOperationsFrom: string | undefined;
  let rootOperationsLocation: Location | undefined;

  const isOperationSecuredByServers = (
    operation: Async3Operation,
    resolve: UserContext['resolve'],
    resolveFrom?: string
  ): boolean => {
    const channelRef = operation.channel;
    const resolvedChannel = isRef(channelRef)
      ? resolve<Async3Channel>(channelRef, resolveFrom)
      : undefined;
    const channel: Async3Channel | undefined = isRef(channelRef)
      ? resolvedChannel?.node
      : channelRef;
    const channelServers = channel?.servers;

    let applicableServers: Array<Referenced<Async3Server>>;
    let serversFrom: string | undefined;
    if (channelServers && channelServers.length > 0) {
      applicableServers = channelServers;
      serversFrom = resolvedChannel?.location?.source.absoluteRef ?? resolveFrom;
    } else {
      applicableServers = rootServers ? Object.values(rootServers) : [];
      serversFrom = rootServersFrom;
    }

    if (applicableServers.length === 0) return false;
    return applicableServers.every((server) => {
      const serverNode = isRef(server) ? resolve<Async3Server>(server, serversFrom).node : server;
      return hasSecurityRequirements(serverNode);
    });
  };

  return {
    Root: {
      enter(root, { location, resolve }: UserContext) {
        const serversNode = root?.servers;
        if (isRef(serversNode)) {
          const resolvedServers = resolve<Record<string, Referenced<Async3Server>>>(serversNode);
          rootServers = resolvedServers.node ?? undefined;
          rootServersFrom = resolvedServers.location?.source.absoluteRef;
        } else {
          rootServers = serversNode;
          rootServersFrom = undefined;
        }
        const operationsNode = root?.operations;
        if (isRef(operationsNode)) {
          const resolvedOperations =
            resolve<Record<string, Referenced<Async3Operation>>>(operationsNode);
          rootOperations = resolvedOperations.node ?? undefined;
          rootOperationsFrom = resolvedOperations.location?.source.absoluteRef;
          rootOperationsLocation = resolvedOperations.location;
        } else {
          rootOperations = operationsNode;
          rootOperationsFrom = undefined;
          rootOperationsLocation = location.child(['operations']);
        }
      },
      leave(_root, { report, resolve }: UserContext) {
        for (const reference of references) {
          if (reference.local && !pointsToSecurityScheme(reference.refPointer)) {
            report({
              message: `Security scheme \`$ref\` must point to \`#/components/securitySchemes\`.`,
              location: reference.location.key(),
            });
            continue;
          }

          if (!reference.resolved) {
            report({
              message: `There is no \`${reference.name}\` security scheme defined.`,
              location: reference.location.key(),
            });
          }
        }

        if (rootOperations && rootOperationsLocation) {
          const operationsLocation = rootOperationsLocation;
          for (const [opName, opRef] of Object.entries(rootOperations)) {
            let operation: Async3Operation | undefined;
            let resolveFrom: string | undefined;
            if (isRef(opRef)) {
              const resolvedOperation = resolve<Async3Operation>(opRef, rootOperationsFrom);
              operation = resolvedOperation.node;
              resolveFrom = resolvedOperation.location?.source.absoluteRef;
            } else {
              operation = opRef;
              resolveFrom = rootOperationsFrom;
            }
            if (!operation) continue;
            if (isAsyncOperationSecured(operation, resolve, resolveFrom)) continue;
            if (isOperationSecuredByServers(operation, resolve, resolveFrom)) continue;
            report({
              message: `Every operation should have security defined on it.`,
              location: operationsLocation.child([opName]).key(),
            });
          }
        }
      },
    },
    SecuritySchemeList: {
      enter(list: Array<Referenced<Async3SecurityScheme>>, { location, resolve }: UserContext) {
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (!isRef(item)) continue;
          const itemLocation = location.child([i]);
          const resolved = resolve<Async3SecurityScheme>(item);
          const refPointer = getRefPointer(item.$ref);
          const name = refPointer.split('/').pop() ?? item.$ref;
          references.push({
            location: itemLocation,
            name,
            refPointer,
            resolved: resolved.node != null,
            local: item.$ref.startsWith('#'),
          });
        }
      },
    },
  };
};
