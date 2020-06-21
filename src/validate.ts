import { BaseResolver, resolveDocument, Document } from './resolve';

import { OAS3Rule, normalizeVisitors, OAS3Transformer } from './visitors';
import { OAS3Types } from './types/oas3';
import { NodeType } from './types';
import { WalkContext, walkDocument } from './walk';
import { LintConfig } from './config/config';
import { normalizeTypes } from './types';
import { initRules } from './config/rules';

export enum OASVersion {
  Version2 = 'oas2',
  Version3_0 = 'oas3_0',
}

export enum OASMajorVersion {
  Version2 = 'oas2',
  Version3 = 'oas3',
}

export type RuleSet<T> = Record<string, T>;
export type OAS3RuleSet = Record<string, OAS3Rule>;
export type OAS3TransformersSet = Record<string, OAS3Transformer>;

export async function validate(opts: {
  ref: string;
  config: LintConfig;
  externalRefResolver?: BaseResolver;
}) {
  const { ref, externalRefResolver = new BaseResolver() } = opts;
  const document = (await externalRefResolver.resolveDocument(null, ref)) as Document;
  return validateDocument({
    document,
    ...opts,
  });
}

export async function validateDocument(opts: {
  document: Document;
  config: LintConfig;
  customTypes?: Record<string, NodeType>;
  externalRefResolver?: BaseResolver;
}) {
  const { document, customTypes, externalRefResolver = new BaseResolver(), config } = opts;
  switch (detectOpenAPI(document.parsed)) {
    case OASVersion.Version2:
      throw new Error('OAS2 is not supported yet');
    case OASVersion.Version3_0: {
      const oas3Rules = config.getRulesForOASVersion(OASVersion.Version3_0);

      const types = normalizeTypes(
        config.extendTypes(customTypes ?? OAS3Types, OASVersion.Version3_0),
      );

      const visitors = initRules(oas3Rules, config);

      const normalizedVisitors = normalizeVisitors(visitors, types);

      const resolvedRefMap = await resolveDocument({
        rootDocument: document,
        rootType: types.DefinitionRoot,
        externalRefResolver,
      });

      let ctx: WalkContext = {
        messages: [],
        oasVersion: OASVersion.Version3_0,
      };

      walkDocument({
        document,
        rootType: types.DefinitionRoot,
        normalizedVisitors,
        resolvedRefMap,
        ctx,
      });

      return ctx.messages;
    }
  }
}

export function detectOpenAPI(root: any): OASVersion {
  if (typeof root !== 'object') {
    throw new Error(`Document must be JSON object, got ${typeof root}`);
  }

  if (root.openapi && root.openapi.startsWith('3.0')) {
    return OASVersion.Version3_0;
  }

  if (root.swagger && root.swagger === '2.0') {
    return OASVersion.Version2;
  }

  throw new Error(`Unsupported OpenAPI Version: ${root.openapi || root.swagger}`);
}
