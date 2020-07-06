import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3Server } from '../../typings/openapi';

export const ServersDefinedVariables: Oas3Rule | Oas2Rule = () => {
  return {
    Server(server:Oas3Server, { report, location }: UserContext) {
      const urlVariables = server.url.match(/{[^}]+}/g)?.map(e => e.slice(1, e.length - 1)) || [];
      const definedVariables = server?.variables && Object.keys(server.variables) || [];
      
      for (const pathVar of urlVariables) {
        if (!definedVariables.includes(pathVar)) {
          report({
            message: `The "${pathVar}" variable is not defined in the "variables" objects.`,
            location: location.child(['url'])
          })
        }
      }

      for (const definedVar of definedVariables) {
        if (!urlVariables.includes(definedVar)) {
          report({
            message: `The "${definedVar}" variable is not used in the server's "url" field.`,
            location: location.child(['variables', definedVar]).key(),
          })
        }
      }
    }
  };
};
