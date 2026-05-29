import type { UserContext } from '../walk.js';

type MimeTypeParams = {
  type: 'consumes' | 'produces';
  value: any;
  ctx: UserContext;
  allowedValues: string[];
  reference?: string;
};

export function validateMimeTypeOAS2({
  type,
  value,
  ctx,
  allowedValues,
  reference,
}: MimeTypeParams) {
  const { report, location } = ctx;
  const ruleType = type === 'consumes' ? 'request' : 'response';
  if (!allowedValues)
    throw new Error(`Parameter "allowedValues" is not provided for "${ruleType}-mime-type" rule`);
  if (!value[type]) return;

  for (const mime of value[type]) {
    if (!allowedValues.includes(mime)) {
      report({
        message: `Mime type "${mime}" is not allowed`,
        location: location.child(value[type].indexOf(mime)).key(),
        reference,
      });
    }
  }
}

export function validateMimeTypeOAS3({
  type,
  value,
  ctx,
  allowedValues,
  reference,
}: MimeTypeParams) {
  const { report, location } = ctx;
  const ruleType = type === 'consumes' ? 'request' : 'response';
  if (!allowedValues)
    throw new Error(`Parameter "allowedValues" is not provided for "${ruleType}-mime-type" rule`);
  if (!value.content) return;

  for (const mime of Object.keys(value.content)) {
    if (!allowedValues.includes(mime)) {
      report({
        message: `Mime type "${mime}" is not allowed`,
        location: location.child('content').child(mime).key(),
        reference,
      });
    }
  }
}
