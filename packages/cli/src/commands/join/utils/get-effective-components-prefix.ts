import { type Document, type Oas3PathItem, isPlainObject, keysOf } from '@redocly/openapi-core';

import { COMPONENTS } from '../../split/constants.js';
import { OPENAPI3_METHOD_NAMES } from '../../split/oas/constants.js';
import { type Oas3Method } from '../../split/types.js';
import type { AnyOas3Definition } from '../types.js';
import { getInfoPrefix } from './get-info-prefix.js';

const operationsSet = new Set(OPENAPI3_METHOD_NAMES);

function collectSecuritySchemeNamesFromApi(openapi: AnyOas3Definition): Set<string> {
  const names = new Set<string>();

  const addFromSecurity = (security: AnyOas3Definition['security']) => {
    if (!security) {
      return;
    }
    for (const requirement of security) {
      for (const schemeName of Object.keys(requirement)) {
        names.add(schemeName);
      }
    }
  };

  addFromSecurity(openapi.security);

  for (const pathItem of Object.values(openapi.paths ?? {})) {
    if (!pathItem || !isPlainObject(pathItem)) {
      continue;
    }

    const pathItemObject = pathItem as Oas3PathItem;

    addFromSecurity(
      (pathItemObject as Oas3PathItem & { security?: AnyOas3Definition['security'] }).security
    );

    for (const field of keysOf(pathItemObject)) {
      if (operationsSet.has(field as Oas3Method)) {
        addFromSecurity(pathItemObject[field as Oas3Method]?.security);
      }
    }
  }

  for (const schemeName of Object.keys(openapi.components?.securitySchemes ?? {})) {
    names.add(schemeName);
  }

  return names;
}

export function collectDuplicateSecuritySchemeNames(
  documents: Document<AnyOas3Definition>[]
): Set<string> {
  const apisPerScheme = new Map<string, number>();

  for (const document of documents) {
    const schemeNames = collectSecuritySchemeNamesFromApi(document.parsed);

    for (const name of schemeNames) {
      apisPerScheme.set(name, (apisPerScheme.get(name) ?? 0) + 1);
    }
  }

  return new Set(
    [...apisPerScheme.entries()].filter(([, apiCount]) => apiCount > 1).map(([name]) => name)
  );
}

export function getEffectiveComponentsPrefix({
  info,
  apiFilename,
  prefixComponentsWithInfoProp,
  duplicateSecuritySchemeNames,
}: {
  info: AnyOas3Definition['info'];
  apiFilename: string;
  prefixComponentsWithInfoProp?: string;
  duplicateSecuritySchemeNames: Set<string>;
}) {
  const explicitPrefix = getInfoPrefix(info, prefixComponentsWithInfoProp, COMPONENTS);
  if (explicitPrefix) {
    return explicitPrefix;
  }

  if (!duplicateSecuritySchemeNames.size) {
    return '';
  }

  const raw = info?.title ?? apiFilename;
  return raw.replaceAll(/\s/g, '_');
}
