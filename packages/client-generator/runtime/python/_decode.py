# Reflective JSON <-> model conversion for generated Python clients. Models are
# plain dataclasses by default, or pydantic BaseModels under `models: pydantic`;
# one decoder serves both. For a dataclass it hydrates parsed JSON reflectively,
# honoring each class's `_field_map` (python name -> wire name) and the typing
# constructs the generator emits: Optional/Union, List, Dict, Enum, Literal, Any.
# For a pydantic model it defers to pydantic, which already knows the aliases.
# encode() mirrors whichever it was given back to wire shape.
from __future__ import annotations

import dataclasses
import typing
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, Tuple, get_args, get_origin, get_type_hints

# Discriminated unions: resolved Union annotation -> (wire property, {value: class}).
# The generated module registers its unions here; decode() dispatches through it
# before falling back to trying members in order.
DISCRIMINATORS: Dict[Any, Tuple[str, Dict[str, Any]]] = {}


def decode(type_: Any, data: Any):
    """Best-effort hydration: wire data -> the annotated Python shape. Unknown or
    mismatched shapes pass through unchanged (the server is the source of truth)."""
    if data is None or type_ is Any or type_ is None:
        return data
    origin = get_origin(type_)
    if origin is typing.Union:
        discriminator = DISCRIMINATORS.get(type_)
        if discriminator is not None and isinstance(data, dict):
            wire_property, mapping = discriminator
            target = mapping.get(data.get(wire_property))
            if target is not None:
                try:
                    return decode(target, data)
                except (TypeError, ValueError, KeyError):
                    pass
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
    # `dateType: Date` annotates date/date-time fields as datetime objects; a value that
    # doesn't parse passes through unchanged (the server is the source of truth).
    if type_ is datetime or type_ is date:
        if not isinstance(data, str):
            return data
        try:
            # `datetime` accepts a bare date too; `date` rejects a timestamp, so trim it.
            return (
                datetime.fromisoformat(data)
                if type_ is datetime
                else date.fromisoformat(data[:10])
            )
        except ValueError:
            return data
    # A pydantic model validates itself, aliases included. `ValidationError`
    # subclasses `ValueError`, so union member probing above still works.
    if isinstance(type_, type) and hasattr(type_, "model_validate"):
        return type_.model_validate(data)
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
    # `mode="json"` resolves datetimes and enums the same way the branches below do,
    # and `exclude_none` matches the dataclass path: an unset optional is not sent.
    if hasattr(value, "model_dump") and not isinstance(value, type):
        return value.model_dump(by_alias=True, exclude_none=True, mode="json")
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
    # A date-only value must not gain a time component on the way out.
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, list):
        return [encode(item) for item in value]
    if isinstance(value, dict):
        return {key: encode(item) for key, item in value.items()}
    return value
