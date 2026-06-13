import type { Location } from '../../ref-utils.js';
import type {
  Async2Channel,
  Async2Operation,
  Async2SecurityRequirement,
  Async2SecurityScheme,
  Async2Server,
} from '../../typings/asyncapi.js';
import { isOperationSecured } from '../../utils/is-operation-secured.js';
import type { Async2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SecurityDefined: Async2Rule = () => {
  const referencedSchemes = new Map<
    string,
    {
      defined?: boolean;
      from: Location[];
    }
  >();
  const serverHasSecurity = new Map<string, boolean>();
  const operationsWithoutSecurity: { location: Location; channelServers?: string[] }[] = [];
  let currentChannelServers: string[] | undefined;
  let inComponents = false;

  return {
    Root: {
      leave(_root, { report }: UserContext) {
        for (const [name, scheme] of referencedSchemes.entries()) {
          if (scheme.defined) continue;
          for (const reportedFromLocation of scheme.from) {
            report({
              message: `There is no \`${name}\` security scheme defined.`,
              location: reportedFromLocation.key(),
            });
          }
        }

        const allServerNames = [...serverHasSecurity.keys()];
        for (const { location, channelServers } of operationsWithoutSecurity) {
          const applicableServers = channelServers ?? allServerNames;
          const securedByServer =
            applicableServers.length > 0 &&
            applicableServers.every((name) => serverHasSecurity.get(name));
          if (!securedByServer) {
            report({
              message: `Every operation should have security defined on it.`,
              location: location.key(),
            });
          }
        }
      },
    },
    SecurityScheme(_scheme: Async2SecurityScheme, { key }: UserContext) {
      referencedSchemes.set(key.toString(), { defined: true, from: [] });
    },
    SecurityRequirement(requirements: Async2SecurityRequirement, { location }: UserContext) {
      for (const requirement of Object.keys(requirements)) {
        const authScheme = referencedSchemes.get(requirement);
        const requirementLocation = location.child([requirement]);
        if (!authScheme) {
          referencedSchemes.set(requirement, { from: [requirementLocation] });
        } else {
          authScheme.from.push(requirementLocation);
        }
      }
    },
    Components: {
      enter() {
        inComponents = true;
      },
      leave() {
        inComponents = false;
      },
    },
    Server(server: Async2Server, { key }: UserContext) {
      if (inComponents) return;
      serverHasSecurity.set(key.toString(), Boolean(server?.security));
    },
    Channel: {
      enter(channel: Async2Channel) {
        currentChannelServers = Array.isArray(channel?.servers) ? channel.servers : undefined;
      },
      Operation(operation: Async2Operation, { location, resolve }: UserContext) {
        if (isOperationSecured(operation, resolve)) return;
        operationsWithoutSecurity.push({ location, channelServers: currentChannelServers });
      },
    },
  };
};
