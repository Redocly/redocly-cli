"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLineNumberFromId = exports.outputUnderline = exports.outputRed = exports.isUrl = void 0;

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
  let posNum;

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

exports.getLineNumberFromId = getLineNumberFromId;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ1cmxQYXR0ZXJuIiwiUmVnRXhwIiwiaXNVcmwiLCJzdHJpbmciLCJ0ZXN0Iiwib3V0cHV0UmVkIiwic3RyIiwib3V0cHV0VW5kZXJsaW5lIiwiZ2V0TGluZU51bWJlckZyb21JZCIsInNvdXJjZSIsImNoYXJJZCIsImxpbmVOdW0iLCJwb3NOdW0iLCJpIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7QUFDQSxNQUFNQSxVQUFVLEdBQUcsSUFBSUMsTUFBSixDQUFXLG9CQUFvQjtBQUFwQixFQUM1QixrREFENEIsQ0FDdUI7QUFEdkIsRUFFNUIsNkJBRjRCLENBRUU7QUFGRixFQUc1QixpQ0FINEIsQ0FHTTtBQUhOLEVBSTVCLDBCQUo0QixDQUlEO0FBSkMsRUFLNUIsb0JBTGlCLEVBS0ssR0FMTCxDQUFuQixDLENBSzhCOztBQUV2QixNQUFNQyxLQUFLLEdBQUlDLE1BQUQsSUFBWUgsVUFBVSxDQUFDSSxJQUFYLENBQWdCRCxNQUFoQixDQUExQjs7OztBQUNBLE1BQU1FLFNBQVMsR0FBSUMsR0FBRCxJQUFVLGFBQVlBLEdBQUksWUFBNUM7Ozs7QUFDQSxNQUFNQyxlQUFlLEdBQUlELEdBQUQsSUFBVSxZQUFXQSxHQUFJLFlBQWpEOzs7O0FBQ0EsTUFBTUUsbUJBQW1CLEdBQUcsQ0FBQ0MsTUFBRCxFQUFTQyxNQUFULEtBQW9CO0FBQ3JELE1BQUlDLE9BQU8sR0FBRyxDQUFkO0FBQ0EsTUFBSUMsTUFBSjs7QUFDQSxPQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdILE1BQXBCLEVBQTRCRyxDQUFDLElBQUksQ0FBakMsRUFBb0M7QUFDbEMsUUFBSUosTUFBTSxDQUFDSSxDQUFELENBQU4sS0FBYyxJQUFsQixFQUF3QjtBQUN0QkYsTUFBQUEsT0FBTyxJQUFJLENBQVg7QUFDQUMsTUFBQUEsTUFBTSxHQUFHRixNQUFNLEdBQUdHLENBQWxCO0FBQ0Q7QUFDRjs7QUFDRCxTQUFPO0FBQ0xGLElBQUFBLE9BREs7QUFFTEMsSUFBQUE7QUFGSyxHQUFQO0FBSUQsQ0FiTSIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIGltcG9ydC9wcmVmZXItZGVmYXVsdC1leHBvcnQgKi9cbmNvbnN0IHVybFBhdHRlcm4gPSBuZXcgUmVnRXhwKCdeKGh0dHBzPzpcXFxcL1xcXFwvKT8nIC8vIHByb3RvY29sXG4rICcoKChbYS16XFxcXGRdKFthLXpcXFxcZC1dKlthLXpcXFxcZF0pKilcXFxcLikrW2Etel17Mix9fCcgLy8gZG9tYWluIG5hbWVcbisgJygoXFxcXGR7MSwzfVxcXFwuKXszfVxcXFxkezEsM30pKScgLy8gT1IgaXAgKHY0KSBhZGRyZXNzXG4rICcoXFxcXDpcXFxcZCspPyhcXFxcL1stYS16XFxcXGQlXy5+K10qKSonIC8vIHBvcnQgYW5kIHBhdGhcbisgJyhcXFxcP1s7JmEtelxcXFxkJV8ufis9LV0qKT8nIC8vIHF1ZXJ5IHN0cmluZ1xuKyAnKFxcXFwjWy1hLXpcXFxcZF9dKik/JCcsICdpJyk7IC8vIGZyYWdtZW50IGxvY2F0b3JcblxuZXhwb3J0IGNvbnN0IGlzVXJsID0gKHN0cmluZykgPT4gdXJsUGF0dGVybi50ZXN0KHN0cmluZyk7XG5leHBvcnQgY29uc3Qgb3V0cHV0UmVkID0gKHN0cikgPT4gYFxcdTAwMWJbMzFtJHtzdHJ9XFx1MDAxYlszOW1gO1xuZXhwb3J0IGNvbnN0IG91dHB1dFVuZGVybGluZSA9IChzdHIpID0+IGBcXHUwMDFiWzRtJHtzdHJ9XFx1MDAxYlsyNG1gO1xuZXhwb3J0IGNvbnN0IGdldExpbmVOdW1iZXJGcm9tSWQgPSAoc291cmNlLCBjaGFySWQpID0+IHtcbiAgbGV0IGxpbmVOdW0gPSAxO1xuICBsZXQgcG9zTnVtO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYXJJZDsgaSArPSAxKSB7XG4gICAgaWYgKHNvdXJjZVtpXSA9PT0gJ1xcbicpIHtcbiAgICAgIGxpbmVOdW0gKz0gMTtcbiAgICAgIHBvc051bSA9IGNoYXJJZCAtIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7XG4gICAgbGluZU51bSxcbiAgICBwb3NOdW0sXG4gIH07XG59O1xuIl19