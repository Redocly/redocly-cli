import { Oas3Rule, VisitFunction } from '../../visitors';
import { isRef } from '../../ref-utils';
import { UserContext } from '../../walk';

export const SpecRefValidation: Oas3Rule = () => {
  function validateNoRef(node: unknown, { report, rawLocation }: UserContext) {
    if (isRef(node)) {
      report({
        message: 'Invalid usage of $ref',
        location: rawLocation.child('$ref').key(),
      });
    }
  }

  const nodesToValidate = [
    'Tag',
    'Server',
    'ServerVariable',
    'Info',
    'Contact',
    'License',
    'Paths',
    'Operation',
    'ExternalDocs',
    'Encoding',
    'Responses',
    'MediaType',
    'Xml',
    'SchemaProperties',
    'DiscriminatorMapping',
    'Discriminator',
    'Components',
    'ImplicitFlow',
    'PasswordFlow',
    'ClientCredentials',
    'AuthorizationCode',
    'OAuth2Flows',
    'SpecExtension',
  ];

  const ruleObject: Record<string, VisitFunction<unknown>> = {};

  nodesToValidate.forEach((node) => {
    ruleObject[node] = (_node: unknown, { report, rawNode, rawLocation }: UserContext) => {
      validateNoRef(rawNode, { report, rawLocation } as UserContext);
    };
  });

  return ruleObject;
};
