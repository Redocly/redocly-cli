# Auth resolution for generated Python clients — mirror of the TypeScript
# runtime's auth.ts: the first OR-alternative whose schemes are all configured
# is applied, so "bearer OR apiKey" works with either credential and never
# sends both. Cookie-borne api keys fold into a single Cookie header.
from __future__ import annotations

import base64
from typing import Any, Callable, Dict, List, Tuple, Union
from urllib.parse import quote

TokenProvider = Union[str, Callable[[], str]]


def _resolve_token(provider: TokenProvider) -> str:
    return provider() if callable(provider) else provider


def _is_configured(scheme: Dict[str, Any], auth: Dict[str, Any]) -> bool:
    kind = scheme["kind"]
    if kind == "apiKey":
        return scheme["scheme"] in (auth.get("api_key") or {})
    if kind == "bearer":
        return auth.get("bearer") is not None
    return auth.get("basic") is not None


def resolve_auth(
    security: List[List[Dict[str, Any]]], auth: Dict[str, Any]
) -> Tuple[Dict[str, str], Dict[str, str]]:
    """Build (headers, query) for one operation's security OR-alternatives from
    the client credentials. When no alternative is fully configured, the first
    alternative's configured schemes are still sent (the server rejects the
    request — same behavior as the TypeScript runtime)."""
    alternative = next(
        (schemes for schemes in security if all(_is_configured(s, auth) for s in schemes)),
        security[0] if security else [],
    )
    headers: Dict[str, str] = {}
    query: Dict[str, str] = {}
    cookies: List[str] = []
    for scheme in alternative:
        kind = scheme["kind"]
        if kind == "apiKey":
            provider = (auth.get("api_key") or {}).get(scheme["scheme"])
            if provider is None:
                continue
            value = _resolve_token(provider)
            location = scheme.get("in", "header")
            if location == "header":
                headers[scheme["name"]] = value
            elif location == "query":
                query[scheme["name"]] = value
            else:
                # Reserved characters (`;`, `=`, space) must not break Cookie syntax.
                cookies.append(f"{scheme['name']}={quote(value, safe='')}")
        elif kind == "bearer":
            provider = auth.get("bearer")
            if provider is not None:
                headers["Authorization"] = f"Bearer {_resolve_token(provider)}"
        else:
            basic = auth.get("basic")
            if basic is not None:
                username, password = basic["username"], basic["password"]
                token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
                headers["Authorization"] = f"Basic {token}"
    if cookies:
        headers["Cookie"] = "; ".join(cookies)
    return headers, query
