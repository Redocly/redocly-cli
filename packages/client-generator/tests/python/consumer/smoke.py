# Runtime smoke for the generated Python SDK, exercised against the same Node
# mock server the TypeScript base consumer uses. Run by python.test.ts with:
#   python3 smoke.py <path-to-generated-client.py> <server-base-url>
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

# Typed call with hydration: the response decodes into the generated dataclasses.
pet = client.get_pet_by_id(1)
assert isinstance(pet, module.Pet), f"expected a Pet dataclass, got {type(pet)!r}"
assert isinstance(pet.name, str) and pet.name, "pet.name should hydrate"

# A collection response hydrates its element type.
pets = client.list_pets()
assert isinstance(pets, list) and all(isinstance(p, module.Pet) for p in pets)

# A request body encodes through the dataclass (None fields, like the readOnly
# server-managed id, are omitted from the wire payload by encode()).
created = client.create_pet(body=module.Pet(name="Smokey", status="available"))
assert isinstance(created, module.Pet)

# A non-2xx raises the structured ApiError (a wrong base path 404s every route).
broken = module.Client(server_url=server_url + "/nowhere")
try:
    broken.get_pet_by_id(1)
    raise AssertionError("expected ApiError for a 404")
except module.ApiError as error:
    assert error.status == 404, f"expected 404, got {error.status}"

print("PYTHON_SMOKE_OK")
