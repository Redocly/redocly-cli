# Checks the generated Python SDK in `models: pydantic` mode. Run by python/client.test.ts with:
#   python3 pydantic_models.py <folder-with-generated-client.py>
import sys

import pydantic

sys.path.insert(0, sys.argv[1])
import client

# One round trip proves the three pieces of this mode: the alias, the runtime
# dispatch to pydantic, and `by_alias` on the way out.
wire = {"customerName": "Sam", "orderItems": [], "id": "ord_1", "totalPrice": 900}
order = client.decode(client.Order, wire)
assert type(order).__name__ == "Order", type(order)
# The wire name arrives on the aliased field, and leaves on the alias again.
assert order.customer_name == "Sam", order
assert order.total_price == 900, order
assert client.encode(order) == wire, client.encode(order)

# A required field missing must fail loudly: that is what this mode buys.
try:
    client.decode(client.Order, {"id": "ord_1"})
    raise AssertionError("expected a validation error")
except pydantic.ValidationError:
    pass

# Pydantic resolves a nested union itself, so the discriminator has to reach the
# annotation: `MenuItem` lives inside `MenuItemList.items`, never at the top level.
item = {
    "category": "dessert",
    "calories": 400,
    "id": "mi_1",
    "name": "Cake",
    "price": 500,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z",
    "object": "menuItem",
}
page = {
    "limit": 1,
    "endCursor": "c",
    "startCursor": "c",
    "hasNextPage": False,
    "hasPrevPage": False,
    "total": 1,
}
listed = client.decode(client.MenuItemList, {"object": "list", "page": page, "items": [item]})
assert type(listed.items[0]).__name__ == "Dessert", type(listed.items[0])
# The top level goes through the same annotation.
assert type(client.decode(client.MenuItem, item)).__name__ == "Dessert"
assert client.encode(listed)["items"][0]["category"] == "dessert"

print("PYDANTIC_MODELS_OK")
