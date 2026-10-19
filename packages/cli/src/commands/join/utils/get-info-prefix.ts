import { isString, HandledError } from '@redocly/openapi-core';
import { yellow } from 'colorette';

export function getInfoPrefix(info: any, prefixArg: string | undefined, type: string) {
  if (!prefixArg) return '';
  if (!info) throw new HandledError('Info section is not found in specification.');
  if (!info[prefixArg])
    throw new HandledError(
      `${yellow(`prefix-${type}-with-info-prop`)} argument value is not found in info section.`
    );
  if (!isString(info[prefixArg]))
    throw new HandledError(
      `${yellow(`prefix-${type}-with-info-prop`)} argument value should be string.`
    );
  if (info[prefixArg].length > 50)
    throw new HandledError(
      `${yellow(
        `prefix-${type}-with-info-prop`
      )} argument value length should not exceed 50 characters.`
    );
  return info[prefixArg].replaceAll(/\s/g, '_');
}
