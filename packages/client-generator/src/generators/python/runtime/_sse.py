# Server-Sent Events for generated Python clients — the TypeScript runtime's
# sse.ts semantics ported: frame parsing per the EventSource spec (retry must be
# ASCII digits; comment-only frames skipped; multi-line data joined with \n) and
# auto-reconnect resuming from the last event id via Last-Event-ID, with
# exponential backoff capped at 30s. JSON payloads are parsed when the operation
# declares a JSON event stream.
from __future__ import annotations

import asyncio
import json
import random
import time
from dataclasses import dataclass
from typing import Any, AsyncIterator, Callable, Dict, Iterator, Optional

import httpx

_FRAME_DELIMITER = "\n\n"


@dataclass
class ServerSentEvent:
    data: Any
    event: Optional[str] = None
    id: Optional[str] = None
    retry: Optional[int] = None


def parse_sse_frame(raw: str, data_kind: str = "text") -> Optional[ServerSentEvent]:
    event = None
    data_lines = []
    event_id = None
    retry = None
    saw_field = False
    for line in raw.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        if line == "" or line.startswith(":"):
            continue
        field, _, value = line.partition(":")
        if value.startswith(" "):
            value = value[1:]
        saw_field = True
        if field == "event":
            event = value
        elif field == "data":
            data_lines.append(value)
        elif field == "id":
            event_id = value
        elif field == "retry" and value.isdigit():
            retry = int(value)
    if not saw_field:
        return None
    text = "\n".join(data_lines)
    data: Any = text
    if data_kind == "json" and text != "":
        data = json.loads(text)
    return ServerSentEvent(data=data, event=event, id=event_id, retry=retry)


def iter_sse(
    open_stream: Callable[[Dict[str, str]], Any],
    data_kind: str = "text",
    reconnect: bool = True,
    reconnect_delay: float = 1.0,
) -> Iterator[ServerSentEvent]:
    """Iterate an event stream. `open_stream(extra_headers)` must return an
    httpx streaming-response context manager; it is reopened on dropped
    connections with Last-Event-ID set (fresh call = fresh auth)."""
    last_event_id: Optional[str] = None
    server_retry: Optional[float] = None
    failures = 0
    while True:
        headers = {"Accept": "text/event-stream"}
        if last_event_id is not None:
            headers["Last-Event-ID"] = last_event_id
        try:
            with open_stream(headers) as response:
                if response.status_code >= 400:
                    response.read()
                    raise httpx.HTTPStatusError(
                        f"SSE request failed with status {response.status_code}",
                        request=response.request,
                        response=response,
                    )
                failures = 0
                buffer = ""
                for chunk in response.iter_text():
                    buffer += chunk
                    while _FRAME_DELIMITER in buffer:
                        raw, buffer = buffer.split(_FRAME_DELIMITER, 1)
                        parsed = parse_sse_frame(raw, data_kind)
                        if parsed is not None:
                            if parsed.id is not None:
                                last_event_id = parsed.id
                            if parsed.retry is not None:
                                server_retry = parsed.retry / 1000
                            yield parsed
                # Clean end: flush a trailing frame, then finish (no reconnect).
                if buffer.strip():
                    parsed = parse_sse_frame(buffer, data_kind)
                    if parsed is not None:
                        yield parsed
                return
        except httpx.HTTPStatusError:
            raise  # a 4xx/5xx is definitive, not a dropped connection
        except (httpx.TransportError, httpx.TimeoutException):
            if not reconnect:
                raise
        failures += 1
        base = server_retry if server_retry is not None else reconnect_delay
        time.sleep(random.uniform(0, min(base * (2 ** (failures - 1)), 30.0)))


async def aiter_sse(
    open_stream: Callable[[Dict[str, str]], Any],
    data_kind: str = "text",
    reconnect: bool = True,
    reconnect_delay: float = 1.0,
) -> AsyncIterator[ServerSentEvent]:
    """Async mirror of iter_sse; `open_stream` returns an async context manager."""
    last_event_id: Optional[str] = None
    server_retry: Optional[float] = None
    failures = 0
    while True:
        headers = {"Accept": "text/event-stream"}
        if last_event_id is not None:
            headers["Last-Event-ID"] = last_event_id
        try:
            async with open_stream(headers) as response:
                if response.status_code >= 400:
                    await response.aread()
                    raise httpx.HTTPStatusError(
                        f"SSE request failed with status {response.status_code}",
                        request=response.request,
                        response=response,
                    )
                failures = 0
                buffer = ""
                async for chunk in response.aiter_text():
                    buffer += chunk
                    while _FRAME_DELIMITER in buffer:
                        raw, buffer = buffer.split(_FRAME_DELIMITER, 1)
                        parsed = parse_sse_frame(raw, data_kind)
                        if parsed is not None:
                            if parsed.id is not None:
                                last_event_id = parsed.id
                            if parsed.retry is not None:
                                server_retry = parsed.retry / 1000
                            yield parsed
                if buffer.strip():
                    parsed = parse_sse_frame(buffer, data_kind)
                    if parsed is not None:
                        yield parsed
                return
        except httpx.HTTPStatusError:
            raise
        except (httpx.TransportError, httpx.TimeoutException):
            if not reconnect:
                raise
        failures += 1
        base = server_retry if server_retry is not None else reconnect_delay
        await asyncio.sleep(random.uniform(0, min(base * (2 ** (failures - 1)), 30.0)))
