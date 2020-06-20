import { BaseResolver, resolveDocument, Document } from './resolve';

import { OAS3Rule, normalizeVisitors } from './visitors';
import { TypeTreeNode, OAS3Types } from './types';
import { WalkContext, walkDocument } from './walk';
import { LintConfig } from './config/config';
import { notUndefined } from './utils';

export enum OASVersion {
  Version2,
  Version3_0_x,
}

export type RuleSet<T> = Record<string, OAS3Rule>;
export type OAS3RuleSet = Record<string, OAS3Rule>;

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
  customTypes?: Record<string, TypeTreeNode>;
  externalRefResolver?: BaseResolver;
}) {
  const { document, customTypes, externalRefResolver = new BaseResolver(), config } = opts;
  switch (detectOpenAPI(document.parsed)) {
    case OASVersion.Version2:
      throw new Error('OAS2 is not supported yet');
    case OASVersion.Version3_0_x: {
      const oas3Rules = config.getRulesForOASVersion(OASVersion.Version3_0_x);
      if (!oas3Rules) {
        throw new Error('DEV: must provide visitors');
      }

      const types = customTypes ?? OAS3Types;

      const rulesVisitors = oas3Rules
        ?.flatMap((ruleset) =>
          // TODO validate rules from config have corresponding rule defined for specific OAS version
          Object.keys(ruleset).map((ruleId) => {
            const rule = ruleset[ruleId];
            const ruleSettings = config.getRuleSettings(ruleId);
            if (ruleSettings.severity === 'off') {
              return undefined;
            }

            const visitor = rule(ruleSettings.options);

            return {
              severity: ruleSettings.severity,
              ruleId,
              visitor,
            };
          }),
        )
        .filter(notUndefined);

      const normalizedVisitors = normalizeVisitors(rulesVisitors, types);

      const resolvedRefMap = await resolveDocument({
        rootDocument: document,
        rootType: types.DefinitionRoot,
        externalRefResolver,
      });

      let ctx: WalkContext = {
        messages: [],
        oasVersion: OASVersion.Version3_0_x,
      };

      walkDocument({
        document,
        rootType: types.DefinitionRoot as TypeTreeNode,
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
    throw new Error(`Document must be JSON objcect, got ${typeof root}`);
  }

  if (root.openapi && root.openapi.startsWith('3.0')) {
    return OASVersion.Version3_0_x;
  }

  if (root.swagger && root.swagger === '2.0') {
    return OASVersion.Version2;
  }

  throw new Error(`Unsupported OpenAPI Version: ${root.openapi || root.swagger}`);
}
