# Usage telemetry for a generated Python SDK, written beside the client by
# `client.telemetry: on`. It counts calls per operation through the runtime's
# on_settled hook and sends one event per operation and window. An event holds
# only the operation id, the counts, the window, and the SDK identity.
from __future__ import annotations

import asyncio
import atexit
import json
import os
import platform
import secrets
import threading
import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

import httpx

GENERATOR_VERSION = "dev"
_DEFAULT_ENDPOINT = "https://otel.cloud.redocly.com/v1/traces"
_EVENT_TYPE = "com.redocly.sdkUsage.aggregated"
_SEND_TIMEOUT_S = 3.0
_SERVICE_NAME = "redocly-sdk"
_STATUS_CLASSES = ["2xx", "3xx", "4xx", "5xx", "network_error", "timeout", "aborted"]
_LATENCY_BUCKETS = [
    ("lt_100ms", 100),
    ("lt_300ms", 300),
    ("lt_1s", 1000),
    ("lt_3s", 3000),
    ("lt_10s", 10000),
]

SdkUsageEvent = Dict[str, Any]
Sink = Callable[[List[SdkUsageEvent]], None]


class _RejectedSend(Exception):
    def __init__(self, status: int) -> None:
        super().__init__(f"The telemetry endpoint answered {status}.")
        self.status = status


def _disabled() -> bool:
    return os.environ.get("REDOCLY_SDK_TELEMETRY") == "off" or os.environ.get("DO_NOT_TRACK") == "1"


def _empty_counts() -> Dict[str, Any]:
    return {"calls": 0, "attempts": 0, "duration_sum_ms": 0, "status": {}, "latency": {}}


class UsageTelemetry:
    """The middleware that `telemetry()` returns. Safe to share across threads and clients."""

    def __init__(self, sdk: Dict[str, str], sink: Sink, flush_interval_ms: int, enabled: bool) -> None:
        self._enabled = enabled
        self._sdk = sdk
        self._sink = sink
        self._interval_s = flush_interval_ms / 1000
        self._lock = threading.Lock()
        self._counts: Dict[str, Dict[str, Any]] = {}
        self._window_start = 0.0
        self._timer: Optional[threading.Timer] = None

    def on_settled(self, context: Dict[str, Any], call: Dict[str, Any]) -> None:
        if not self._enabled:
            return
        with self._lock:
            if not self._counts:
                self._open_window()
            operation = self._counts.setdefault(context["operation"]["id"], _empty_counts())
            duration_ms: int = call["duration_ms"]
            operation["calls"] += 1
            operation["attempts"] += call["attempts"]
            operation["duration_sum_ms"] += duration_ms
            status = _status_class(call)
            operation["status"][status] = operation["status"].get(status, 0) + 1
            bucket = "gte_10s"
            for name, below_ms in _LATENCY_BUCKETS:
                if duration_ms < below_ms:
                    bucket = name
                    break
            operation["latency"][bucket] = operation["latency"].get(bucket, 0) + 1

    def flush(self, keep_on_failure: bool = True) -> None:
        timer = self._timer
        self._flush_window(keep_on_failure)
        # A timer that already fired may still be sending its window.
        if timer is not None and timer is not threading.current_thread():
            timer.join(_SEND_TIMEOUT_S + 1)

    def _open_window(self) -> None:
        self._window_start = time.time()
        self._timer = threading.Timer(self._interval_s, self._flush_window)
        self._timer.daemon = True
        self._timer.start()

    def _flush_window(self, keep_on_failure: bool = True) -> None:
        with self._lock:
            if not self._counts:
                return
            if self._timer is not None:
                self._timer.cancel()
            sent_counts = self._counts
            sent_start = self._window_start
            self._counts = {}
        if _disabled():
            return
        try:
            self._sink(_to_events(sent_counts, sent_start, time.time() - sent_start, self._sdk))
        except Exception as error:
            if not keep_on_failure or not _keep_after(error):
                return
            with self._lock:
                if not self._counts:
                    self._open_window()
                self._window_start = min(self._window_start, sent_start)
                for operation_id, sent in sent_counts.items():
                    operation = self._counts.setdefault(operation_id, _empty_counts())
                    for key in ("calls", "attempts", "duration_sum_ms"):
                        operation[key] += sent[key]
                    for group in ("status", "latency"):
                        for key, count in sent[group].items():
                            operation[group][key] = operation[group].get(key, 0) + count


_instances: List[UsageTelemetry] = []


def telemetry(
    *,
    sdk_name: str,
    sdk_version: str,
    client: str,
    sink: Optional[Sink] = None,
    endpoint: Optional[str] = None,
    flush_interval_ms: int = 60_000,
) -> UsageTelemetry:
    """The usage telemetry middleware. REDOCLY_SDK_TELEMETRY=off or DO_NOT_TRACK=1 makes it record nothing."""
    target = endpoint or _DEFAULT_ENDPOINT
    sdk = {
        "name": sdk_name,
        "version": sdk_version,
        "generator_version": GENERATOR_VERSION,
        "language": "python",
        "runtime": platform.python_implementation().lower(),
        "runtime_version": platform.python_version(),
        "client": client,
    }
    enabled = not _disabled()
    instance = UsageTelemetry(sdk, sink or (lambda events: _send_otlp(target, events)), flush_interval_ms, enabled)
    if enabled:
        _instances.append(instance)
    return instance


def flush() -> None:
    """Send every open window now and wait for the sends, for example before os._exit()."""
    for instance in _instances:
        instance.flush()


@atexit.register
def _flush_at_exit() -> None:
    # There is no later window at exit, so a failed send drops its counts.
    for instance in _instances:
        instance.flush(keep_on_failure=False)


def _status_class(call: Dict[str, Any]) -> str:
    response: Optional[httpx.Response] = call.get("response")
    if response is None:
        error = call.get("error")
        # The runtime's own timeout error, matched by name: this module imports nothing from the client.
        if type(error).__name__ == "ApiTimeoutError":
            return "timeout"
        if isinstance(error, asyncio.CancelledError):
            return "aborted"
        return "network_error"
    if response.status_code >= 500:
        return "5xx"
    if response.status_code >= 400:
        return "4xx"
    if response.status_code >= 300:
        return "3xx"
    return "2xx"


def _keep_after(error: Exception) -> bool:
    # The endpoint can have stored the counts of a send that timed out.
    if isinstance(error, httpx.TimeoutException):
        return False
    if isinstance(error, _RejectedSend):
        return error.status in (408, 429) or error.status >= 500
    return True


def _to_events(
    counts: Dict[str, Dict[str, Any]], window_start: float, window_s: float, sdk: Dict[str, str]
) -> List[SdkUsageEvent]:
    started = datetime.fromtimestamp(window_start, tz=timezone.utc)
    events: List[SdkUsageEvent] = []
    for operation_id, operation in counts.items():
        usage: Dict[str, Any] = {
            "operation_id": operation_id,
            "window_ms": int(window_s * 1000),
            "calls": operation["calls"],
            "attempts": operation["attempts"],
            "duration_sum_ms": operation["duration_sum_ms"],
        }
        for status in _STATUS_CLASSES:
            if status in operation["status"]:
                usage[f"status_{status}"] = operation["status"][status]
        for bucket in [name for name, _ in _LATENCY_BUCKETS] + ["gte_10s"]:
            if bucket in operation["latency"]:
                usage[f"latency_{bucket}"] = operation["latency"][bucket]
        events.append(
            {
                "id": f"evt_{secrets.token_hex(16)}",
                "type": _EVENT_TYPE,
                "source": sdk["name"],
                "time": started.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                "data": {"usage": usage, "sdk": sdk},
            }
        )
    return events


def _send_otlp(endpoint: str, events: List[SdkUsageEvent]) -> None:
    response = httpx.post(
        endpoint,
        content=json.dumps(_to_otlp_request(events)),
        # One send per window, so the connection is never reused.
        headers={"Content-Type": "application/json", "Connection": "close"},
        timeout=_SEND_TIMEOUT_S,
    )
    if not response.is_success:
        raise _RejectedSend(response.status_code)


def _to_otlp_request(events: List[SdkUsageEvent]) -> Dict[str, Any]:
    spans: List[Dict[str, Any]] = []
    for event in events:
        started = datetime.fromisoformat(event["time"].replace("Z", "+00:00"))
        time_unix_nano = f"{int(started.timestamp() * 1000)}000000"
        attributes = [
            _attribute("cloudevents.event_id", event["id"]),
            _attribute("cloudevents.event_type", event["type"]),
            _attribute("cloudevents.event_source", event["source"]),
            _attribute("cloudevents.event_spec_version", "1.0"),
            _attribute("cloudevents.event_data_content_type", "application/json; charset=utf-8"),
            _attribute("cloudevents.event_time", event["time"]),
            _attribute("cloudevents.event_subject", ""),
            _attribute("cloudevents.event_origin", _SERVICE_NAME),
            _attribute("cloudevents.event_object", "event"),
            _attribute("cloudevents.event_category", "product"),
            _attribute("cloudevents.event_signal", "metric"),
        ]
        for key, value in event["data"]["usage"].items():
            attributes.append(_attribute(f"cloudevents.event_data.usage.{key}", value))
        for key, value in event["data"]["sdk"].items():
            attributes.append(_attribute(f"cloudevents.event_data.sdk.{key}", value))
        spans.append(
            {
                "traceId": secrets.token_hex(16),
                "spanId": secrets.token_hex(8),
                "name": f"event.{event['type']}",
                "kind": 1,
                "startTimeUnixNano": time_unix_nano,
                "endTimeUnixNano": time_unix_nano,
                "attributes": attributes,
            }
        )
    return {
        "resourceSpans": [
            {
                "resource": {
                    "attributes": [
                        _attribute("service.name", _SERVICE_NAME),
                        _attribute("service.version", GENERATOR_VERSION),
                    ]
                },
                "scopeSpans": [{"scope": {"name": "redocly-sdk-telemetry"}, "spans": spans}],
            }
        ]
    }


def _attribute(key: str, value: Any) -> Dict[str, Any]:
    if isinstance(value, str):
        return {"key": key, "value": {"stringValue": value}}
    if isinstance(value, int):
        return {"key": key, "value": {"intValue": value}}
    return {"key": key, "value": {"doubleValue": value}}
