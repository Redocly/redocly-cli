"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _jsYaml = _interopRequireDefault(require("js-yaml"));

var _error = _interopRequireDefault(require("./error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 *
 * Here we go over each of the steps in the link and try to retreive the value
 * for it. If failed (e.g. because of undefined value) -- return null, to indicate that such
 * reference does not exist.
 *
 * @param {string} link A path in the yaml document which is to be resolved
 * @param {*} ctx JSON Object with the document field which represents the YAML structure
 */
const resolve = (link, ctx) => {
  const linkSplitted = link.split('#/');
  const [filePath, docPath] = linkSplitted;
  let fullFileName;
  let target;
  let fData;

  if (filePath) {
    const path = ctx.filePath.substring(0, Math.max(ctx.filePath.lastIndexOf('/'), ctx.filePath.lastIndexOf('\\')));
    fullFileName = `${path}/${filePath}`;
    fData = _fs.default.readFileSync(fullFileName, 'utf-8');
    target = _jsYaml.default.safeLoad(fData);
  } else {
    target = ctx.document;
  }

  if (docPath) {
    const steps = docPath.split('/').filter(el => el !== '');
    Object.keys(steps).forEach(step => {
      target = target && steps[step] && target[steps[step]] ? target[steps[step]] : null;
    });
  }

  return {
    node: target,
    updatedSource: filePath ? fData : null,
    docPath: docPath ? docPath.split('/') : [],
    filePath: fullFileName || null
  };
};

const resolveNode = (node, ctx) => {
  if (!node || typeof node !== 'object') return {
    node,
    nextPath: null
  };
  let nextPath;
  let resolved = {
    node
  };
  Object.keys(node).forEach(p => {
    if (p === '$ref') {
      resolved = resolve(node[p], ctx);
      nextPath = resolved.docPath;

      if (!resolved.node) {
        ctx.path.push('$ref');
        ctx.result.push((0, _error.default)('Refernce does not exist', node, ctx));
        ctx.path.pop();
        resolved.node = node;
        nextPath = ctx.path;
        resolved.updatedSource = null;
      }
    }
  });
  return {
    node: resolved.node,
    nextPath,
    updatedSource: resolved.updatedSource,
    filePath: resolved.filePath
  };
};

var _default = resolveNode;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9yZXNvbHZlci5qcyJdLCJuYW1lcyI6WyJyZXNvbHZlIiwibGluayIsImN0eCIsImxpbmtTcGxpdHRlZCIsInNwbGl0IiwiZmlsZVBhdGgiLCJkb2NQYXRoIiwiZnVsbEZpbGVOYW1lIiwidGFyZ2V0IiwiZkRhdGEiLCJwYXRoIiwic3Vic3RyaW5nIiwiTWF0aCIsIm1heCIsImxhc3RJbmRleE9mIiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJ5YW1sIiwic2FmZUxvYWQiLCJkb2N1bWVudCIsInN0ZXBzIiwiZmlsdGVyIiwiZWwiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsInN0ZXAiLCJub2RlIiwidXBkYXRlZFNvdXJjZSIsInJlc29sdmVOb2RlIiwibmV4dFBhdGgiLCJyZXNvbHZlZCIsInAiLCJwdXNoIiwicmVzdWx0IiwicG9wIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7O0FBQ0E7O0FBQ0E7Ozs7QUFFQTs7Ozs7Ozs7O0FBU0EsTUFBTUEsT0FBTyxHQUFHLENBQUNDLElBQUQsRUFBT0MsR0FBUCxLQUFlO0FBQzdCLFFBQU1DLFlBQVksR0FBR0YsSUFBSSxDQUFDRyxLQUFMLENBQVcsSUFBWCxDQUFyQjtBQUNBLFFBQU0sQ0FBQ0MsUUFBRCxFQUFXQyxPQUFYLElBQXNCSCxZQUE1QjtBQUNBLE1BQUlJLFlBQUo7QUFFQSxNQUFJQyxNQUFKO0FBQ0EsTUFBSUMsS0FBSjs7QUFDQSxNQUFJSixRQUFKLEVBQWM7QUFDWixVQUFNSyxJQUFJLEdBQUdSLEdBQUcsQ0FBQ0csUUFBSixDQUFhTSxTQUFiLENBQXVCLENBQXZCLEVBQTBCQyxJQUFJLENBQUNDLEdBQUwsQ0FBU1gsR0FBRyxDQUFDRyxRQUFKLENBQWFTLFdBQWIsQ0FBeUIsR0FBekIsQ0FBVCxFQUF3Q1osR0FBRyxDQUFDRyxRQUFKLENBQWFTLFdBQWIsQ0FBeUIsSUFBekIsQ0FBeEMsQ0FBMUIsQ0FBYjtBQUNBUCxJQUFBQSxZQUFZLEdBQUksR0FBRUcsSUFBSyxJQUFHTCxRQUFT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bmltcG9ydCB5YW1sIGZyb20gJ2pzLXlhbWwnO1xuaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gJy4vZXJyb3InO1xuXG4vKipcbiAqXG4gKiBIZXJlIHdlIGdvIG92ZXIgZWFjaCBvZiB0aGUgc3RlcHMgaW4gdGhlIGxpbmsgYW5kIHRyeSB0byByZXRyZWl2ZSB0aGUgdmFsdWVcbiAqIGZvciBpdC4gSWYgZmFpbGVkIChlLmcuIGJlY2F1c2Ugb2YgdW5kZWZpbmVkIHZhbHVlKSAtLSByZXR1cm4gbnVsbCwgdG8gaW5kaWNhdGUgdGhhdCBzdWNoXG4gKiByZWZlcmVuY2UgZG9lcyBub3QgZXhpc3QuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGxpbmsgQSBwYXRoIGluIHRoZSB5YW1sIGRvY3VtZW50IHdoaWNoIGlzIHRvIGJlIHJlc29sdmVkXG4gKiBAcGFyYW0geyp9IGN0eCBKU09OIE9iamVjdCB3aXRoIHRoZSBkb2N1bWVudCBmaWVsZCB3aGljaCByZXByZXNlbnRzIHRoZSBZQU1MIHN0cnVjdHVyZVxuICovXG5jb25zdCByZXNvbHZlID0gKGxpbmssIGN0eCkgPT4ge1xuICBjb25zdCBsaW5rU3BsaXR0ZWQgPSBsaW5rLnNwbGl0KCcjLycpO1xuICBjb25zdCBbZmlsZVBhdGgsIGRvY1BhdGhdID0gbGlua1NwbGl0dGVkO1xuICBsZXQgZnVsbEZpbGVOYW1lO1xuXG4gIGxldCB0YXJnZXQ7XG4gIGxldCBmRGF0YTtcbiAgaWYgKGZpbGVQYXRoKSB7XG4gICAgY29uc3QgcGF0aCA9IGN0eC5maWxlUGF0aC5zdWJzdHJpbmcoMCwgTWF0aC5tYXgoY3R4LmZpbGVQYXRoLmxhc3RJbmRleE9mKCcvJyksIGN0eC5maWxlUGF0aC5sYXN0SW5kZXhPZignXFxcXCcpKSk7XG4gICAgZnVsbEZpbGVOYW1lID0gYCR7cGF0aH0vJHtmaWxlUGF0aH1gO1xuICAgIGZEYXRhID0gZnMucmVhZEZpbGVTeW5jKGZ1bGxGaWxlTmFtZSwgJ3V0Zi04Jyk7XG4gICAgdGFyZ2V0ID0geWFtbC5zYWZlTG9hZChmRGF0YSk7XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0ID0gY3R4LmRvY3VtZW50O1xuICB9XG5cbiAgaWYgKGRvY1BhdGgpIHtcbiAgICBjb25zdCBzdGVwcyA9IGRvY1BhdGguc3BsaXQoJy8nKS5maWx0ZXIoKGVsKSA9PiBlbCAhPT0gJycpO1xuICAgIE9iamVjdC5rZXlzKHN0ZXBzKS5mb3JFYWNoKChzdGVwKSA9PiB7XG4gICAgICB0YXJnZXQgPSB0YXJnZXQgJiYgc3RlcHNbc3RlcF0gJiYgdGFyZ2V0W3N0ZXBzW3N0ZXBdXSA/IHRhcmdldFtzdGVwc1tzdGVwXV0gOiBudWxsO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBub2RlOiB0YXJnZXQsXG4gICAgdXBkYXRlZFNvdXJjZTogZmlsZVBhdGggPyBmRGF0YSA6IG51bGwsXG4gICAgZG9jUGF0aDogZG9jUGF0aCA/IGRvY1BhdGguc3BsaXQoJy8nKSA6IFtdLFxuICAgIGZpbGVQYXRoOiBmdWxsRmlsZU5hbWUgfHwgbnVsbCxcbiAgfTtcbn07XG5cbmNvbnN0IHJlc29sdmVOb2RlID0gKG5vZGUsIGN0eCkgPT4ge1xuICBpZiAoIW5vZGUgfHwgdHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSByZXR1cm4geyBub2RlLCBuZXh0UGF0aDogbnVsbCB9O1xuICBsZXQgbmV4dFBhdGg7XG4gIGxldCByZXNvbHZlZCA9IHtcbiAgICBub2RlLFxuICB9O1xuICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKChwKSA9PiB7XG4gICAgaWYgKHAgPT09ICckcmVmJykge1xuICAgICAgcmVzb2x2ZWQgPSByZXNvbHZlKG5vZGVbcF0sIGN0eCk7XG4gICAgICBuZXh0UGF0aCA9IHJlc29sdmVkLmRvY1BhdGg7XG4gICAgICBpZiAoIXJlc29sdmVkLm5vZGUpIHtcbiAgICAgICAgY3R4LnBhdGgucHVzaCgnJHJlZicpO1xuICAgICAgICBjdHgucmVzdWx0LnB1c2goY3JlYXRlRXJyb3IoJ1JlZmVybmNlIGRvZXMgbm90IGV4aXN0Jywgbm9kZSwgY3R4KSk7XG4gICAgICAgIGN0eC5wYXRoLnBvcCgpO1xuICAgICAgICByZXNvbHZlZC5ub2RlID0gbm9kZTtcbiAgICAgICAgbmV4dFBhdGggPSBjdHgucGF0aDtcbiAgICAgICAgcmVzb2x2ZWQudXBkYXRlZFNvdXJjZSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBub2RlOiByZXNvbHZlZC5ub2RlLFxuICAgIG5leHRQYXRoLFxuICAgIHVwZGF0ZWRTb3VyY2U6IHJlc29sdmVkLnVwZGF0ZWRTb3VyY2UsXG4gICAgZmlsZVBhdGg6IHJlc29sdmVkLmZpbGVQYXRoLFxuICB9O1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVzb2x2ZU5vZGU7XG4iXX0=