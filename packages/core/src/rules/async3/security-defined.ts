import { isRef, type Location } from '../../ref-utils.js';
import type {
  Async3Channel,
  Async3Operation,
  Async3SecurityScheme,
  Async3Server,
} from '../../typings/asyncapi3.js';
import type { Referenced } from '../../typings/openapi.js';
import { isOperationSecured } from '../../utils/is-operation-secured.js';
import type { Async3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

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
  let rootServers: Record<string, Async3Server> | undefined;
  let inComponents = false;

  const isOperationSecuredByServers = (
    operation: Async3Operation,
    resolve: UserContext['resolve']
  ): boolean => {
    const channelRef = operation.channel;
    const channel: Async3Channel | undefined = isRef(channelRef)
      ? resolve<Async3Channel>(channelRef).node
      : channelRef;
    const applicableServers: Array<Referenced<Async3Server>> =
      channel?.servers ?? (rootServers ? Object.values(rootServers) : []);
    if (applicableServers.length === 0) return false;
    return applicableServers.every((server) => {
      const serverNode = isRef(server) ? resolve<Async3Server>(server).node : server;
      return Boolean(serverNode?.security);
    });
  };

  return {
    Root: {
      enter(root) {
        rootServers = root?.servers;
      },
      leave(_root, { report }: UserContext) {
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
      enter(list: Array<Referenced<Async3SecurityScheme>>, { location, resolve }: UserContext) {
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (!isRef(item)) continue;
          const itemLocation = location.child([i]);
          const resolved = resolve<Async3SecurityScheme>(item);
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
    Components: {
      enter() {
        inComponents = true;
      },
      leave() {
        inComponents = false;
      },
    },
    Operation(operation: Async3Operation, { location, resolve }: UserContext) {
      if (inComponents) return;
      if (isOperationSecured(operation, resolve)) return;
      if (isOperationSecuredByServers(operation, resolve)) return;
      operationsWithoutSecurity.push(location);
    },
  };
};
