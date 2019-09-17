import { ImplicitOpenAPIFlow } from './ImplicitOpenAPIFlow';
import { PasswordOpenAPIFlow } from './PasswordOpenAPIFlow';
import { ClientCredentialsOpenAPIFlow } from './ClientCredentialsOpenAPIFlow';
import { AuthorizationCodeOpenAPIFlow } from './AuthorizationCodeOpenAPIFlow';

export const OpenAPIFlows = {
    properties: {
        implicit() {
            return ImplicitOpenAPIFlow;
        },
        password() {
            return PasswordOpenAPIFlow;
        },
        clientCredentials() {
            return ClientCredentialsOpenAPIFlow;
        },
        authorizationCode() {
            return AuthorizationCodeOpenAPIFlow;
        }
    }
};