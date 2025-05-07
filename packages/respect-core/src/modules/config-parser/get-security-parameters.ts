import type { ResolvedSecurity } from 'core/src/typings/arazzo';
import type { ParameterWithIn } from './parse-parameters';

export function getSecurityParameters(resolvedSecurity: ResolvedSecurity): ParameterWithIn {
  const { scheme, values } = resolvedSecurity;

  switch (scheme?.type) {
    case 'http': {
      if (scheme.scheme === 'basic') {
        const { username, password } = values;

        return {
          in: 'header',
          name: 'Authorization',
          value: `Basic ${btoa(`${username}:${password}`)}`,
        };
      }

      if (scheme.scheme === 'bearer') {
        return {
          in: 'header',
          name: 'Authorization',
          value: `Bearer ${values.token}`,
        };
      }
      break;
    }

    case 'apiKey': {
      return {
        in: scheme.in,
        name: scheme.name,
        value: values.value,
      };
    }
  }

  throw new Error(`Unsupported security scheme: ${scheme?.type}`);
}
