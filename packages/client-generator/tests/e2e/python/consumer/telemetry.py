# Usage telemetry consumer for the generated Python SDK. Run by python/telemetry.test.ts with:
#   python3 telemetry.py <generated-client-dir> <server-base-url> <sink-url>
import sys

sys.path.insert(0, sys.argv[1])

import client
import client_telemetry

telemetry = client_telemetry.telemetry(
    sdk_name="@acme/pets-sdk",
    sdk_version="1.0.0",
    client="pets-worker/2.0.0",
    endpoint=sys.argv[3],
)
api = client.Client(sys.argv[2], retry={"retries": 1, "retry_delay": 0.001}, middleware=[telemetry])
api.list_pets()
api.list_pets()
# A failed send keeps its counts, and the exit flush sends them.
client_telemetry.flush()
