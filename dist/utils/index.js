"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matchesJsonSchemaType = matchesJsonSchemaType;
exports.getLineNumberFromId = exports.outputBgRed = exports.outputGrey = exports.outputLightBlue = exports.outputBgLightBlue = exports.outputUnderline = exports.outputRed = exports.isUrl = void 0;
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

const outputBgLightBlue = str => `[44m${str}[49m`;

exports.outputBgLightBlue = outputBgLightBlue;

const outputLightBlue = str => `[94m${str}[39m`;

exports.outputLightBlue = outputLightBlue;

const outputGrey = str => `[90m${str}[39m`;

exports.outputGrey = outputGrey;

const outputBgRed = str => `\u001b[41m${str}\u001b[49m`;

exports.outputBgRed = outputBgRed;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ1cmxQYXR0ZXJuIiwiUmVnRXhwIiwiaXNVcmwiLCJzdHJpbmciLCJ0ZXN0Iiwib3V0cHV0UmVkIiwic3RyIiwib3V0cHV0VW5kZXJsaW5lIiwib3V0cHV0QmdMaWdodEJsdWUiLCJvdXRwdXRMaWdodEJsdWUiLCJvdXRwdXRHcmV5Iiwib3V0cHV0QmdSZWQiLCJnZXRMaW5lTnVtYmVyRnJvbUlkIiwic291cmNlIiwiY2hhcklkIiwibGluZU51bSIsInBvc051bSIsImkiLCJtYXRjaGVzSnNvblNjaGVtYVR5cGUiLCJ2YWx1ZSIsInR5cGUiLCJBcnJheSIsImlzQXJyYXkiLCJOdW1iZXIiLCJpc0ludGVnZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFFQTtBQUNBLE1BQU1BLFVBQVUsR0FBRyxJQUFJQyxNQUFKLENBQVcsb0JBQW9CO0FBQXBCLEVBQzVCLGtEQUQ0QixDQUN1QjtBQUR2QixFQUU1Qiw2QkFGNEIsQ0FFRTtBQUZGLEVBRzVCLGlDQUg0QixDQUdNO0FBSE4sRUFJNUIsMEJBSjRCLENBSUQ7QUFKQyxFQUs1QixvQkFMaUIsRUFLSyxHQUxMLENBQW5CLEMsQ0FLOEI7O0FBRXZCLE1BQU1DLEtBQUssR0FBSUMsTUFBRCxJQUFZSCxVQUFVLENBQUNJLElBQVgsQ0FBZ0JELE1BQWhCLENBQTFCOzs7O0FBQ0EsTUFBTUUsU0FBUyxHQUFJQyxHQUFELElBQVUsYUFBWUEsR0FBSSxZQUE1Qzs7OztBQUNBLE1BQU1DLGVBQWUsR0FBSUQsR0FBRCxJQUFVLFlBQVdBLEdBQUksWUFBakQ7Ozs7QUFDQSxNQUFNRSxpQkFBaUIsR0FBSUYsR0FBRCxJQUFVLFFBQU9BLEdBQUksT0FBL0M7Ozs7QUFDQSxNQUFNRyxlQUFlLEdBQUlILEdBQUQsSUFBVSxRQUFPQSxHQUFJLE9BQTdDOzs7O0FBQ0EsTUFBTUksVUFBVSxHQUFJSixHQUFELElBQVUsUUFBT0EsR0FBSSxPQUF4Qzs7OztBQUNBLE1BQU1LLFdBQVcsR0FBSUwsR0FBRCxJQUFVLGFBQVlBLEdBQUksWUFBOUM7Ozs7QUFDQSxNQUFNTSxtQkFBbUIsR0FBRyxDQUFDQyxNQUFELEVBQVNDLE1BQVQsS0FBb0I7QUFDckQsTUFBSUMsT0FBTyxHQUFHLENBQWQ7QUFDQSxNQUFJQyxNQUFNLEdBQUcsQ0FBYjs7QUFDQSxPQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdILE1BQXBCLEVBQTRCRyxDQUFDLElBQUksQ0FBakMsRUFBb0M7QUFDbEMsUUFBSUosTUFBTSxDQUFDSSxDQUFELENBQU4sS0FBYyxJQUFsQixFQUF3QjtBQUN0QkYsTUFBQUEsT0FBTyxJQUFJLENBQVg7QUFDQUMsTUFBQUEsTUFBTSxHQUFHRixNQUFNLEdBQUdHLENBQWxCO0FBQ0Q7QUFDRjs7QUFDRCxTQUFPO0FBQ0xGLElBQUFBLE9BREs7QUFFTEMsSUFBQUE7QUFGSyxHQUFQO0FBSUQsQ0FiTTtBQWVQOzs7Ozs7Ozs7OztBQU9PLFNBQVNFLHFCQUFULENBQStCQyxLQUEvQixFQUFzQ0MsSUFBdEMsRUFBNEM7QUFDakQsVUFBUUEsSUFBUjtBQUNFLFNBQUssT0FBTDtBQUNFLGFBQU9DLEtBQUssQ0FBQ0MsT0FBTixDQUFjSCxLQUFkLENBQVA7O0FBQ0YsU0FBSyxRQUFMO0FBQ0UsYUFBTyxPQUFPQSxLQUFQLEtBQWlCLFFBQWpCLElBQTZCQSxLQUFLLEtBQUssSUFBdkMsSUFBK0MsQ0FBQ0UsS0FBSyxDQUFDQyxPQUFOLENBQWNILEtBQWQsQ0FBdkQ7O0FBQ0YsU0FBSyxNQUFMO0FBQ0UsYUFBT0EsS0FBSyxLQUFLLElBQWpCOztBQUNGLFNBQUssU0FBTDtBQUNFLGFBQU9JLE1BQU0sQ0FBQ0MsU0FBUCxDQUFpQkwsS0FBakIsQ0FBUDs7QUFDRjtBQUNFO0FBQ0EsYUFBTyxPQUFPQSxLQUFQLEtBQWlCQyxJQUF4QjtBQVhKO0FBYUQiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtY2hlY2tcbi8qKiBAdHlwZWRlZiB7J3N0cmluZyd8J251bWJlcid8J2ludGVnZXInfCdib29sZWFuJ3wnbnVsbCd8J29iamVjdCd8J2FycmF5J30gSlNPTlNjaGVtYVR5cGUgKi9cblxuLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L3ByZWZlci1kZWZhdWx0LWV4cG9ydCAqL1xuY29uc3QgdXJsUGF0dGVybiA9IG5ldyBSZWdFeHAoJ14oaHR0cHM/OlxcXFwvXFxcXC8pPycgLy8gcHJvdG9jb2xcbisgJygoKFthLXpcXFxcZF0oW2EtelxcXFxkLV0qW2EtelxcXFxkXSkqKVxcXFwuKStbYS16XXsyLH18JyAvLyBkb21haW4gbmFtZVxuKyAnKChcXFxcZHsxLDN9XFxcXC4pezN9XFxcXGR7MSwzfSkpJyAvLyBPUiBpcCAodjQpIGFkZHJlc3NcbisgJyhcXFxcOlxcXFxkKyk/KFxcXFwvWy1hLXpcXFxcZCVfLn4rXSopKicgLy8gcG9ydCBhbmQgcGF0aFxuKyAnKFxcXFw/WzsmYS16XFxcXGQlXy5+Kz0tXSopPycgLy8gcXVlcnkgc3RyaW5nXG4rICcoXFxcXCNbLWEtelxcXFxkX10qKT8kJywgJ2knKTsgLy8gZnJhZ21lbnQgbG9jYXRvclxuXG5leHBvcnQgY29uc3QgaXNVcmwgPSAoc3RyaW5nKSA9PiB1cmxQYXR0ZXJuLnRlc3Qoc3RyaW5nKTtcbmV4cG9ydCBjb25zdCBvdXRwdXRSZWQgPSAoc3RyKSA9PiBgXFx1MDAxYlszMW0ke3N0cn1cXHUwMDFiWzM5bWA7XG5leHBvcnQgY29uc3Qgb3V0cHV0VW5kZXJsaW5lID0gKHN0cikgPT4gYFxcdTAwMWJbNG0ke3N0cn1cXHUwMDFiWzI0bWA7XG5leHBvcnQgY29uc3Qgb3V0cHV0QmdMaWdodEJsdWUgPSAoc3RyKSA9PiBgXHUwMDFiWzQ0bSR7c3RyfVx1MDAxYls0OW1gO1xuZXhwb3J0IGNvbnN0IG91dHB1dExpZ2h0Qmx1ZSA9IChzdHIpID0+IGBcdTAwMWJbOTRtJHtzdHJ9XHUwMDFiWzM5bWA7XG5leHBvcnQgY29uc3Qgb3V0cHV0R3JleSA9IChzdHIpID0+IGBcdTAwMWJbOTBtJHtzdHJ9XHUwMDFiWzM5bWA7XG5leHBvcnQgY29uc3Qgb3V0cHV0QmdSZWQgPSAoc3RyKSA9PiBgXFx1MDAxYls0MW0ke3N0cn1cXHUwMDFiWzQ5bWA7XG5leHBvcnQgY29uc3QgZ2V0TGluZU51bWJlckZyb21JZCA9IChzb3VyY2UsIGNoYXJJZCkgPT4ge1xuICBsZXQgbGluZU51bSA9IDE7XG4gIGxldCBwb3NOdW0gPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYXJJZDsgaSArPSAxKSB7XG4gICAgaWYgKHNvdXJjZVtpXSA9PT0gJ1xcbicpIHtcbiAgICAgIGxpbmVOdW0gKz0gMTtcbiAgICAgIHBvc051bSA9IGNoYXJJZCAtIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7XG4gICAgbGluZU51bSxcbiAgICBwb3NOdW0sXG4gIH07XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB2YWx1ZSBtYXRjaGVzIHNwZWNpZmllZCBKU09OIHNjaGVtYSB0eXBlXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSAtIHZhbHVlIHRvIGNoZWNrXG4gKiBAcGFyYW0ge0pTT05TY2hlbWFUeXBlfSB0eXBlIC0gSlNPTiBTY2hlbWEgdHlwZVxuICogQHJldHVybnMgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaGVzSnNvblNjaGVtYVR5cGUodmFsdWUsIHR5cGUpIHtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnYXJyYXknOlxuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpO1xuICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSk7XG4gICAgY2FzZSAnbnVsbCc6XG4gICAgICByZXR1cm4gdmFsdWUgPT09IG51bGw7XG4gICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcih2YWx1ZSk7XG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSB2YWxpZC10eXBlb2ZcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IHR5cGU7XG4gIH1cbn1cbiJdfQ==