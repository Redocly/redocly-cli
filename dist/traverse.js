"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.traverseNode = void 0;

var _resolver = _interopRequireDefault(require("./resolver"));

var _error = require("./error");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const validateNode = (node, definition, ctx) => {
  if (node && definition && definition.validators) {
    const allowedChildren = [...Object.keys(definition.properties || {}), ...Object.keys(definition.validators || {})];
    Object.keys(node).forEach(field => {
      ctx.path.push(field);

      if (!allowedChildren.includes(field) && field.indexOf('x-') !== 0 && field.indexOf('$ref') !== 0) {
        ctx.result.push((0, _error.createErrorFieldNotAllowed)(field, node, ctx));
      }

      ctx.path.pop();
    });
    Object.keys(definition.validators).forEach(v => {
      if (Object.keys(node).includes(v)) ctx.path.push(v);
      const validationResult = definition.validators[v]()(node, ctx);
      if (Object.keys(node).includes(v)) ctx.path.pop();
      if (validationResult) ctx.result.push(validationResult);
    });
  }
};

const traverseNode = (node, definition, ctx) => {
  const currentPath = ctx.path.join('/'); // TO-DO: refactor ctx.visited into dictionary for O(1) check time

  if (ctx.visited.includes(currentPath)) return;
  ctx.visited.push(currentPath); // console.log('+++++++++++++');
  // console.log(`Current path: ${currentPath}`);
  // console.log(node);
  // console.log(definition);
  // console.log('***************');

  if (!node || !definition) return;
  let nextPath;
  let prevPath;
  let resolvedNode;
  let updatedSource;
  let prevSource;
  let filePath;
  let prevFilePath;
  ({
    // eslint-disable-next-line prefer-const
    node: resolvedNode,
    nextPath,
    updatedSource,
    filePath
  } = (0, _resolver.default)(node, ctx));

  if (nextPath) {
    ctx.pathStack.push(ctx.path);
    prevPath = ctx.path;
    ctx.path = nextPath;
  }

  if (updatedSource) {
    ctx.AST = null;
    prevFilePath = ctx.filePath;
    ctx.filePath = filePath;
    prevSource = ctx.source;
    ctx.source = updatedSource;
  }

  if (Array.isArray(resolvedNode)) {
    resolvedNode.forEach((nodeChild, i) => {
      ctx.path.push(i);
      traverseNode(nodeChild, definition, ctx);
      ctx.path.pop();
    });
    if (nextPath) ctx.path = prevPath;
    return;
  }

  validateNode(resolvedNode, definition, ctx);

  if (definition.properties) {
    let nodeChildren;

    switch (typeof definition.properties) {
      case 'function':
        nodeChildren = definition.properties(resolvedNode);
        Object.keys(nodeChildren).forEach(child => {
          if (Object.keys(resolvedNode).includes(child)) {
            ctx.path.push(child);
            if (resolvedNode[child]) traverseNode(resolvedNode[child], nodeChildren[child], ctx);
            ctx.path.pop();
          }
        });
        break;

      case 'object':
        Object.keys(definition.properties).forEach(p => {
          ctx.path.push(p);

          if (typeof definition.properties[p] === 'function') {
            if (resolvedNode[p]) traverseNode(resolvedNode[p], definition.properties[p](), ctx);
          } else if (resolvedNode[p]) {
            traverseNode(resolvedNode[p], definition.properties[p], ctx);
          }

          ctx.path.pop();
        });
        break;

      default: // do nothing

    }
  }

  if (nextPath) {
    ctx.path = ctx.pathStack.pop();
  }

  if (updatedSource) {
    ctx.AST = null;
    ctx.source = prevSource;
    ctx.filePath = prevFilePath;
  }
};

exports.traverseNode = traverseNode;

const traverse = (node, definition, sourceFile, filePath = '') => {
  const ctx = {
    document: node,
    filePath,
    path: [],
    visited: [],
    result: [],
    pathStack: [],
    source: sourceFile,
    enableCodeframe: true
  };
  traverseNode(node, definition, ctx);
  return ctx.result;
};

var _default = traverse;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy90cmF2ZXJzZS5qcyJdLCJuYW1lcyI6WyJ2YWxpZGF0ZU5vZGUiLCJub2RlIiwiZGVmaW5pdGlvbiIsImN0eCIsInZhbGlkYXRvcnMiLCJhbGxvd2VkQ2hpbGRyZW4iLCJPYmplY3QiLCJrZXlzIiwicHJvcGVydGllcyIsImZvckVhY2giLCJmaWVsZCIsInBhdGgiLCJwdXNoIiwiaW5jbHVkZXMiLCJpbmRleE9mIiwicmVzdWx0IiwicG9wIiwidiIsInZhbGlkYXRpb25SZXN1bHQiLCJ0cmF2ZXJzZU5vZGUiLCJjdXJyZW50UGF0aCIsImpvaW4iLCJ2aXNpdGVkIiwibmV4dFBhdGgiLCJwcmV2UGF0aCIsInJlc29sdmVkTm9kZSIsInVwZGF0ZWRTb3VyY2UiLCJwcmV2U291cmNlIiwiZmlsZVBhdGgiLCJwcmV2RmlsZVBhdGgiLCJwYXRoU3RhY2siLCJBU1QiLCJzb3VyY2UiLCJBcnJheSIsImlzQXJyYXkiLCJub2RlQ2hpbGQiLCJpIiwibm9kZUNoaWxkcmVuIiwiY2hpbGQiLCJwIiwidHJhdmVyc2UiLCJzb3VyY2VGaWxlIiwiZG9jdW1lbnQiLCJlbmFibGVDb2RlZnJhbWUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7OztBQUVBLE1BQU1BLFlBQVksR0FBRyxDQUFDQyxJQUFELEVBQU9DLFVBQVAsRUFBbUJDLEdBQW5CLEtBQTJCO0FBQzlDLE1BQUlGLElBQUksSUFBSUMsVUFBUixJQUFzQkEsVUFBVSxDQUFDRSxVQUFyQyxFQUFpRDtBQUMvQyxVQUFNQyxlQUFlLEdBQUcsQ0FDdEIsR0FBSUMsTUFBTSxDQUFDQyxJQUFQLENBQVlMLFVBQVUsQ0FBQ00sVUFBWCxJQUF5QixFQUFyQyxDQURrQixFQUV0QixHQUFJRixNQUFNLENBQUNDLElBQVAsQ0FBWUwsVUFBVSxDQUFDRSxVQUFYLElBQXlCLEVBQXJDLENBRmtCLENBQXhCO0FBS0FFLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZTixJQUFaLEVBQWtCUSxPQUFsQixDQUEy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QUNBeEIsSUFBQUEsR0FBRyxDQUFDeUIsUUFBSixHQUFlQyxZQUFmO0FBQ0Q7QUFDRixDQTVGTTs7OztBQThGUCxNQUFNVyxRQUFRLEdBQUcsQ0FBQ3ZDLElBQUQsRUFBT0MsVUFBUCxFQUFtQnVDLFVBQW5CLEVBQStCYixRQUFRLEdBQUcsRUFBMUMsS0FBaUQ7QUFDaEUsUUFBTXpCLEdBQUcsR0FBRztBQUNWdUMsSUFBQUEsUUFBUSxFQUFFekMsSUFEQTtBQUVWMkIsSUFBQUEsUUFGVTtBQUdWakIsSUFBQUEsSUFBSSxFQUFFLEVBSEk7QUFJVlcsSUFBQUEsT0FBTyxFQUFFLEVBSkM7QUFLVlAsSUFBQUEsTUFBTSxFQUFFLEVBTEU7QUFNVmUsSUFBQUEsU0FBUyxFQUFFLEVBTkQ7QUFPVkUsSUFBQUEsTUFBTSxFQUFFUyxVQVBFO0FBUVZFLElBQUFBLGVBQWUsRUFBRTtBQVJQLEdBQVo7QUFVQXhCLEVBQUFBLFlBQVksQ0FBQ2xCLElBQUQsRUFBT0MsVUFBUCxFQUFtQkMsR0FBbkIsQ0FBWjtBQUNBLFNBQU9BLEdBQUcsQ0FBQ1ksTUFBWDtBQUNELENBYkQ7O2VBZWV5QixRIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHJlc29sdmVOb2RlIGZyb20gJy4vcmVzb2x2ZXInO1xuaW1wb3J0IHsgY3JlYXRlRXJyb3JGaWVsZE5vdEFsbG93ZWQgfSBmcm9tICcuL2Vycm9yJztcblxuY29uc3QgdmFsaWRhdGVOb2RlID0gKG5vZGUsIGRlZmluaXRpb24sIGN0eCkgPT4ge1xuICBpZiAobm9kZSAmJiBkZWZpbml0aW9uICYmIGRlZmluaXRpb24udmFsaWRhdG9ycykge1xuICAgIGNvbnN0IGFsbG93ZWRDaGlsZHJlbiA9IFtcbiAgICAgIC4uLihPYmplY3Qua2V5cyhkZWZpbml0aW9uLnByb3BlcnRpZXMgfHwge30pKSxcbiAgICAgIC4uLihPYmplY3Qua2V5cyhkZWZpbml0aW9uLnZhbGlkYXRvcnMgfHwge30pKSxcbiAgICBdO1xuXG4gICAgT2JqZWN0LmtleXMobm9kZSkuZm9yRWFjaCgoZmllbGQpID0+IHtcbiAgICAgIGN0eC5wYXRoLnB1c2goZmllbGQpO1xuXG4gICAgICBpZiAoIWFsbG93ZWRDaGlsZHJlbi5pbmNsdWRlcyhmaWVsZCkgJiYgZmllbGQuaW5kZXhPZigneC0nKSAhPT0gMCAmJiBmaWVsZC5pbmRleE9mKCckcmVmJykgIT09IDApIHtcbiAgICAgICAgY3R4LnJlc3VsdC5wdXNoKGNyZWF0ZUVycm9yRmllbGROb3RBbGxvd2VkKGZpZWxkLCBub2RlLCBjdHgpKTtcbiAgICAgIH1cblxuICAgICAgY3R4LnBhdGgucG9wKCk7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyhkZWZpbml0aW9uLnZhbGlkYXRvcnMpLmZvckVhY2goKHYpID0+IHtcbiAgICAgIGlmIChPYmplY3Qua2V5cyhub2RlKS5pbmNsdWRlcyh2KSkgY3R4LnBhdGgucHVzaCh2KTtcbiAgICAgIGNvbnN0IHZhbGlkYXRpb25SZXN1bHQgPSBkZWZpbml0aW9uLnZhbGlkYXRvcnNbdl0oKShub2RlLCBjdHgpO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKG5vZGUpLmluY2x1ZGVzKHYpKSBjdHgucGF0aC5wb3AoKTtcbiAgICAgIGlmICh2YWxpZGF0aW9uUmVzdWx0KSBjdHgucmVzdWx0LnB1c2godmFsaWRhdGlvblJlc3VsdCk7XG4gICAgfSk7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCB0cmF2ZXJzZU5vZGUgPSAobm9kZSwgZGVmaW5pdGlvbiwgY3R4KSA9PiB7XG4gIGNvbnN0IGN1cnJlbnRQYXRoID0gY3R4LnBhdGguam9pbignLycpO1xuXG4gIC8vIFRPLURPOiByZWZhY3RvciBjdHgudmlzaXRlZCBpbnRvIGRpY3Rpb25hcnkgZm9yIE8oMSkgY2hlY2sgdGltZVxuICBpZiAoY3R4LnZpc2l0ZWQuaW5jbHVkZXMoY3VycmVudFBhdGgpKSByZXR1cm47XG4gIGN0eC52aXNpdGVkLnB1c2goY3VycmVudFBhdGgpO1xuXG4gIC8vIGNvbnNvbGUubG9nKCcrKysrKysrKysrKysrJyk7XG4gIC8vIGNvbnNvbGUubG9nKGBDdXJyZW50IHBhdGg6ICR7Y3VycmVudFBhdGh9YCk7XG4gIC8vIGNvbnNvbGUubG9nKG5vZGUpO1xuICAvLyBjb25zb2xlLmxvZyhkZWZpbml0aW9uKTtcbiAgLy8gY29uc29sZS5sb2coJyoqKioqKioqKioqKioqKicpO1xuXG4gIGlmICghbm9kZSB8fCAhZGVmaW5pdGlvbikgcmV0dXJuO1xuXG4gIGxldCBuZXh0UGF0aDtcbiAgbGV0IHByZXZQYXRoO1xuICBsZXQgcmVzb2x2ZWROb2RlO1xuICBsZXQgdXBkYXRlZFNvdXJjZTtcbiAgbGV0IHByZXZTb3VyY2U7XG4gIGxldCBmaWxlUGF0aDtcbiAgbGV0IHByZXZGaWxlUGF0aDtcbiAgKHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcHJlZmVyLWNvbnN0XG4gICAgbm9kZTogcmVzb2x2ZWROb2RlLCBuZXh0UGF0aCwgdXBkYXRlZFNvdXJjZSwgZmlsZVBhdGgsXG4gIH0gPSByZXNvbHZlTm9kZShub2RlLCBjdHgpKTtcblxuICBpZiAobmV4dFBhdGgpIHtcbiAgICBjdHgucGF0aFN0YWNrLnB1c2goY3R4LnBhdGgpO1xuICAgIHByZXZQYXRoID0gY3R4LnBhdGg7XG4gICAgY3R4LnBhdGggPSBuZXh0UGF0aDtcbiAgfVxuXG4gIGlmICh1cGRhdGVkU291cmNlKSB7XG4gICAgY3R4LkFTVCA9IG51bGw7XG4gICAgcHJldkZpbGVQYXRoID0gY3R4LmZpbGVQYXRoO1xuICAgIGN0eC5maWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgIHByZXZTb3VyY2UgPSBjdHguc291cmNlO1xuICAgIGN0eC5zb3VyY2UgPSB1cGRhdGVkU291cmNlO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkocmVzb2x2ZWROb2RlKSkge1xuICAgIHJlc29sdmVkTm9kZS5mb3JFYWNoKChub2RlQ2hpbGQsIGkpID0+IHtcbiAgICAgIGN0eC5wYXRoLnB1c2goaSk7XG4gICAgICB0cmF2ZXJzZU5vZGUobm9kZUNoaWxkLCBkZWZpbml0aW9uLCBjdHgpO1xuICAgICAgY3R4LnBhdGgucG9wKCk7XG4gICAgfSk7XG4gICAgaWYgKG5leHRQYXRoKSBjdHgucGF0aCA9IHByZXZQYXRoO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhbGlkYXRlTm9kZShyZXNvbHZlZE5vZGUsIGRlZmluaXRpb24sIGN0eCk7XG5cbiAgaWYgKGRlZmluaXRpb24ucHJvcGVydGllcykge1xuICAgIGxldCBub2RlQ2hpbGRyZW47XG4gICAgc3dpdGNoICh0eXBlb2YgZGVmaW5pdGlvbi5wcm9wZXJ0aWVzKSB7XG4gICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgIG5vZGVDaGlsZHJlbiA9IGRlZmluaXRpb24ucHJvcGVydGllcyhyZXNvbHZlZE5vZGUpO1xuICAgICAgICBPYmplY3Qua2V5cyhub2RlQ2hpbGRyZW4pLmZvckVhY2goKGNoaWxkKSA9PiB7XG4gICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHJlc29sdmVkTm9kZSkuaW5jbHVkZXMoY2hpbGQpKSB7XG4gICAgICAgICAgICBjdHgucGF0aC5wdXNoKGNoaWxkKTtcbiAgICAgICAgICAgIGlmIChyZXNvbHZlZE5vZGVbY2hpbGRdKSB0cmF2ZXJzZU5vZGUocmVzb2x2ZWROb2RlW2NoaWxkXSwgbm9kZUNoaWxkcmVuW2NoaWxkXSwgY3R4KTtcbiAgICAgICAgICAgIGN0eC5wYXRoLnBvcCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICBPYmplY3Qua2V5cyhkZWZpbml0aW9uLnByb3BlcnRpZXMpLmZvckVhY2goKHApID0+IHtcbiAgICAgICAgICBjdHgucGF0aC5wdXNoKHApO1xuICAgICAgICAgIGlmICh0eXBlb2YgZGVmaW5pdGlvbi5wcm9wZXJ0aWVzW3BdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBpZiAocmVzb2x2ZWROb2RlW3BdKSB0cmF2ZXJzZU5vZGUocmVzb2x2ZWROb2RlW3BdLCBkZWZpbml0aW9uLnByb3BlcnRpZXNbcF0oKSwgY3R4KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHJlc29sdmVkTm9kZVtwXSkge1xuICAgICAgICAgICAgdHJhdmVyc2VOb2RlKHJlc29sdmVkTm9kZVtwXSwgZGVmaW5pdGlvbi5wcm9wZXJ0aWVzW3BdLCBjdHgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdHgucGF0aC5wb3AoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgfVxuICB9XG5cbiAgaWYgKG5leHRQYXRoKSB7XG4gICAgY3R4LnBhdGggPSBjdHgucGF0aFN0YWNrLnBvcCgpO1xuICB9XG4gIGlmICh1cGRhdGVkU291cmNlKSB7XG4gICAgY3R4LkFTVCA9IG51bGw7XG4gICAgY3R4LnNvdXJjZSA9IHByZXZTb3VyY2U7XG4gICAgY3R4LmZpbGVQYXRoID0gcHJldkZpbGVQYXRoO1xuICB9XG59O1xuXG5jb25zdCB0cmF2ZXJzZSA9IChub2RlLCBkZWZpbml0aW9uLCBzb3VyY2VGaWxlLCBmaWxlUGF0aCA9ICcnKSA9PiB7XG4gIGNvbnN0IGN0eCA9IHtcbiAgICBkb2N1bWVudDogbm9kZSxcbiAgICBmaWxlUGF0aCxcbiAgICBwYXRoOiBbXSxcbiAgICB2aXNpdGVkOiBbXSxcbiAgICByZXN1bHQ6IFtdLFxuICAgIHBhdGhTdGFjazogW10sXG4gICAgc291cmNlOiBzb3VyY2VGaWxlLFxuICAgIGVuYWJsZUNvZGVmcmFtZTogdHJ1ZSxcbiAgfTtcbiAgdHJhdmVyc2VOb2RlKG5vZGUsIGRlZmluaXRpb24sIGN0eCk7XG4gIHJldHVybiBjdHgucmVzdWx0O1xufTtcblxuZXhwb3J0IGRlZmF1bHQgdHJhdmVyc2U7XG4iXX0=