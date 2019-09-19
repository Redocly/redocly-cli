"use strict";

var _error = _interopRequireDefault(require("../error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

test('Error message format', () => {
  expect((0, _error.default)('You error text goes here', {
    example: 'node'
  }, {
    path: ['paths', 'user', '200', 'responses'],
    pathStack: []
  })).toMatchInlineSnapshot(`
    Object {
      "message": "You error text goes here",
      "path": "/paths/user/200/responses",
      "pathStack": Array [],
      "severity": "ERROR",
      "value": Object {
        "example": "node",
      },
    }
  `);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9fX3Rlc3RzX18vZXJyb3IudGVzdC5qcyJdLCJuYW1lcyI6WyJ0ZXN0IiwiZXhwZWN0IiwiZXhhbXBsZSIsInBhdGgiLCJwYXRoU3RhY2siLCJ0b01hdGNoSW5saW5lU25hcHNob3QiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7QUFFQUEsSUFBSSxDQUFDLHNCQUFELEVBQXlCLE1BQU07QUFDakNDLEVBQUFBLE1BQU0sQ0FDSixvQkFDRSwwQkFERixFQUVFO0FBQUVDLElBQUFBLE9BQU8sRUFBRTtBQUFYLEdBRkYsRUFHRTtBQUNFQyxJQUFBQSxJQUFJLEVBQUUsQ0FBQyxPQUFELEVBQVUsTUFBVixFQUFrQixLQUFsQixFQUF5QixXQUF6QixDQURSO0FBRUVDLElBQUFBLFNBQVMsRUFBRTtBQUZiLEdBSEYsQ0FESSxDQUFOLENBU0VDLHFCQVRGLENBU3lCOzs7Ozs7Ozs7O0dBVHpCO0FBb0JELENBckJHLENBQUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSAnLi4vZXJyb3InO1xuXG50ZXN0KCdFcnJvciBtZXNzYWdlIGZvcm1hdCcsICgpID0+IHtcbiAgZXhwZWN0KFxuICAgIGNyZWF0ZUVycm9yKFxuICAgICAgJ1lvdSBlcnJvciB0ZXh0IGdvZXMgaGVyZScsXG4gICAgICB7IGV4YW1wbGU6ICdub2RlJyB9LFxuICAgICAge1xuICAgICAgICBwYXRoOiBbJ3BhdGhzJywgJ3VzZXInLCAnMjAwJywgJ3Jlc3BvbnNlcyddLFxuICAgICAgICBwYXRoU3RhY2s6IFtdLFxuICAgICAgfSxcbiAgICApLFxuICApLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgT2JqZWN0IHtcbiAgICAgIFwibWVzc2FnZVwiOiBcIllvdSBlcnJvciB0ZXh0IGdvZXMgaGVyZVwiLFxuICAgICAgXCJwYXRoXCI6IFwiL3BhdGhzL3VzZXIvMjAwL3Jlc3BvbnNlc1wiLFxuICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgXCJleGFtcGxlXCI6IFwibm9kZVwiLFxuICAgICAgfSxcbiAgICB9XG4gIGApO1xufSk7XG4iXX0=