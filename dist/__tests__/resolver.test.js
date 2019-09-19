"use strict";

var _resolver = _interopRequireDefault(require("../resolver"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

test('Resolve a node without a $ref', () => {
  const document = {
    components: {
      schemas: {
        user: {
          properties: ['name', 'email']
        }
      }
    }
  };
  const context = {
    document
  };
  const node = {
    property: 'value'
  };
  expect((0, _resolver.default)(node, context)).toMatchInlineSnapshot(`
    Object {
      "nextPath": undefined,
      "node": Object {
        "property": "value",
      },
    }
  `);
});
test('Resolve a node with a one $ref', () => {
  const document = {
    components: {
      schemas: {
        user: {
          properties: ['name', 'email']
        }
      }
    }
  };
  const context = {
    document
  };
  const node = {
    $ref: '#/components/schemas/user'
  };
  expect((0, _resolver.default)(node, context)).toMatchInlineSnapshot(`
    Object {
      "nextPath": "#/components/schemas/user",
      "node": Object {
        "properties": Array [
          "name",
          "email",
        ],
      },
    }
  `);
});
test('Resolve node with $ref and content', () => {
  const document = {
    components: {
      schemas: {
        user: {
          properties: ['name', 'email']
        }
      }
    }
  };
  const context = {
    document
  };
  const node = {
    $ref: '#/components/schemas/user',
    properties: ['thisShouldNotPersist']
  };
  expect((0, _resolver.default)(node, context)).toMatchInlineSnapshot(`
    Object {
      "nextPath": "#/components/schemas/user",
      "node": Object {
        "properties": Array [
          "name",
          "email",
        ],
      },
    }
  `);
}); // test('Resolve address', () => {
//   const document = {
//     components: {
//       schemas: {
//         user: {
//           properties: ['name', 'email'],
//         },
//       },
//     },
//   };
//   expect(resolve('#/components/schemas/user', { document }))
//     .toMatchInlineSnapshot(`
//     Object {
//       "properties": Array [
//         "name",
//         "email",
//       ],
//     }
//   `);
// });
// test('Resolve address which does not exists', () => {
//   const document = {
//     components: {
//       schemas: {
//         user: {
//           properties: ['name', 'email'],
//         },
//       },
//     },
//   };
//   expect(
//     resolve('#/components/schemas/anotherUser', { document }),
//   ).toMatchInlineSnapshot('null');
// });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9fX3Rlc3RzX18vcmVzb2x2ZXIudGVzdC5qcyJdLCJuYW1lcyI6WyJ0ZXN0IiwiZG9jdW1lbnQiLCJjb21wb25lbnRzIiwic2NoZW1hcyIsInVzZXIiLCJwcm9wZXJ0aWVzIiwiY29udGV4dCIsIm5vZGUiLCJwcm9wZXJ0eSIsImV4cGVjdCIsInRvTWF0Y2hJbmxpbmVTbmFwc2hvdCIsIiRyZWYiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7QUFFQUEsSUFBSSxDQUFDLCtCQUFELEVBQWtDLE1BQU07QUFDMUMsUUFBTUMsUUFBUSxHQUFHO0FBQ2ZDLElBQUFBLFVBQVUsRUFBRTtBQUNWQyxNQUFBQSxPQUFPLEVBQUU7QUFDUEMsUUFBQUEsSUFBSSxFQUFFO0FBQ0pDLFVBQUFBLFVBQVUsRUFBRSxDQUFDLE1BQUQsRUFBUyxPQUFUO0FBRFI7QUFEQztBQURDO0FBREcsR0FBakI7QUFTQSxRQUFNQyxPQUFPLEdBQUc7QUFBRUwsSUFBQUE7QUFBRixHQUFoQjtBQUNBLFFBQU1NLElBQUksR0FBRztBQUNYQyxJQUFBQSxRQUFRLEVBQUU7QUFEQyxHQUFiO0FBR0FDLEVBQUFBLE1BQU0sQ0FBQyx1QkFBWUYsSUFBWixFQUFrQkQsT0FBbEIsQ0FBRCxDQUFOLENBQW1DSSxxQkFBbkMsQ0FBMEQ7Ozs7Ozs7R0FBMUQ7QUFRRCxDQXRCRyxDQUFKO0FBd0JBVixJQUFJLENBQUMsZ0NBQUQsRUFBbUMsTUFBTTtBQUMzQyxRQUFNQyxRQUFRLEdBQUc7QUFDZkMsSUFBQUEsVUFBVSxFQUFFO0FBQ1ZDLE1BQUFBLE9BQU8sRUFBRTtBQUNQQyxRQUFBQSxJQUFJLEVBQUU7QUFDSkMsVUFBQUEsVUFBVSxFQUFFLENBQUMsTUFBRCxFQUFTLE9BQVQ7QUFEUjtBQURDO0FBREM7QUFERyxHQUFqQjtBQVNBLFFBQU1DLE9BQU8sR0FBRztBQUFFTCxJQUFBQTtBQUFGLEdBQWhCO0FBQ0EsUUFBTU0sSUFBSSxHQUFHO0FBQ1hJLElBQUFBLElBQUksRUFBRTtBQURLLEdBQWI7QUFHQUYsRUFBQUEsTUFBTSxDQUFDLHVCQUFZRixJQUFaLEVBQWtCRCxPQUFsQixDQUFELENBQU4sQ0FBbUNJLHFCQUFuQyxDQUEwRDs7Ozs7Ozs7OztHQUExRDtBQVdELENBekJHLENBQUo7QUEyQkFWLElBQUksQ0FBQyxvQ0FBRCxFQUF1QyxNQUFNO0FBQy9DLFFBQU1DLFFBQVEsR0FBRztBQUNmQyxJQUFBQSxVQUFVLEVBQUU7QUFDVkMsTUFBQUEsT0FBTyxFQUFFO0FBQ1BDLFFBQUFBLElBQUksRUFBRTtBQUNKQyxVQUFBQSxVQUFVLEVBQUUsQ0FBQyxNQUFELEVBQVMsT0FBVDtBQURSO0FBREM7QUFEQztBQURHLEdBQWpCO0FBU0EsUUFBTUMsT0FBTyxHQUFHO0FBQUVMLElBQUFBO0FBQUYsR0FBaEI7QUFDQSxRQUFNTSxJQUFJLEdBQUc7QUFDWEksSUFBQUEsSUFBSSxFQUFFLDJCQURLO0FBRVhOLElBQUFBLFVBQVUsRUFBRSxDQUFDLHNCQUFEO0FBRkQsR0FBYjtBQUlBSSxFQUFBQSxNQUFNLENBQUMsdUJBQVlGLElBQVosRUFBa0JELE9BQWxCLENBQUQsQ0FBTixDQUFtQ0kscUJBQW5DLENBQTBEOzs7Ozs7Ozs7O0dBQTFEO0FBV0QsQ0ExQkcsQ0FBSixDLENBNEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHJlc29sdmVOb2RlIGZyb20gJy4uL3Jlc29sdmVyJztcblxudGVzdCgnUmVzb2x2ZSBhIG5vZGUgd2l0aG91dCBhICRyZWYnLCAoKSA9PiB7XG4gIGNvbnN0IGRvY3VtZW50ID0ge1xuICAgIGNvbXBvbmVudHM6IHtcbiAgICAgIHNjaGVtYXM6IHtcbiAgICAgICAgdXNlcjoge1xuICAgICAgICAgIHByb3BlcnRpZXM6IFsnbmFtZScsICdlbWFpbCddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuICBjb25zdCBjb250ZXh0ID0geyBkb2N1bWVudCB9O1xuICBjb25zdCBub2RlID0ge1xuICAgIHByb3BlcnR5OiAndmFsdWUnLFxuICB9O1xuICBleHBlY3QocmVzb2x2ZU5vZGUobm9kZSwgY29udGV4dCkpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgT2JqZWN0IHtcbiAgICAgIFwibmV4dFBhdGhcIjogdW5kZWZpbmVkLFxuICAgICAgXCJub2RlXCI6IE9iamVjdCB7XG4gICAgICAgIFwicHJvcGVydHlcIjogXCJ2YWx1ZVwiLFxuICAgICAgfSxcbiAgICB9XG4gIGApO1xufSk7XG5cbnRlc3QoJ1Jlc29sdmUgYSBub2RlIHdpdGggYSBvbmUgJHJlZicsICgpID0+IHtcbiAgY29uc3QgZG9jdW1lbnQgPSB7XG4gICAgY29tcG9uZW50czoge1xuICAgICAgc2NoZW1hczoge1xuICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgcHJvcGVydGllczogWyduYW1lJywgJ2VtYWlsJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG4gIGNvbnN0IGNvbnRleHQgPSB7IGRvY3VtZW50IH07XG4gIGNvbnN0IG5vZGUgPSB7XG4gICAgJHJlZjogJyMvY29tcG9uZW50cy9zY2hlbWFzL3VzZXInLFxuICB9O1xuICBleHBlY3QocmVzb2x2ZU5vZGUobm9kZSwgY29udGV4dCkpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgT2JqZWN0IHtcbiAgICAgIFwibmV4dFBhdGhcIjogXCIjL2NvbXBvbmVudHMvc2NoZW1hcy91c2VyXCIsXG4gICAgICBcIm5vZGVcIjogT2JqZWN0IHtcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IEFycmF5IFtcbiAgICAgICAgICBcIm5hbWVcIixcbiAgICAgICAgICBcImVtYWlsXCIsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH1cbiAgYCk7XG59KTtcblxudGVzdCgnUmVzb2x2ZSBub2RlIHdpdGggJHJlZiBhbmQgY29udGVudCcsICgpID0+IHtcbiAgY29uc3QgZG9jdW1lbnQgPSB7XG4gICAgY29tcG9uZW50czoge1xuICAgICAgc2NoZW1hczoge1xuICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgcHJvcGVydGllczogWyduYW1lJywgJ2VtYWlsJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG4gIGNvbnN0IGNvbnRleHQgPSB7IGRvY3VtZW50IH07XG4gIGNvbnN0IG5vZGUgPSB7XG4gICAgJHJlZjogJyMvY29tcG9uZW50cy9zY2hlbWFzL3VzZXInLFxuICAgIHByb3BlcnRpZXM6IFsndGhpc1Nob3VsZE5vdFBlcnNpc3QnXSxcbiAgfTtcbiAgZXhwZWN0KHJlc29sdmVOb2RlKG5vZGUsIGNvbnRleHQpKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgIE9iamVjdCB7XG4gICAgICBcIm5leHRQYXRoXCI6IFwiIy9jb21wb25lbnRzL3NjaGVtYXMvdXNlclwiLFxuICAgICAgXCJub2RlXCI6IE9iamVjdCB7XG4gICAgICAgIFwicHJvcGVydGllc1wiOiBBcnJheSBbXG4gICAgICAgICAgXCJuYW1lXCIsXG4gICAgICAgICAgXCJlbWFpbFwiLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9XG4gIGApO1xufSk7XG5cbi8vIHRlc3QoJ1Jlc29sdmUgYWRkcmVzcycsICgpID0+IHtcbi8vICAgY29uc3QgZG9jdW1lbnQgPSB7XG4vLyAgICAgY29tcG9uZW50czoge1xuLy8gICAgICAgc2NoZW1hczoge1xuLy8gICAgICAgICB1c2VyOiB7XG4vLyAgICAgICAgICAgcHJvcGVydGllczogWyduYW1lJywgJ2VtYWlsJ10sXG4vLyAgICAgICAgIH0sXG4vLyAgICAgICB9LFxuLy8gICAgIH0sXG4vLyAgIH07XG4vLyAgIGV4cGVjdChyZXNvbHZlKCcjL2NvbXBvbmVudHMvc2NoZW1hcy91c2VyJywgeyBkb2N1bWVudCB9KSlcbi8vICAgICAudG9NYXRjaElubGluZVNuYXBzaG90KGBcbi8vICAgICBPYmplY3Qge1xuLy8gICAgICAgXCJwcm9wZXJ0aWVzXCI6IEFycmF5IFtcbi8vICAgICAgICAgXCJuYW1lXCIsXG4vLyAgICAgICAgIFwiZW1haWxcIixcbi8vICAgICAgIF0sXG4vLyAgICAgfVxuLy8gICBgKTtcbi8vIH0pO1xuXG4vLyB0ZXN0KCdSZXNvbHZlIGFkZHJlc3Mgd2hpY2ggZG9lcyBub3QgZXhpc3RzJywgKCkgPT4ge1xuLy8gICBjb25zdCBkb2N1bWVudCA9IHtcbi8vICAgICBjb21wb25lbnRzOiB7XG4vLyAgICAgICBzY2hlbWFzOiB7XG4vLyAgICAgICAgIHVzZXI6IHtcbi8vICAgICAgICAgICBwcm9wZXJ0aWVzOiBbJ25hbWUnLCAnZW1haWwnXSxcbi8vICAgICAgICAgfSxcbi8vICAgICAgIH0sXG4vLyAgICAgfSxcbi8vICAgfTtcbi8vICAgZXhwZWN0KFxuLy8gICAgIHJlc29sdmUoJyMvY29tcG9uZW50cy9zY2hlbWFzL2Fub3RoZXJVc2VyJywgeyBkb2N1bWVudCB9KSxcbi8vICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoJ251bGwnKTtcbi8vIH0pO1xuIl19