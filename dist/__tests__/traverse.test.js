"use strict";

var _traverse = _interopRequireDefault(require("../traverse"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

test('Traverse over a flat node with empty resolver', () => {
  const node = {
    name: 'test node',
    value: 12
  };
  const resolver = {};
  expect((0, _traverse.default)(node, resolver)).toMatchInlineSnapshot('Array []');
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9fX3Rlc3RzX18vdHJhdmVyc2UudGVzdC5qcyJdLCJuYW1lcyI6WyJ0ZXN0Iiwibm9kZSIsIm5hbWUiLCJ2YWx1ZSIsInJlc29sdmVyIiwiZXhwZWN0IiwidG9NYXRjaElubGluZVNuYXBzaG90Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7O0FBRUFBLElBQUksQ0FBQywrQ0FBRCxFQUFrRCxNQUFNO0FBQzFELFFBQU1DLElBQUksR0FBRztBQUNYQyxJQUFBQSxJQUFJLEVBQUUsV0FESztBQUVYQyxJQUFBQSxLQUFLLEVBQUU7QUFGSSxHQUFiO0FBSUEsUUFBTUMsUUFBUSxHQUFHLEVBQWpCO0FBQ0FDLEVBQUFBLE1BQU0sQ0FBQyx1QkFBU0osSUFBVCxFQUFlRyxRQUFmLENBQUQsQ0FBTixDQUFpQ0UscUJBQWpDLENBQXVELFVBQXZEO0FBQ0QsQ0FQRyxDQUFKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHRyYXZlcnNlIGZyb20gJy4uL3RyYXZlcnNlJztcblxudGVzdCgnVHJhdmVyc2Ugb3ZlciBhIGZsYXQgbm9kZSB3aXRoIGVtcHR5IHJlc29sdmVyJywgKCkgPT4ge1xuICBjb25zdCBub2RlID0ge1xuICAgIG5hbWU6ICd0ZXN0IG5vZGUnLFxuICAgIHZhbHVlOiAxMixcbiAgfTtcbiAgY29uc3QgcmVzb2x2ZXIgPSB7fTtcbiAgZXhwZWN0KHRyYXZlcnNlKG5vZGUsIHJlc29sdmVyKSkudG9NYXRjaElubGluZVNuYXBzaG90KCdBcnJheSBbXScpO1xufSk7XG4iXX0=