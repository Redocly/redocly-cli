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
import { isAsyncOperationSecured } from '../utils.js';

const SECURITY_SCHEMES_POINTER = '#/components/securitySchemes/';

type SecurityReference = {
  location: Location;
  name: string;
  refPointer: string;
  resolved: boolean;
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
  let rootOperations: Record<string, Referenced<Async3Operation>> | undefined;
  let rootLocation: Location | undefined;

  const isOperationSecuredByServers = (
    operation: Async3Operation,
    resolve: UserContext['resolve']
  ): boolean => {
    const channelRef = operation.channel;
    const channel: Async3Channel | undefined = isRef(channelRef)
      ? resolve<Async3Channel>(channelRef).node
      : channelRef;
    const channelServers = channel?.servers;
    const applicableServers: Array<Referenced<Async3Server>> =
      channelServers && channelServers.length > 0
        ? channelServers
        : rootServers
          ? Object.values(rootServers)
          : [];
    if (applicableServers.length === 0) return false;
    return applicableServers.every((server) => {
      const serverNode = isRef(server) ? resolve<Async3Server>(server).node : server;
      return Array.isArray(serverNode?.security) && serverNode.security.length > 0;
    });
  };

  return {
    Root: {
      enter(root, { location }: UserContext) {
        rootServers = root?.servers;
        rootOperations = root?.operations;
        rootLocation = location;
      },
      leave(_root, { report, resolve }: UserContext) {
        for (const reference of references) {
          if (!pointsToSecurityScheme(reference.refPointer)) {
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

        if (rootOperations && rootLocation) {
          const operationsLocation = rootLocation.child(['operations']);
          for (const [opName, opRef] of Object.entries(rootOperations)) {
            const operation = isRef(opRef) ? resolve<Async3Operation>(opRef).node : opRef;
            if (!operation) continue;
            if (isAsyncOperationSecured(operation, resolve)) continue;
            if (isOperationSecuredByServers(operation, resolve)) continue;
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
            resolved: resolved.node !== undefined,
          });
        }
      },
    },
  };
};
