# Runtime smoke for stream request bodies in the generated Python SDK. Run by
# stream-bodies.test.ts with the echo server's base URL as the only argument. It
# only makes the calls, in a fixed order; the test reads what the server received.
import io
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "client"))
import client as generated

MULTIPART = b'--redocly\r\nContent-Disposition: form-data; name="note"\r\n\r\nhello stream\r\n--redocly--\r\n'
BINARY = bytes(range(256))


def expect_unavailable(call):
    try:
        call()
    except generated.ApiError as error:
        assert error.status == 503, f"expected 503, got {error.status}"
        return
    raise AssertionError("expected a 503 ApiError")


client = generated.Client(
    server_url=sys.argv[1],
    retry={"retries": 2, "retry_delay": 0.001, "retry_on": lambda ctx: True},
)

# Streams: the body passes through untouched and is sent once, even under /fail/.
client.upload(io.BytesIO(MULTIPART))
client.upload_blob("declared", io.BytesIO(BINARY))
expect_unavailable(lambda: client.upload_failing("stream", io.BytesIO(BINARY)))

# Replayable bodies: the caller's Content-Type wins, and the retry policy still applies.
client.upload_blob("custom", BINARY, headers={"content-type": "application/x-custom"})
expect_unavailable(lambda: client.upload_failing("bytes", BINARY))

print("PYTHON_SMOKE_OK")
