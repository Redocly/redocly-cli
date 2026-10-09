# Runtime smoke for write-only properties in the generated Python SDK. Run by
# write-only.test.ts with the server's base URL as the only argument. The request sends
# the password; the response comes back without it and must still decode.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "client"))
import client as generated

api = generated.Client(server_url=sys.argv[1])
customer = api.create_customer(
    generated.Customer(id="", email="ada@example.com", password="correct horse")
)
assert customer.password is None, customer

print(customer)
print("PYTHON_SMOKE_OK")
