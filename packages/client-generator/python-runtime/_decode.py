# Reflective JSON <-> dataclass conversion for generated Python clients. The
# generated models are plain dataclasses; this decoder hydrates parsed JSON into
# them (and encode() mirrors back to wire shape), honoring each class's
# `_field_map` (python name -> wire name) and typing constructs the generator
# emits: Optional/Union, List, Dict, Enum, Literal, Any.
from __future__ import annotations

import dataclasses
import typing
from enum import Enum
from typing import Any, get_args, get_origin, get_type_hints


def decode(type_: Any, data: Any):
    """Best-effort hydration: wire data -> the annotated Python shape. Unknown or
    mismatched shapes pass through unchanged (the server is the source of truth)."""
    if data is None or type_ is Any or type_ is None:
        return data
    origin = get_origin(type_)
    if origin is typing.Union:
        for member in get_args(type_):
            if member is type(None):
                continue
            try:
                return decode(member, data)
            except (TypeError, ValueError, KeyError):
                continue
        return data
    if origin is list:
        (item_type,) = get_args(type_) or (Any,)
        return [decode(item_type, item) for item in data]
    if origin is dict:
        args = get_args(type_)
        value_type = args[1] if len(args) == 2 else Any
        return {key: decode(value_type, value) for key, value in data.items()}
    if origin is typing.Literal:
        return data
    if isinstance(type_, type) and issubclass(type_, Enum):
        return type_(data)
    if dataclasses.is_dataclass(type_):
        hints = get_type_hints(type_)
        field_map = getattr(type_, "_field_map", {})
        kwargs = {}
        for field in dataclasses.fields(type_):
            wire = field_map.get(field.name, field.name)
            if isinstance(data, dict) and wire in data:
                kwargs[field.name] = decode(hints.get(field.name, Any), data[wire])
        return type_(**kwargs)
    return data


def encode(value: Any):
    """Python shape -> wire (JSON) shape; inverse of decode for request bodies."""
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        field_map = getattr(type(value), "_field_map", {})
        out = {}
        for field in dataclasses.fields(value):
            item = getattr(value, field.name)
            if item is None:
                continue
            out[field_map.get(field.name, field.name)] = encode(item)
        return out
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, list):
        return [encode(item) for item in value]
    if isinstance(value, dict):
        return {key: encode(item) for key, item in value.items()}
    return value
