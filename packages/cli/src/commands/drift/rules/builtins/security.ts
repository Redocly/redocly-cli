import type { Finding, RuleContext, TrafficRule } from '../../types/index.js';

interface SecuritySchemeEvaluation {
  schemeName: string;
  schemeType: string;
  satisfied: boolean;
  skipped?: boolean;
  reason: string;
}

interface SecurityRequirementEvaluation {
  requirementIndex: number;
  satisfied: boolean;
  schemeResults: SecuritySchemeEvaluation[];
}

interface SecurityEvaluationResult {
  satisfied: boolean;
  requirements: SecurityRequirementEvaluation[];
}

interface SecurityIssue {
  requirement: number;
  schemeName: string;
  reason: string;
}

function extractAuthorizationScheme(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme] = authorizationHeader.trim().split(/\s+/, 1);
  return scheme ? scheme.toLowerCase() : null;
}

function hasAuthorizationHeader(context: RuleContext): boolean {
  return Boolean(context.exchange.request.headers.authorization);
}

function hasCookieValue(cookieHeader: string | undefined, cookieName: string): boolean {
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .some((part) => part.startsWith(`${cookieName}=`));
}

function evaluateScheme(context: RuleContext, schemeName: string): SecuritySchemeEvaluation {
  const operation = context.matchedOperation?.operation;
  if (!operation) {
    return {
      schemeName,
      schemeType: 'unknown',
      satisfied: true,
      reason: 'No matched OpenAPI operation.',
    };
  }

  const scheme = operation.securitySchemes[schemeName] as
    | { type?: string; name?: string; in?: string; scheme?: string }
    | undefined;
  if (!scheme) {
    return {
      schemeName,
      schemeType: 'missing',
      satisfied: false,
      reason: 'Security scheme is referenced but not defined in components.securitySchemes.',
    };
  }

  const schemeType = String(scheme.type ?? 'unknown');

  if (scheme.type === 'apiKey') {
    const parameterName = String(scheme.name ?? '');
    const parameterLocation = String(scheme.in ?? 'header');

    if (!parameterName) {
      return {
        schemeName,
        schemeType,
        satisfied: false,
        reason: 'apiKey scheme is missing the "name" field in the OpenAPI spec.',
      };
    }

    if (parameterLocation === 'header') {
      const present = Boolean(context.exchange.request.headers[parameterName.toLowerCase()]);
      return {
        schemeName,
        schemeType,
        satisfied: present,
        reason: present
          ? `Found required apiKey header "${parameterName}".`
          : `Missing required apiKey header "${parameterName}".`,
      };
    }

    if (parameterLocation === 'query') {
      const present = context.exchange.request.query.has(parameterName);
      return {
        schemeName,
        schemeType,
        satisfied: present,
        reason: present
          ? `Found required apiKey query parameter "${parameterName}".`
          : `Missing required apiKey query parameter "${parameterName}".`,
      };
    }

    if (parameterLocation === 'cookie') {
      if (context.ignoreCookies) {
        return {
          schemeName,
          schemeType,
          satisfied: true,
          skipped: true,
          reason: `Skipped apiKey cookie "${parameterName}" validation because --ignore-cookies is enabled.`,
        };
      }

      const present = hasCookieValue(context.exchange.request.headers.cookie, parameterName);
      return {
        schemeName,
        schemeType,
        satisfied: present,
        reason: present
          ? `Found required apiKey cookie "${parameterName}".`
          : `Missing required apiKey cookie "${parameterName}".`,
      };
    }

    return {
      schemeName,
      schemeType,
      satisfied: false,
      reason: `Unsupported apiKey location "${parameterLocation}" in OpenAPI security scheme.`,
    };
  }

  if (scheme.type === 'http') {
    const auth = context.exchange.request.headers.authorization;
    if (!auth) {
      return {
        schemeName,
        schemeType,
        satisfied: false,
        reason: 'Missing Authorization header.',
      };
    }

    const httpScheme = String(scheme.scheme ?? '').toLowerCase();
    const actualAuthScheme = extractAuthorizationScheme(auth);
    if (!httpScheme) {
      return {
        schemeName,
        schemeType,
        satisfied: true,
        reason: 'Authorization header is present and no specific HTTP auth scheme is documented.',
      };
    }

    if (!actualAuthScheme) {
      return {
        schemeName,
        schemeType,
        satisfied: false,
        reason: 'Authorization header is malformed and does not include an auth scheme.',
      };
    }

    const satisfied = actualAuthScheme === httpScheme;
    return {
      schemeName,
      schemeType,
      satisfied,
      reason: satisfied
        ? `Authorization uses expected "${httpScheme}" scheme.`
        : `Authorization uses "${actualAuthScheme}" but "${httpScheme}" is required.`,
    };
  }

  if (scheme.type === 'oauth2' || scheme.type === 'openIdConnect') {
    const auth = context.exchange.request.headers.authorization;
    if (!auth) {
      return {
        schemeName,
        schemeType,
        satisfied: false,
        reason: 'Missing Authorization header for OAuth2/OpenID Connect scheme.',
      };
    }

    const actualAuthScheme = extractAuthorizationScheme(auth);
    const satisfied = actualAuthScheme === 'bearer';
    return {
      schemeName,
      schemeType,
      satisfied,
      reason: satisfied
        ? 'Authorization uses bearer token as expected for OAuth2/OpenID Connect.'
        : `Authorization scheme "${actualAuthScheme ?? 'unknown'}" does not satisfy OAuth2/OpenID Connect (expected bearer).`,
    };
  }

  if (scheme.type === 'mutualTLS') {
    // This cannot be validated reliably from HTTP logs alone.
    return {
      schemeName,
      schemeType,
      satisfied: true,
      reason: 'mutualTLS cannot be validated from HTTP traffic logs alone.',
    };
  }

  return {
    schemeName,
    schemeType,
    satisfied: false,
    reason: `Unsupported security scheme type "${schemeType}".`,
  };
}

function evaluateSecurityRequirements(context: RuleContext): SecurityEvaluationResult {
  const security = context.matchedOperation?.operation.security;
  if (!security) {
    return {
      satisfied: true,
      requirements: [],
    };
  }

  if (security.length === 0) {
    return {
      satisfied: true,
      requirements: [],
    };
  }

  const requirements = security.map((requirement, requirementIndex) => {
    const schemeNames = Object.keys(requirement);
    if (schemeNames.length === 0) {
      return {
        requirementIndex,
        satisfied: true,
        schemeResults: [],
      };
    }

    const schemeResults = schemeNames.map((schemeName) => evaluateScheme(context, schemeName));
    return {
      requirementIndex,
      satisfied: schemeResults.every((result) => result.satisfied),
      schemeResults,
    };
  });

  return {
    satisfied: requirements.some((requirement) => requirement.satisfied),
    requirements,
  };
}

function collectSecurityIssues(evaluation: SecurityEvaluationResult): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const requirement of evaluation.requirements) {
    for (const schemeResult of requirement.schemeResults) {
      if (!schemeResult.satisfied) {
        issues.push({
          requirement: requirement.requirementIndex + 1,
          schemeName: schemeResult.schemeName,
          reason: schemeResult.reason,
        });
      }
    }
  }
  return issues;
}

function collectSkippedSecurityChecks(evaluation: SecurityEvaluationResult): SecurityIssue[] {
  const skippedChecks: SecurityIssue[] = [];
  for (const requirement of evaluation.requirements) {
    for (const schemeResult of requirement.schemeResults) {
      if (schemeResult.skipped) {
        skippedChecks.push({
          requirement: requirement.requirementIndex + 1,
          schemeName: schemeResult.schemeName,
          reason: schemeResult.reason,
        });
      }
    }
  }
  return skippedChecks;
}

function createSecuritySummary(issues: SecurityIssue[]): string {
  if (issues.length === 0) {
    return 'All documented security requirements are satisfied.';
  }

  const groupedByRequirement = new Map<number, SecurityIssue[]>();
  for (const issue of issues) {
    const grouped = groupedByRequirement.get(issue.requirement);
    if (grouped) {
      grouped.push(issue);
    } else {
      groupedByRequirement.set(issue.requirement, [issue]);
    }
  }

  const optionSummaries = Array.from(groupedByRequirement.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([requirement, optionIssues]) => {
      const schemeNames = optionIssues.map((issue) => issue.schemeName).join(' + ');
      const reasons = optionIssues.map((issue) => issue.reason).join(' ');
      return `Option ${requirement} (${schemeNames}): ${reasons}`;
    });

  if (optionSummaries.length === 1) {
    return `Authentication check failed. ${optionSummaries[0]}`;
  }

  return `None of the documented authentication options matched. Any one of these options would satisfy the OpenAPI security requirements: ${optionSummaries.join(' | ')}`;
}

function getSensitiveQueryKeys(context: RuleContext): string[] {
  return Array.from(context.exchange.request.query.keys()).filter((key) => {
    const normalizedKey = key.toLowerCase();
    return (
      normalizedKey.includes('token') ||
      normalizedKey.includes('apikey') ||
      normalizedKey.includes('api_key') ||
      normalizedKey.includes('access_key')
    );
  });
}

function shouldFlagInsecureTransport(context: RuleContext): {
  flag: boolean;
  hasAuthHeader: boolean;
  sensitiveQueryKeys: string[];
} {
  if (context.exchange.request.protocol !== 'http:' || !context.exchange.request.protocolKnown) {
    return {
      flag: false,
      hasAuthHeader: false,
      sensitiveQueryKeys: [],
    };
  }

  const hasAuthHeader = hasAuthorizationHeader(context);
  const sensitiveQueryKeys = getSensitiveQueryKeys(context);

  return {
    flag: hasAuthHeader || sensitiveQueryKeys.length > 0,
    hasAuthHeader,
    sensitiveQueryKeys,
  };
}

export class SecurityRule implements TrafficRule {
  public readonly id = 'security-baseline';

  public analyze(context: RuleContext): Finding[] {
    if (!context.matchedOperation) {
      return [];
    }

    const findings: Finding[] = [];

    const securityEvaluation = evaluateSecurityRequirements(context);
    if (!securityEvaluation.satisfied) {
      const issues = collectSecurityIssues(securityEvaluation);
      findings.push({
        ruleId: this.id,
        severity: 'error',
        category: 'security',
        message: 'Request does not satisfy documented OpenAPI security requirements',
        exchangeIndex: context.exchange.index,
        operationId: context.matchedOperation.operation.operationId,
        specSource: context.matchedOperation.operation.specSource,
        target: 'request',
        details: {
          summary: createSecuritySummary(issues),
          failedChecks: issues,
          skippedChecks: collectSkippedSecurityChecks(securityEvaluation),
          authorizationScheme: extractAuthorizationScheme(
            context.exchange.request.headers.authorization
          ),
          hasAuthorizationHeader: hasAuthorizationHeader(context),
        },
      });
    } else {
      const skippedChecks = collectSkippedSecurityChecks(securityEvaluation);
      if (skippedChecks.length > 0) {
        findings.push({
          ruleId: this.id,
          severity: 'info',
          category: 'security',
          message: 'Some documented cookie-based security checks were skipped',
          exchangeIndex: context.exchange.index,
          operationId: context.matchedOperation.operation.operationId,
          specSource: context.matchedOperation.operation.specSource,
          target: 'request',
          details: {
            summary: skippedChecks
              .map(
                (check) =>
                  `Skipped option ${check.requirement} (${check.schemeName}): ${check.reason}`
              )
              .join(' '),
            skippedChecks,
          },
        });
      }
    }

    const insecureTransport = shouldFlagInsecureTransport(context);
    if (insecureTransport.flag) {
      findings.push({
        ruleId: this.id,
        severity: 'warning',
        category: 'security',
        message: 'Potential credential exposure over insecure HTTP transport',
        exchangeIndex: context.exchange.index,
        operationId: context.matchedOperation.operation.operationId,
        specSource: context.matchedOperation.operation.specSource,
        target: 'request',
        details: {
          protocol: context.exchange.request.protocol,
          hasAuthorizationHeader: insecureTransport.hasAuthHeader,
          sensitiveQueryKeys: insecureTransport.sensitiveQueryKeys,
        },
      });
    }

    return findings;
  }
}
