# Auto-pagination iterators for generated Python clients — the TypeScript
# runtime's paginate.ts semantics ported: cursor (next-cursor pointer, optional
# has-more flag, repeated-cursor guard), offset/page (advance by count/one,
# repeated-page guard, null start treated as absent), and link (RFC 8288
# `Link: rel="next"` following with relative resolution and a loop guard).
from __future__ import annotations

import re
from typing import Any, AsyncIterator, Awaitable, Callable, Dict, Iterator, Optional, Tuple
from urllib.parse import parse_qsl, urljoin, urlparse

# call(params) -> (parsed_json, httpx.Response)
PageCall = Callable[[Dict[str, Any]], Tuple[Any, Any]]


def resolve_pointer(data: Any, pointer: str) -> Any:
    """RFC 6901 JSON pointer over parsed JSON; None on any miss."""
    if pointer == "":
        return data
    if not pointer.startswith("/"):
        return None
    current = data
    for token in pointer[1:].split("/"):
        key = token.replace("~1", "/").replace("~0", "~")
        if isinstance(current, dict):
            current = current.get(key)
        elif isinstance(current, list) and key.isdigit():
            index = int(key)
            current = current[index] if index < len(current) else None
        else:
            return None
        if current is None:
            return None
    return current


def iter_pages(call: PageCall, spec: Dict[str, Any], params: Optional[Dict[str, Any]] = None) -> Iterator[Any]:
    """Yield raw page JSON per the pagination spec; every page is yielded before
    the stop condition is evaluated, so the last page always arrives."""
    style = spec["style"]
    base = dict(params or {})
    if style == "cursor":
        cursor = base.get(spec["param"])
        while True:
            page_params = dict(base)
            if cursor is not None:
                page_params[spec["param"]] = cursor
            page, _response = call(page_params)
            yield page
            if spec.get("has_more") is not None and resolve_pointer(page, spec["has_more"]) is False:
                return
            nxt = resolve_pointer(page, spec.get("next_cursor", ""))
            if nxt is None or nxt == "":
                return
            if not isinstance(nxt, (str, int, float)):
                raise ValueError(f"Pagination cursor at {spec['next_cursor']} is not a string or number")
            if nxt == cursor:
                raise ValueError("Pagination did not advance: the operation returned the same cursor twice")
            cursor = nxt
    elif style == "link":
        yield from _iter_pages_by_link(call, base)
    else:  # offset / page
        start = base.get(spec["param"])
        fallback = 1 if style == "page" else 0
        try:
            position = fallback if start in (None, "") else int(start)
        except (TypeError, ValueError):
            position = fallback
        previous_items = None
        while True:
            page, _response = call({**base, spec["param"]: position})
            items = resolve_pointer(page, spec.get("items", ""))
            serialized = repr(items) if isinstance(items, list) else None
            if serialized is not None and serialized == previous_items:
                raise ValueError("Pagination did not advance: the operation returned the same page twice")
            yield page
            if not isinstance(items, list) or len(items) == 0:
                return
            previous_items = serialized
            position += 1 if style == "page" else len(items)


def _link_next(header: Optional[str]) -> Optional[str]:
    if not header:
        return None
    for entry in re.split(r",\s*(?=<)", header):
        match = re.match(r"^\s*<([^>]*)>(.*)$", entry)
        if not match:
            continue
        rel = re.search(r';\s*rel\s*=\s*"?([^";]+)"?', match.group(2), re.IGNORECASE)
        if rel and "next" in rel.group(1).split():
            return match.group(1)
    return None


def _iter_pages_by_link(call: PageCall, base: Dict[str, Any]) -> Iterator[Any]:
    params = dict(base)
    previous = None
    while True:
        page, response = call(params)
        yield page
        target = _link_next(response.headers.get("link"))
        if target is None:
            return
        page_url = str(response.request.url) if response.request is not None else ""
        nxt = urljoin(page_url or "http://relative.invalid", target)
        if nxt in (previous, page_url):
            raise ValueError('Pagination did not advance: the Link rel="next" target repeats')
        previous = nxt
        link_params: Dict[str, Any] = {}
        for key, value in parse_qsl(urlparse(nxt).query):
            if key in link_params:
                existing = link_params[key]
                link_params[key] = [*existing, value] if isinstance(existing, list) else [existing, value]
            else:
                link_params[key] = value
        params = {**base, **link_params}


def iter_items(call: PageCall, spec: Dict[str, Any], params: Optional[Dict[str, Any]] = None) -> Iterator[Any]:
    """Each page's `items` pointer, flattened."""
    for page in iter_pages(call, spec, params):
        items = resolve_pointer(page, spec.get("items", ""))
        if isinstance(items, list):
            yield from items


# call(params) -> awaitable of (parsed_json, httpx.Response)
AsyncPageCall = Callable[[Dict[str, Any]], Awaitable[Tuple[Any, Any]]]


async def aiter_pages(
    call: AsyncPageCall, spec: Dict[str, Any], params: Optional[Dict[str, Any]] = None
) -> AsyncIterator[Any]:
    """Async mirror of iter_pages — same stop conditions and guards."""
    style = spec["style"]
    base = dict(params or {})
    if style == "cursor":
        cursor = base.get(spec["param"])
        while True:
            page_params = dict(base)
            if cursor is not None:
                page_params[spec["param"]] = cursor
            page, _response = await call(page_params)
            yield page
            if spec.get("has_more") is not None and resolve_pointer(page, spec["has_more"]) is False:
                return
            nxt = resolve_pointer(page, spec.get("next_cursor", ""))
            if nxt is None or nxt == "":
                return
            if not isinstance(nxt, (str, int, float)):
                raise ValueError(f"Pagination cursor at {spec['next_cursor']} is not a string or number")
            if nxt == cursor:
                raise ValueError("Pagination did not advance: the operation returned the same cursor twice")
            cursor = nxt
    elif style == "link":
        previous = None
        link_params: Dict[str, Any] = dict(base)
        while True:
            page, response = await call(link_params)
            yield page
            target = _link_next(response.headers.get("link"))
            if target is None:
                return
            page_url = str(response.request.url) if response.request is not None else ""
            nxt = urljoin(page_url or "http://relative.invalid", target)
            if nxt in (previous, page_url):
                raise ValueError('Pagination did not advance: the Link rel="next" target repeats')
            previous = nxt
            merged: Dict[str, Any] = {}
            for key, value in parse_qsl(urlparse(nxt).query):
                if key in merged:
                    existing = merged[key]
                    merged[key] = [*existing, value] if isinstance(existing, list) else [existing, value]
                else:
                    merged[key] = value
            link_params = {**base, **merged}
    else:
        start = base.get(spec["param"])
        fallback = 1 if style == "page" else 0
        try:
            position = fallback if start in (None, "") else int(start)
        except (TypeError, ValueError):
            position = fallback
        previous_items = None
        while True:
            page, _response = await call({**base, spec["param"]: position})
            items = resolve_pointer(page, spec.get("items", ""))
            serialized = repr(items) if isinstance(items, list) else None
            if serialized is not None and serialized == previous_items:
                raise ValueError("Pagination did not advance: the operation returned the same page twice")
            yield page
            if not isinstance(items, list) or len(items) == 0:
                return
            previous_items = serialized
            position += 1 if style == "page" else len(items)


async def aiter_items(
    call: AsyncPageCall, spec: Dict[str, Any], params: Optional[Dict[str, Any]] = None
) -> AsyncIterator[Any]:
    async for page in aiter_pages(call, spec, params):
        items = resolve_pointer(page, spec.get("items", ""))
        if isinstance(items, list):
            for item in items:
                yield item
