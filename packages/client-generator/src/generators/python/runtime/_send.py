# The request core for generated Python clients — mirror of the TypeScript
# runtime's send.ts: default + config + per-call headers, on_request middleware
# BEFORE serialization (mutations are sent), the retry loop (idempotent-methods
# default, Idempotency-Key opt-in makes POST/PATCH safe, Retry-After honored,
# exponential backoff with full jitter, a fresh timeout budget per attempt), and
# the reverse on_response onion.
from __future__ import annotations

import asyncio
import random
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Generic, List, Optional, Tuple, TypeVar

import httpx

from ._errors import ApiTimeoutError

T = TypeVar("T")


@dataclass
class Envelope(Generic[T]):
    """A *_with_headers() result: decoded body + coerced declared headers + raw response."""

    data: T
    headers: Dict[str, Any]
    response: httpx.Response


def read_envelope_headers(
    response: httpx.Response, specs: List[Tuple[str, str, str]]
) -> Dict[str, Any]:
    """Coerce declared response headers per (name, key, type) specs; absent/unparsable omitted."""
    headers: Dict[str, Any] = {}
    for name, key, type_ in specs:
        raw = response.headers.get(name)
        if raw is None:
            continue
        if type_ in ("integer", "number"):
            try:
                headers[key] = int(raw) if type_ == "integer" else float(raw)
            except ValueError:
                pass
        elif type_ == "boolean":
            lower = raw.strip().lower()
            if lower in ("true", "false"):
                headers[key] = lower == "true"
        else:
            headers[key] = raw
    return headers


_IDEMPOTENT_METHODS = {"GET", "HEAD", "PUT", "DELETE", "OPTIONS"}
_TRANSIENT_STATUS = {408, 429, 500, 502, 503, 504}


def _default_retry_on(method: str, headers: Dict[str, str], response: Optional[httpx.Response]) -> bool:
    safe = method.upper() in _IDEMPOTENT_METHODS or "Idempotency-Key" in headers
    if not safe:
        return False
    return response is None or response.status_code in _TRANSIENT_STATUS


def _retry_delay(retry: Dict[str, Any], attempt: int, retry_after: Optional[str]) -> float:
    if retry_after:
        try:
            return float(retry_after)
        except ValueError:
            pass  # HTTP-date form: fall through to backoff
    base = float(retry.get("retry_delay", 1.0))
    raw = base if retry.get("retry_strategy") == "fixed" else base * (2 ** (attempt - 1))
    return random.uniform(0, raw) if retry.get("jitter", True) is not False else raw


def send(
    client: httpx.Client,
    config: Dict[str, Any],
    op: Dict[str, Any],
    url: str,
    *,
    method: str,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    json_body: Any = None,
    content: Any = None,
    data: Any = None,
    files: Any = None,
    timeout: Optional[float] = None,
    idempotency_key: Any = None,
    retry: Optional[Dict[str, Any]] = None,
) -> httpx.Response:
    merged_retry: Dict[str, Any] = {**(config.get("retry") or {}), **(retry or {})}
    effective_timeout = timeout if timeout is not None else config.get("timeout")
    merged_headers: Dict[str, str] = {**(config.get("headers") or {}), **(headers or {})}

    # One stable key per LOGICAL call — set before the retry loop so every
    # attempt re-sends the same key; a caller-provided header always wins.
    key = idempotency_key if idempotency_key is not None else config.get("idempotency_key")
    if (
        key not in (None, False)
        and method.upper() in ("POST", "PATCH")
        and "Idempotency-Key" not in merged_headers
    ):
        merged_headers["Idempotency-Key"] = (
            key if isinstance(key, str) else key() if callable(key) else str(uuid.uuid4())
        )

    context = {
        "url": url,
        "method": method.upper(),
        "headers": merged_headers,
        "body": json_body,
        "operation": op,
    }
    middleware: List[Any] = config.get("middleware") or []
    for mw in middleware:
        on_request = getattr(mw, "on_request", None) or (mw.get("on_request") if isinstance(mw, dict) else None)
        if on_request:
            on_request(context)

    max_attempts = 1 + int(merged_retry.get("retries", 0))
    retry_on = merged_retry.get("retry_on") or (
        lambda ctx: _default_retry_on(context["method"], context["headers"], ctx.get("response"))
    )

    attempt = 0
    while True:
        attempt += 1
        try:
            response = client.request(
                context["method"],
                context["url"],
                headers=context["headers"],
                params=params,
                json=context["body"] if content is None and files is None and data is None else None,
                content=content,
                data=data,
                files=files,
                timeout=effective_timeout if effective_timeout is not None else httpx.USE_CLIENT_DEFAULT,
            )
        except httpx.TimeoutException:
            if attempt < max_attempts and retry_on({"attempt": attempt, "response": None}):
                time.sleep(_retry_delay(merged_retry, attempt, None))
                continue
            raise ApiTimeoutError(op.get("id", "?"), float(effective_timeout or 0), attempt) from None
        except httpx.TransportError:
            if attempt < max_attempts and retry_on({"attempt": attempt, "response": None}):
                time.sleep(_retry_delay(merged_retry, attempt, None))
                continue
            raise

        for mw in reversed(middleware):
            on_response = getattr(mw, "on_response", None) or (mw.get("on_response") if isinstance(mw, dict) else None)
            if on_response:
                replaced = on_response(response, context)
                if replaced is not None:
                    response = replaced

        if (
            not response.is_success
            and attempt < max_attempts
            and retry_on({"attempt": attempt, "response": response})
        ):
            time.sleep(_retry_delay(merged_retry, attempt, response.headers.get("retry-after")))
            continue
        return response


async def send_async(
    client: httpx.AsyncClient,
    config: Dict[str, Any],
    op: Dict[str, Any],
    url: str,
    *,
    method: str,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    json_body: Any = None,
    content: Any = None,
    data: Any = None,
    files: Any = None,
    timeout: Optional[float] = None,
    idempotency_key: Any = None,
    retry: Optional[Dict[str, Any]] = None,
) -> httpx.Response:
    """The async mirror of send() — same retry/timeout/idempotency semantics."""
    merged_retry: Dict[str, Any] = {**(config.get("retry") or {}), **(retry or {})}
    effective_timeout = timeout if timeout is not None else config.get("timeout")
    merged_headers: Dict[str, str] = {**(config.get("headers") or {}), **(headers or {})}
    key = idempotency_key if idempotency_key is not None else config.get("idempotency_key")
    if (
        key not in (None, False)
        and method.upper() in ("POST", "PATCH")
        and "Idempotency-Key" not in merged_headers
    ):
        merged_headers["Idempotency-Key"] = (
            key if isinstance(key, str) else key() if callable(key) else str(uuid.uuid4())
        )
    context = {
        "url": url,
        "method": method.upper(),
        "headers": merged_headers,
        "body": json_body,
        "operation": op,
    }
    middleware: List[Any] = config.get("middleware") or []
    for mw in middleware:
        on_request = getattr(mw, "on_request", None) or (mw.get("on_request") if isinstance(mw, dict) else None)
        if on_request:
            on_request(context)
    max_attempts = 1 + int(merged_retry.get("retries", 0))
    retry_on = merged_retry.get("retry_on") or (
        lambda ctx: _default_retry_on(context["method"], context["headers"], ctx.get("response"))
    )
    attempt = 0
    while True:
        attempt += 1
        try:
            response = await client.request(
                context["method"],
                context["url"],
                headers=context["headers"],
                params=params,
                json=context["body"] if content is None and files is None and data is None else None,
                content=content,
                data=data,
                files=files,
                timeout=effective_timeout if effective_timeout is not None else httpx.USE_CLIENT_DEFAULT,
            )
        except httpx.TimeoutException:
            if attempt < max_attempts and retry_on({"attempt": attempt, "response": None}):
                await asyncio.sleep(_retry_delay(merged_retry, attempt, None))
                continue
            raise ApiTimeoutError(op.get("id", "?"), float(effective_timeout or 0), attempt) from None
        except httpx.TransportError:
            if attempt < max_attempts and retry_on({"attempt": attempt, "response": None}):
                await asyncio.sleep(_retry_delay(merged_retry, attempt, None))
                continue
            raise
        for mw in reversed(middleware):
            on_response = getattr(mw, "on_response", None) or (mw.get("on_response") if isinstance(mw, dict) else None)
            if on_response:
                replaced = on_response(response, context)
                if replaced is not None:
                    response = replaced
        if (
            not response.is_success
            and attempt < max_attempts
            and retry_on({"attempt": attempt, "response": response})
        ):
            await asyncio.sleep(_retry_delay(merged_retry, attempt, response.headers.get("retry-after")))
            continue
        return response
