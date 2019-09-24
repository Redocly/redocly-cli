"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matchesJsonSchemaType = matchesJsonSchemaType;
exports.getLineNumberFromId = exports.outputUnderline = exports.outputRed = exports.isUrl = void 0;
// @ts-check

/** @typedef {'string'|'number'|'integer'|'boolean'|'null'|'object'|'array'} JSONSchemaType */

/* eslint-disable import/prefer-default-export */
const urlPattern = new RegExp('^(https?:\\/\\/)?' // protocol
+ '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' // domain name
+ '((\\d{1,3}\\.){3}\\d{1,3}))' // OR ip (v4) address
+ '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' // port and path
+ '(\\?[;&a-z\\d%_.~+=-]*)?' // query string
+ '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

const isUrl = string => urlPattern.test(string);

exports.isUrl = isUrl;

const outputRed = str => `\u001b[31m${str}\u001b[39m`;

exports.outputRed = outputRed;

const outputUnderline = str => `\u001b[4m${str}\u001b[24m`;

exports.outputUnderline = outputUnderline;

const getLineNumberFromId = (source, charId) => {
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
    posNum
  };
};
/**
 * Checks if value matches specified JSON schema type
 *
 * @param {*} value - value to check
 * @param {JSONSchemaType} type - JSON Schema type
 * @returns string
 */


exports.getLineNumberFromId = getLineNumberFromId;

function matchesJsonSchemaType(value, type) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ1cmxQYXR0ZXJuIiwiUmVnRXhwIiwiaXNVcmwiLCJzdHJpbmciLCJ0ZXN0Iiwib3V0cHV0UmVkIiwic3RyIiwib3V0cHV0VW5kZXJsaW5lIiwiZ2V0TGluZU51bWJlckZyb21JZCIsInNvdXJjZSIsImNoYXJJZCIsImxpbmVOdW0iLCJwb3NOdW0iLCJpIiwibWF0Y2hlc0pzb25TY2hlbWFUeXBlIiwidmFsdWUiLCJ0eXBlIiwiQXJyYXkiLCJpc0FycmF5IiwiTnVtYmVyIiwiaXNJbnRlZ2VyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBRUE7QUFDQSxNQUFNQSxVQUFVLEdBQUcsSUFBSUMsTUFBSixDQUFXLG9CQUFvQjtBQUFwQixFQUM1QixrREFENEIsQ0FDdUI7QUFEdkIsRUFFNUIsNkJBRjRCLENBRUU7QUFGRixFQUc1QixpQ0FINEIsQ0FHTTtBQUhOLEVBSTVCLDBCQUo0QixDQUlEO0FBSkMsRUFLNUIsb0JBTGlCLEVBS0ssR0FMTCxDQUFuQixDLENBSzhCOztBQUV2QixNQUFNQyxLQUFLLEdBQUlDLE1BQUQsSUFBWUgsVUFBVSxDQUFDSSxJQUFYLENBQWdCRCxNQUFoQixDQUExQjs7OztBQUNBLE1BQU1FLFNBQVMsR0FBSUMsR0FBRCxJQUFVLGFBQVlBLEdBQUksWUFBNUM7Ozs7QUFDQSxNQUFNQyxlQUFlLEdBQUlELEdBQUQsSUFBVSxZQUFXQSxHQUFJLFlBQWpEOzs7O0FBQ0EsTUFBTUUsbUJBQW1CLEdBQUcsQ0FBQ0MsTUFBRCxFQUFTQyxNQUFULEtBQW9CO0FBQ3JELE1BQUlDLE9BQU8sR0FBRyxDQUFkO0FBQ0EsTUFBSUMsTUFBTSxHQUFHLENBQWI7O0FBQ0EsT0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHSCxNQUFwQixFQUE0QkcsQ0FBQyxJQUFJLENBQWpDLEVBQW9DO0FBQ2xDLFFBQUlKLE1BQU0sQ0FBQ0ksQ0FBRCxDQUFOLEtBQWMsSUFBbEIsRUFBd0I7QUFDdEJGLE1BQUFBLE9BQU8sSUFBSSxDQUFYO0FBQ0FDLE1BQUFBLE1BQU0sR0FBR0YsTUFBTSxHQUFHRyxDQUFsQjtBQUNEO0FBQ0Y7O0FBQ0QsU0FBTztBQUNMRixJQUFBQSxPQURLO0FBRUxDLElBQUFBO0FBRkssR0FBUDtBQUlELENBYk07QUFlUDs7Ozs7Ozs7Ozs7QUFPTyxTQUFTRSxxQkFBVCxDQUErQkMsS0FBL0IsRUFBc0NDLElBQXRDLEVBQTRDO0FBQ2pELFVBQVFBLElBQVI7QUFDRSxTQUFLLE9BQUw7QUFDRSxhQUFPQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0gsS0FBZCxDQUFQOztBQUNGLFNBQUssUUFBTDtBQUNFLGFBQU8sT0FBT0EsS0FBUCxLQUFpQixRQUFqQixJQUE2QkEsS0FBSyxLQUFLLElBQXZDLElBQStDLENBQUNFLEtBQUssQ0FBQ0MsT0FBTixDQUFjSCxLQUFkLENBQXZEOztBQUNGLFNBQUssTUFBTDtBQUNFLGFBQU9BLEtBQUssS0FBSyxJQUFqQjs7QUFDRixTQUFLLFNBQUw7QUFDRSxhQUFPSSxNQUFNLENBQUNDLFNBQVAsQ0FBaUJMLEtBQWpCLENBQVA7O0FBQ0Y7QUFDRTtBQUNBLGFBQU8sT0FBT0EsS0FBUCxLQUFpQkMsSUFBeEI7QUFYSjtBQWFEIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWNoZWNrXG4vKiogQHR5cGVkZWYgeydzdHJpbmcnfCdudW1iZXInfCdpbnRlZ2VyJ3wnYm9vbGVhbid8J251bGwnfCdvYmplY3QnfCdhcnJheSd9IEpTT05TY2hlbWFUeXBlICovXG5cbi8qIGVzbGludC1kaXNhYmxlIGltcG9ydC9wcmVmZXItZGVmYXVsdC1leHBvcnQgKi9cbmNvbnN0IHVybFBhdHRlcm4gPSBuZXcgUmVnRXhwKCdeKGh0dHBzPzpcXFxcL1xcXFwvKT8nIC8vIHByb3RvY29sXG4rICcoKChbYS16XFxcXGRdKFthLXpcXFxcZC1dKlthLXpcXFxcZF0pKilcXFxcLikrW2Etel17Mix9fCcgLy8gZG9tYWluIG5hbWVcbisgJygoXFxcXGR7MSwzfVxcXFwuKXszfVxcXFxkezEsM30pKScgLy8gT1IgaXAgKHY0KSBhZGRyZXNzXG4rICcoXFxcXDpcXFxcZCspPyhcXFxcL1stYS16XFxcXGQlXy5+K10qKSonIC8vIHBvcnQgYW5kIHBhdGhcbisgJyhcXFxcP1s7JmEtelxcXFxkJV8ufis9LV0qKT8nIC8vIHF1ZXJ5IHN0cmluZ1xuKyAnKFxcXFwjWy1hLXpcXFxcZF9dKik/JCcsICdpJyk7IC8vIGZyYWdtZW50IGxvY2F0b3JcblxuZXhwb3J0IGNvbnN0IGlzVXJsID0gKHN0cmluZykgPT4gdXJsUGF0dGVybi50ZXN0KHN0cmluZyk7XG5leHBvcnQgY29uc3Qgb3V0cHV0UmVkID0gKHN0cikgPT4gYFxcdTAwMWJbMzFtJHtzdHJ9XFx1MDAxYlszOW1gO1xuZXhwb3J0IGNvbnN0IG91dHB1dFVuZGVybGluZSA9IChzdHIpID0+IGBcXHUwMDFiWzRtJHtzdHJ9XFx1MDAxYlsyNG1gO1xuZXhwb3J0IGNvbnN0IGdldExpbmVOdW1iZXJGcm9tSWQgPSAoc291cmNlLCBjaGFySWQpID0+IHtcbiAgbGV0IGxpbmVOdW0gPSAxO1xuICBsZXQgcG9zTnVtID0gMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGFySWQ7IGkgKz0gMSkge1xuICAgIGlmIChzb3VyY2VbaV0gPT09ICdcXG4nKSB7XG4gICAgICBsaW5lTnVtICs9IDE7XG4gICAgICBwb3NOdW0gPSBjaGFySWQgLSBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4ge1xuICAgIGxpbmVOdW0sXG4gICAgcG9zTnVtLFxuICB9O1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdmFsdWUgbWF0Y2hlcyBzcGVjaWZpZWQgSlNPTiBzY2hlbWEgdHlwZVxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgLSB2YWx1ZSB0byBjaGVja1xuICogQHBhcmFtIHtKU09OU2NoZW1hVHlwZX0gdHlwZSAtIEpTT04gU2NoZW1hIHR5cGVcbiAqIEByZXR1cm5zIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hlc0pzb25TY2hlbWFUeXBlKHZhbHVlLCB0eXBlKSB7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKTtcbiAgICBjYXNlICdvYmplY3QnOlxuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpO1xuICAgIGNhc2UgJ251bGwnOlxuICAgICAgcmV0dXJuIHZhbHVlID09PSBudWxsO1xuICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgcmV0dXJuIE51bWJlci5pc0ludGVnZXIodmFsdWUpO1xuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgdmFsaWQtdHlwZW9mXG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSB0eXBlO1xuICB9XG59XG4iXX0=