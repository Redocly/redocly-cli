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

exports.getLineNumberFromId = getLineNumberFromId;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9pbmRleC5qcyJdLCJuYW1lcyI6WyJ1cmxQYXR0ZXJuIiwiUmVnRXhwIiwiaXNVcmwiLCJzdHJpbmciLCJ0ZXN0Iiwib3V0cHV0UmVkIiwic3RyIiwib3V0cHV0VW5kZXJsaW5lIiwiZ2V0TGluZU51bWJlckZyb21JZCIsInNvdXJjZSIsImNoYXJJZCIsImxpbmVOdW0iLCJwb3NOdW0iLCJpIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7QUFDQSxNQUFNQSxVQUFVLEdBQUcsSUFBSUMsTUFBSixDQUFXLG9CQUFvQjtBQUFwQixFQUM1QixrREFENEIsQ0FDdUI7QUFEdkIsRUFFNUIsNkJBRjRCLENBRUU7QUFGRixFQUc1QixpQ0FINEIsQ0FHTTtBQUhOLEVBSTVCLDBCQUo0QixDQUlEO0FBSkMsRUFLNUIsb0JBTGlCLEVBS0ssR0FMTCxDQUFuQixDLENBSzhCOztBQUV2QixNQUFNQyxLQUFLLEdBQUlDLE1BQUQsSUFBWUgsVUFBVSxDQUFDSSxJQUFYLENBQWdCRCxNQUFoQixDQUExQjs7OztBQUNBLE1BQU1FLFNBQVMsR0FBSUMsR0FBRCxJQUFVLGFBQVlBLEdBQUksWUFBNUM7Ozs7QUFDQSxNQUFNQyxlQUFlLEdBQUlELEdBQUQsSUFBVSxZQUFXQSxHQUFJLFlBQWpEOzs7O0FBQ0EsTUFBTUUsbUJBQW1CLEdBQUcsQ0FBQ0MsTUFBRCxFQUFTQyxNQUFULEtBQW9CO0FBQ3JELE1BQUlDLE9BQU8sR0FBRyxDQUFkO0FBQ0EsTUFBSUMsTUFBTSxHQUFHLENBQWI7O0FBQ0EsT0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHSCxNQUFwQixFQUE0QkcsQ0FBQyxJQUFJLENBQWpDLEVBQW9DO0FBQ2xDLFFBQUlKLE1BQU0sQ0FBQ0ksQ0FBRCxDQUFOLEtBQWMsSUFBbEIsRUFBd0I7QUFDdEJGLE1BQUFBLE9BQU8sSUFBSSxDQUFYO0FBQ0FDLE1BQUFBLE1BQU0sR0FBR0YsTUFBTSxHQUFHRyxDQUFsQjtBQUNEO0FBQ0Y7O0FBQ0QsU0FBTztBQUNMRixJQUFBQSxPQURLO0FBRUxDLElBQUFBO0FBRkssR0FBUDtBQUlELENBYk0iLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvcHJlZmVyLWRlZmF1bHQtZXhwb3J0ICovXG5jb25zdCB1cmxQYXR0ZXJuID0gbmV3IFJlZ0V4cCgnXihodHRwcz86XFxcXC9cXFxcLyk/JyAvLyBwcm90b2NvbFxuKyAnKCgoW2EtelxcXFxkXShbYS16XFxcXGQtXSpbYS16XFxcXGRdKSopXFxcXC4pK1thLXpdezIsfXwnIC8vIGRvbWFpbiBuYW1lXG4rICcoKFxcXFxkezEsM31cXFxcLil7M31cXFxcZHsxLDN9KSknIC8vIE9SIGlwICh2NCkgYWRkcmVzc1xuKyAnKFxcXFw6XFxcXGQrKT8oXFxcXC9bLWEtelxcXFxkJV8ufitdKikqJyAvLyBwb3J0IGFuZCBwYXRoXG4rICcoXFxcXD9bOyZhLXpcXFxcZCVfLn4rPS1dKik/JyAvLyBxdWVyeSBzdHJpbmdcbisgJyhcXFxcI1stYS16XFxcXGRfXSopPyQnLCAnaScpOyAvLyBmcmFnbWVudCBsb2NhdG9yXG5cbmV4cG9ydCBjb25zdCBpc1VybCA9IChzdHJpbmcpID0+IHVybFBhdHRlcm4udGVzdChzdHJpbmcpO1xuZXhwb3J0IGNvbnN0IG91dHB1dFJlZCA9IChzdHIpID0+IGBcXHUwMDFiWzMxbSR7c3RyfVxcdTAwMWJbMzltYDtcbmV4cG9ydCBjb25zdCBvdXRwdXRVbmRlcmxpbmUgPSAoc3RyKSA9PiBgXFx1MDAxYls0bSR7c3RyfVxcdTAwMWJbMjRtYDtcbmV4cG9ydCBjb25zdCBnZXRMaW5lTnVtYmVyRnJvbUlkID0gKHNvdXJjZSwgY2hhcklkKSA9PiB7XG4gIGxldCBsaW5lTnVtID0gMTtcbiAgbGV0IHBvc051bSA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhcklkOyBpICs9IDEpIHtcbiAgICBpZiAoc291cmNlW2ldID09PSAnXFxuJykge1xuICAgICAgbGluZU51bSArPSAxO1xuICAgICAgcG9zTnVtID0gY2hhcklkIC0gaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBsaW5lTnVtLFxuICAgIHBvc051bSxcbiAgfTtcbn07XG4iXX0=