export interface GroupableFinding {
  ruleId: string;
  severity: string;
  message: string;
  operationId?: string | null;
  path?: string | null;
  target?: string | null;
  schemaPath?: string | null;
}

const KEY_SEPARATOR = '\u001F';

function normalizePart(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.trim();
}

export function createProblemKey(finding: GroupableFinding): string {
  const operationOrPath = normalizePart(finding.operationId) || normalizePart(finding.path);

  return [
    normalizePart(finding.ruleId),
    normalizePart(finding.severity),
    normalizePart(finding.message),
    operationOrPath,
    normalizePart(finding.target),
    normalizePart(finding.schemaPath),
  ].join(KEY_SEPARATOR);
}
