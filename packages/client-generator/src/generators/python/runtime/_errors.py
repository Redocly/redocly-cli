# Runtime errors and the result-mode envelope for generated Python clients.
# Hand-authored once, embedded into every generated client (see
# scripts/generate-runtime-sources.mjs) — mirror of the TypeScript runtime's
# errors.ts, kept semantically in lockstep.
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, Optional, TypeVar

T = TypeVar("T")
E = TypeVar("E")


class ApiError(Exception):
    """Raised (throw mode) for a non-2xx response, carrying the decoded error body."""

    def __init__(self, url: str, status: int, status_text: str, body: Any) -> None:
        super().__init__(f"Request failed with status {status}")
        self.url = url
        self.status = status
        self.status_text = status_text
        self.body = body


class ApiTimeoutError(Exception):
    """Raised when a request attempt exceeds the configured timeout — carries the
    context a log line needs (which operation, what budget, which attempt)."""

    def __init__(self, operation_id: str, timeout: float, attempt: int) -> None:
        super().__init__(
            f'Request "{operation_id}" timed out after {timeout} s (attempt {attempt})'
        )
        self.operation_id = operation_id
        self.timeout = timeout
        self.attempt = attempt


@dataclass
class Result(Generic[T, E]):
    """Result-mode return shape: exactly one of `data`/`error` is set."""

    data: Optional[T]
    error: Optional[E]
    response: Any  # httpx.Response

    @property
    def ok(self) -> bool:
        return self.error is None
