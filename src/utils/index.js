// @ts-check
/** @typedef {'string'|'number'|'integer'|'boolean'|'null'|'object'|'array'} JSONSchemaType */

import { XMLHttpRequest } from 'xmlhttprequest';
import chalk from 'chalk';

/* eslint-disable import/prefer-default-export */
const urlPattern = new RegExp('^(https?:\\/\\/)?' // protocol
+ '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' // domain name
+ '((\\d{1,3}\\.){3}\\d{1,3}))' // OR ip (v4) address
+ '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' // port and path
+ '(\\?[;&a-z\\d%_.~+=-]*)?' // query string
+ '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

export const isUrl = (string) => urlPattern.test(string);

export const outputRed = (str) => chalk.red(str);
export const outputUnderline = (str) => chalk.underline(str);
export const outputBgLightBlue = (str) => chalk.bgBlueBright(str);

export const outputLightBlue = (str) => chalk.blueBright(str);
export const outputGrey = (str) => chalk.grey(str);
export const outputBgRed = (str) => chalk.bgRed(str);
export const outputBgYellow = (str) => chalk.bgYellow(str);
export const outputYellow = (str) => chalk.yellow(str);
export const getLineNumberFromId = (source, charId) => {
  let lineNum = 1;
  let posNum = 0;
  for (let i = 0; i < charId; i += 1) {
    if (source[i] === '\n') {
      lineNum += 1;
      posNum = charId - i;
    }
  }
  return {
    lineNum,
    posNum,
  };
};

/**
 * Checks if value matches specified JSON schema type
 *
 * @param {*} value - value to check
 * @param {JSONSchemaType} type - JSON Schema type
 * @returns string
 */
export function matchesJsonSchemaType(value, type) {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    case 'integer':
      return Number.isInteger(value);
    default:
      // eslint-disable-next-line valid-typeof
      return typeof value === type;
  }
}

/**
  *
  * MIT License
  *
  * Copyright (c) 2019 GraphQL Contributors
  *
  * Permission is hereby granted, free of charge, to any person obtaining a copy
  * of this software and associated documentation files (the "Software"), to deal
  * in the Software without restriction, including without limitation the rights
  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  * copies of the Software, and to permit persons to whom the Software is
  * furnished to do so, subject to the following conditions:
  *
  * The above copyright notice and this permission notice shall be included in all
  * copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  * SOFTWARE.
  *
  * Computes the lexical distance between strings A and B.
  *
  * The "distance" between two strings is given by counting the minimum number
  * of edits needed to transform string A into string B. An edit can be an
  * insertion, deletion, or substitution of a single character, or a swap of two
  * adjacent characters.
  *
  * Includes a custom alteration from Damerau-Levenshtein to treat case changes
  * as a single edit which helps identify mis-cased values with an edit distance
  * of 1.
  *
  * This distance can be useful for detecting typos in input or sorting
  *
  * @param {string} aStr
  * @param {string} bStr
  * @return {number} distance in number of edits
  */
export function lexicalDistance(aStr, bStr) {
  if (aStr === bStr) {
    return 0;
  }

  const d = [];
  const a = aStr.toLowerCase();
  const b = bStr.toLowerCase();
  const aLength = a.length;
  const bLength = b.length;

  // Any case change counts as a single edit
  if (a === b) {
    return 1;
  }

  for (let i = 0; i <= aLength; i++) {
    d[i] = [i];
  }

  for (let j = 1; j <= bLength; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= aLength; i++) {
    for (let j = 1; j <= bLength; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
      }
    }
  }

  return d[aLength][bLength];
}

export function getClosestString(given, others) {
  if (!others || others.length === 0) return null;
  let bestMatch = {
    string: others[0],
    distance: lexicalDistance(given, others[0]),
  };
  for (let i = 0; i < others.length; i++) {
    const distance = lexicalDistance(given, others[i]);
    bestMatch = distance < bestMatch.distance ? {
      string: others[i],
      distance,
    } : bestMatch;
  }

  if (bestMatch.distance <= 4) return bestMatch.string;
  return null;
}

export const getFileSync = (link) => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', link, false);
  xhr.send();
  
  if (xhr.status !== 200) {
    return null;
  }
  return xhr.responseText; 
};
