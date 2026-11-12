# Runtime check for write-only properties in the generated Python SDK. Run by
# python/write-only.test.ts with:
#   python3 write_only.py <path-to-generated-client.py> <server-base-url>
# The request sends the password; the response comes back without it and must still decode.
import importlib.util
import sys

client_path, server_url = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location("generated_client", client_path)
module = importlib.util.module_from_spec(spec)
# Register BEFORE exec: dataclass ClassVar annotations resolve through
# sys.modules[cls.__module__] at class-creation time.
sys.modules["generated_client"] = module
spec.loader.exec_module(module)

client = module.Client(server_url=server_url)
customer = client.create_customer(
    module.Customer(id="", email="ada@example.com", password="correct horse")
)
assert customer.password is None, customer
assert customer.email == "ada@example.com", customer

print("PYTHON_SMOKE_OK")
