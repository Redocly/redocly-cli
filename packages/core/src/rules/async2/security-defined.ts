import type { Location } from '../../ref-utils.js';
import type { Async2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { operationHasSecurity } from '../common/operation-has-security.js';

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

  return {
    Root: {
      leave(_root: unknown, { report }: UserContext) {
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
          const securedByServer = applicableServers.some((name) => serverHasSecurity.get(name));
          if (!securedByServer) {
            report({
              message: `Every operation should have security defined on it.`,
              location: location.key(),
            });
          }
        }
      },
    },
    SecurityScheme(_scheme: unknown, { key }: UserContext) {
      referencedSchemes.set(key.toString(), { defined: true, from: [] });
    },
    SecurityRequirement(requirements: Record<string, string[]>, { location }: UserContext) {
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
    Server(server: { security?: unknown }, { key }: UserContext) {
      serverHasSecurity.set(key.toString(), Boolean(server?.security));
    },
    Channel: {
      enter(channel: { servers?: string[] }) {
        currentChannelServers = Array.isArray(channel?.servers) ? channel.servers : undefined;
      },
      Operation(
        operation: { security?: unknown; traits?: unknown[] },
        { location, resolve }: UserContext
      ) {
        if (operationHasSecurity(operation, resolve)) return;
        operationsWithoutSecurity.push({ location, channelServers: currentChannelServers });
      },
    },
  };
};
